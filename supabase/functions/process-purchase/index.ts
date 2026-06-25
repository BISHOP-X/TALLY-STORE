import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize user client (to get authenticated user)
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    // Verify the user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Initialize admin client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { product_group_id, quantity, idempotency_key } = await req.json();

    // Validate inputs
    if (!product_group_id || !quantity || quantity < 1) {
      throw new Error('Invalid request: product_group_id and quantity (>= 1) required');
    }

    if (!idempotency_key || typeof idempotency_key !== 'string' || idempotency_key.length < 10) {
      throw new Error('Valid idempotency_key required');
    }

    // Check idempotency - prevent duplicate purchases
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id, amount, status, created_at')
      .eq('user_id', user.id)
      .eq('idempotency_key', idempotency_key)
      .single();

    if (existingOrder) {
      console.log(`⚠️ Idempotency hit: returning existing order ${existingOrder.id}`);
      return new Response(
        JSON.stringify({
          success: true,
          order_id: existingOrder.id,
          amount: existingOrder.amount,
          status: existingOrder.status,
          message: 'Order already processed',
          idempotency_hit: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🛒 Processing purchase: user=${user.id}, product_group=${product_group_id}, qty=${quantity}`);

    // 1. Get product group details
    const { data: productGroup, error: productError } = await supabaseAdmin
      .from('product_groups')
      .select('*, categories(name)')
      .eq('id', product_group_id)
      .single();

    if (productError || !productGroup) {
      throw new Error('Product not found');
    }

    // 2. Get available accounts (SERVER-SIDE ONLY - never exposed to client)
    const { data: availableAccounts, error: accountsError } = await supabaseAdmin
      .from('individual_accounts')
      .select('*')
      .eq('product_group_id', product_group_id)
      .eq('status', 'available')
      .limit(quantity);

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      throw new Error('Failed to check availability');
    }

    console.log(`📦 Found ${availableAccounts?.length || 0} available accounts for product_group_id: ${product_group_id}`);

    let workingAccounts = availableAccounts || [];

    if (workingAccounts.length < quantity) {
      const shortfall = quantity - workingAccounts.length;
      const available = workingAccounts.length;

      // Auto-fulfillment fallback: if this product group is configured to auto-fulfill
      // from MuaBanVia, try to live-purchase the shortfall instead of failing outright.
      if (productGroup.auto_fulfill_enabled && productGroup.muabanvia_product_id) {
        console.log(`🔄 Stock shortfall (${shortfall}) — attempting MuaBanVia auto-fulfillment for product_group_id: ${product_group_id}`);

        try {
          const muabanviaApiKey = Deno.env.get('MUABANVIA_API_KEY');
          // CONFIRMED real MuaBanVia API (their own docs, https://muabanvia.org/api/buy_product):
          // POST as multipart/form-data, NOT JSON. Fields: action=buyProduct, ID/id, amount,
          // coupon (optional), api_key (auth goes in the form body, not a Bearer header).
          // Response: { status: "success", msg, trans_id, data: ["user|pass", ...] }
          const muabanviaBaseUrl = Deno.env.get('MUABANVIA_BASE_URL') || 'https://muabanvia.org/api/buy_product';

          if (!muabanviaApiKey) {
            throw new Error('MUABANVIA_API_KEY not configured');
          }

          const muabanviaForm = new FormData();
          muabanviaForm.set('action', 'buyProduct');
          muabanviaForm.set('ID', String(productGroup.muabanvia_product_id));
          muabanviaForm.set('id', String(productGroup.muabanvia_product_id));
          muabanviaForm.set('amount', String(shortfall));
          muabanviaForm.set('api_key', muabanviaApiKey);

          const fulfillResponse = await fetch(muabanviaBaseUrl, {
            method: 'POST',
            body: muabanviaForm,
          });

          const fulfillResult = await fulfillResponse.json().catch(() => null) as any;

          if (!fulfillResponse.ok || fulfillResult?.status !== 'success') {
            throw new Error(fulfillResult?.msg || fulfillResult?.message || fulfillResult?.error || 'MuaBanVia could not fulfill the shortfall');
          }

          const rawAccounts = fulfillResult?.data ?? [];
          const fulfilledRaw: any[] = Array.isArray(rawAccounts) ? rawAccounts : [];

          const fulfilledAccounts = fulfilledRaw.slice(0, shortfall).map((item: any) => {
            if (typeof item === 'string') {
              const parts = item.split('|').map((p: string) => p.trim());
              return {
                username: parts[0] || '',
                password: parts[1] || '',
                email: parts[2] || null,
                email_password: parts[3] || null,
                two_fa_code: parts[4] || null,
              };
            }
            return {
              username: item.username || item.user || item.login || '',
              password: item.password || item.pass || '',
              email: item.email || null,
              email_password: item.email_password || item.emailPass || null,
              two_fa_code: item.two_fa_code || item.twofa || item['2fa'] || null,
              additional_info: item,
            };
          });

          if (fulfilledAccounts.length < shortfall) {
            throw new Error(`MuaBanVia only returned ${fulfilledAccounts.length} of ${shortfall} needed accounts`);
          }

          // Insert the live-fulfilled accounts as available stock, tagged with their source,
          // so the rest of the purchase flow (reserve -> sell) treats them identically to
          // pre-stocked accounts.
          const { data: insertedAccounts, error: insertError } = await supabaseAdmin
            .from('individual_accounts')
            .insert(
              fulfilledAccounts.map((acc) => ({
                product_group_id: product_group_id,
                username: acc.username,
                password: acc.password,
                email: acc.email,
                email_password: acc.email_password,
                two_fa_code: acc.two_fa_code,
                additional_info: acc.additional_info || null,
                status: 'available',
                fulfillment_source: 'muabanvia',
              }))
            )
            .select('*');

          if (insertError || !insertedAccounts) {
            throw new Error(insertError?.message || 'Failed to record auto-fulfilled accounts');
          }

          console.log(`✅ MuaBanVia auto-fulfillment succeeded: ${insertedAccounts.length} account(s)`);
          workingAccounts = [...workingAccounts, ...insertedAccounts];
        } catch (fulfillErr) {
          console.error('❌ MuaBanVia auto-fulfillment failed:', fulfillErr);
          // Fall through to the standard out-of-stock error below.
        }
      }

      if (workingAccounts.length < quantity) {
        const stillAvailable = workingAccounts.length;
        console.error(`❌ Stock mismatch: product_group_id=${product_group_id}, found=${stillAvailable}, requested=${quantity}`);

        if (stillAvailable === 0) {
          throw new Error(`OUT_OF_STOCK: ${productGroup.name} is currently out of stock. Please check back later or contact support.`);
        } else {
          throw new Error(`INSUFFICIENT_STOCK: Only ${stillAvailable} account(s) available for ${productGroup.name}. You requested ${quantity}.`);
        }
      }
    }

    // 3. Check wallet balance
    const totalPrice = productGroup.price * quantity;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Failed to fetch wallet balance');
    }

    const walletBalance = profile.wallet_balance || 0;
    if (walletBalance < totalPrice) {
      throw new Error(`Insufficient balance. Required: ₦${totalPrice.toLocaleString()}, Available: ₦${walletBalance.toLocaleString()}`);
    }

    // 4. Reserve accounts atomically (workingAccounts includes any MuaBanVia auto-fulfilled
    // accounts inserted above, already in 'available' status alongside the pre-stocked ones)
    const accountIds = workingAccounts.slice(0, quantity).map((acc: any) => acc.id);
    const purchasedAccounts = workingAccounts.slice(0, quantity);

    const { data: reservedAccounts, error: reserveError } = await supabaseAdmin
      .from('individual_accounts')
      .update({ status: 'reserved' })
      .in('id', accountIds)
      .eq('status', 'available')
      .select('id');

    if (reserveError || !reservedAccounts || reservedAccounts.length < quantity) {
      throw new Error('Failed to reserve accounts - some may have been sold');
    }

    // 5. Deduct wallet balance with optimistic locking
    const newBalance = walletBalance - totalPrice;

    const { data: updatedProfile, error: balanceError } = await supabaseAdmin
      .from('profiles')
      .update({
        wallet_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .eq('wallet_balance', walletBalance) // Optimistic lock
      .select()
      .single();

    if (balanceError || !updatedProfile) {
      // Rollback: unreserve accounts
      await supabaseAdmin
        .from('individual_accounts')
        .update({ status: 'available' })
        .in('id', accountIds);

      throw new Error('Balance changed during purchase. Please try again.');
    }

    // 6. Create order with credentials (stored in account_details JSON)
    const orderData = {
      user_id: user.id,
      product_group_id: product_group_id,
      amount: totalPrice,
      status: 'completed',
      idempotency_key: idempotency_key,
      account_details: {
        accounts: purchasedAccounts.map((acc: any) => ({
          username: acc.username,
          password: acc.password,
          email: acc.email,
          email_password: acc.email_password,
          two_fa_code: acc.two_fa_code,
          recovery_email: acc.recovery_email,
          recovery_email_password: acc.recovery_email_password,
          additional_info: acc.additional_info,
        })),
        product_name: productGroup.name,
        category: productGroup.categories?.name,
        quantity: quantity,
        price_per_unit: productGroup.price,
      },
    };

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (orderError) {
      console.error('❌ Order creation failed:', orderError);

      // Rollback: restore balance and unreserve accounts
      await supabaseAdmin
        .from('profiles')
        .update({ wallet_balance: walletBalance })
        .eq('id', user.id);

      await supabaseAdmin
        .from('individual_accounts')
        .update({ status: 'available' })
        .in('id', accountIds);

      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    // 7. Mark accounts as sold
    await supabaseAdmin
      .from('individual_accounts')
      .update({
        status: 'sold',
        sold_at: new Date().toISOString(),
      })
      .in('id', accountIds);

    // 8. Update product group stock
    const { count: remainingStock } = await supabaseAdmin
      .from('individual_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('product_group_id', product_group_id)
      .eq('status', 'available');

    await supabaseAdmin
      .from('product_groups')
      .update({ stock_count: remainingStock || 0 })
      .eq('id', product_group_id);

    // 9. Record transaction
    await supabaseAdmin
      .from('transactions')
      .insert([{
        user_id: user.id,
        type: 'purchase',
        amount: -totalPrice,
        status: 'completed',
        balance_after: newBalance,
        description: `Purchase: ${quantity}x ${productGroup.name}`,
        reference: `ORD-${order.id.substring(0, 8).toUpperCase()}`,
      }]);

    console.log(`✅ Purchase completed: order=${order.id}, amount=₦${totalPrice}`);

    // Return success - credentials are in order.account_details, user views via orders page
    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        amount: totalPrice,
        quantity: quantity,
        product_name: productGroup.name,
        new_balance: newBalance,
        message: `Successfully purchased ${quantity} account(s)`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Purchase error:', error);

    const message = error instanceof Error ? error.message : 'Purchase failed';
    
    // Return 200 with success: false for business errors so the client can read the message
    // Only return 401 for auth errors
    const status = message === 'Unauthorized' ? 401 : 200;

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
    );
  }
});
