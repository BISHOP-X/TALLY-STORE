import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createSageCloudClient } from '../_shared/sagecloud-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          persistSession: false,
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { transaction_type, amount, service_provider, phone, data_plan_code } = await req.json();

    // Validate required fields
    if (!transaction_type || !amount || !service_provider || !phone) {
      throw new Error('Missing required fields: transaction_type, amount, service_provider, phone');
    }

    // Validate transaction type
    if (!['airtime', 'data'].includes(transaction_type)) {
      throw new Error('Invalid transaction_type. Must be "airtime" or "data"');
    }

    // Validate service provider
    const validProviders = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
    if (!validProviders.includes(service_provider.toUpperCase())) {
      throw new Error(`Invalid service_provider. Must be one of: ${validProviders.join(', ')}`);
    }

    // Validate amount
    const purchaseAmount = parseFloat(amount);
    if (isNaN(purchaseAmount) || purchaseAmount <= 0) {
      throw new Error('Invalid amount');
    }

    // For data purchase, validate plan code
    if (transaction_type === 'data' && !data_plan_code) {
      throw new Error('data_plan_code is required for data purchases');
    }

    // Check user's wallet balance
    const { data: userData, error: userFetchError } = await supabaseClient
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (userFetchError) {
      throw new Error('Failed to fetch user balance');
    }

    const currentBalance = parseFloat(userData.wallet_balance || '0');
    if (currentBalance < purchaseAmount) {
      throw new Error(`Insufficient balance. Available: ₦${currentBalance.toLocaleString()}, Required: ₦${purchaseAmount.toLocaleString()}`);
    }

    // Initialize SageCloud client
    const sageCloudClient = createSageCloudClient({
      publicKey: Deno.env.get('SAGECLOUD_PUBLIC_KEY') ?? '',
      secretKey: Deno.env.get('SAGECLOUD_SECRET_KEY') ?? '',
    });

    // Check SageCloud balance
    console.log('Checking SageCloud balance...');
    const hasBalance = await sageCloudClient.hasBalance(purchaseAmount);
    
    if (!hasBalance) {
      throw new Error('Service temporarily unavailable. Please try again later.');
    }

    // Generate unique reference
    const reference = `TALLY-${transaction_type.toUpperCase()}-${Date.now()}-${user.id.substring(0, 8)}`;

    // Create bills transaction record (pending status)
    const { data: billRecord, error: dbError } = await supabaseClient
      .from('bills_transactions')
      .insert({
        user_id: user.id,
        reference,
        transaction_type,
        amount: purchaseAmount,
        status: 'pending',
        service_provider: service_provider.toUpperCase(),
        service_code: data_plan_code || null,
        beneficiary_phone: phone,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to create transaction record: ${dbError.message}`);
    }

    // Deduct from user's wallet balance with optimistic locking
    let balanceDeducted = false;
    let actualCurrentBalance = currentBalance;
    
    for (let attempt = 0; attempt < 5 && !balanceDeducted; attempt++) {
      // Re-fetch balance to ensure we have latest value
      const { data: freshUserData } = await supabaseClient
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();
      
      actualCurrentBalance = parseFloat(freshUserData?.wallet_balance || '0');
      
      // Re-check balance is sufficient
      if (actualCurrentBalance < purchaseAmount) {
        // Rollback transaction record
        await supabaseClient
          .from('bills_transactions')
          .delete()
          .eq('id', billRecord.id);
        throw new Error(`Insufficient balance. Available: ₦${actualCurrentBalance.toLocaleString()}, Required: ₦${purchaseAmount.toLocaleString()}`);
      }
      
      // Optimistic lock: only update if balance matches what we read
      const { data: updateData, error: balanceError } = await supabaseClient
        .from('profiles')
        .update({ wallet_balance: actualCurrentBalance - purchaseAmount })
        .match({ id: user.id, wallet_balance: actualCurrentBalance })
        .select()
        .single();

      if (balanceError) {
        console.warn(`⚠️ Balance deduction conflict on attempt ${attempt + 1}, retrying...`);
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
        continue;
      }

      if (updateData) {
        balanceDeducted = true;
        console.log(`✅ Deducted ${purchaseAmount} from user ${user.id} wallet`);
      } else {
        console.warn(`🔁 No rows updated on attempt ${attempt + 1}, retrying...`);
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
      }
    }
    
    if (!balanceDeducted) {
      // Rollback transaction record
      await supabaseClient
        .from('bills_transactions')
        .delete()
        .eq('id', billRecord.id);
      throw new Error('Failed to deduct balance after multiple attempts. Please try again.');
    }

    // Process purchase via SageCloud
    let purchaseResponse;
    let finalStatus = 'pending';
    
    try {
      if (transaction_type === 'airtime') {
        // Purchase airtime
        console.log('Processing airtime purchase...');
        const service = `${service_provider.toUpperCase()}VTU`; // e.g., MTNVTU, GLOVTU
        
        purchaseResponse = await sageCloudClient.purchaseAirtime({
          reference,
          network: service_provider.toUpperCase() as 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE',
          service,
          phone,
          amount: purchaseAmount.toString(),
        });

      } else {
        // Purchase data
        console.log('Processing data purchase...');
        const dataType = `${service_provider.toUpperCase()}DATA`; // e.g., MTNDATA, GLODATA
        
        purchaseResponse = await sageCloudClient.purchaseData({
          reference,
          type: dataType,
          code: data_plan_code!,
          network: service_provider.toUpperCase() as 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE',
          phone,
          provider: service_provider.toUpperCase(),
        });
      }

      console.log('SageCloud response:', JSON.stringify(purchaseResponse, null, 2));

      // Check if purchase was successful
      if (purchaseResponse.success && purchaseResponse.status === 'success') {
        finalStatus = 'successful';
      } else {
        finalStatus = 'failed';
      }

      // Update transaction with response
      await supabaseClient
        .from('bills_transactions')
        .update({
          status: finalStatus,
          sagecloud_reference: purchaseResponse.reference || reference,
          sagecloud_response: JSON.stringify(purchaseResponse),
          completed_at: finalStatus === 'successful' ? new Date().toISOString() : null,
        })
        .eq('id', billRecord.id);

    } catch (purchaseError: unknown) {
      console.error('SageCloud purchase failed:', purchaseError);
      const errorMessage = purchaseError instanceof Error ? purchaseError.message : 'Unknown purchase error';
      
      // Update transaction as failed
      await supabaseClient
        .from('bills_transactions')
        .update({
          status: 'failed',
          sagecloud_response: JSON.stringify({ error: errorMessage }),
        })
        .eq('id', billRecord.id);

      // Refund user's wallet balance with optimistic locking
      let refunded = false;
      for (let attempt = 0; attempt < 5 && !refunded; attempt++) {
        const { data: currentUserData } = await supabaseClient
          .from('profiles')
          .select('wallet_balance')
          .eq('id', user.id)
          .single();
        
        const currentBal = parseFloat(currentUserData?.wallet_balance || '0');
        const refundedBalance = currentBal + purchaseAmount;
        
        const { data: refundData } = await supabaseClient
          .from('profiles')
          .update({ wallet_balance: refundedBalance })
          .match({ id: user.id, wallet_balance: currentBal })
          .select()
          .single();
        
        if (refundData) {
          refunded = true;
          console.log(`✅ Refunded ${purchaseAmount} to user ${user.id} wallet`);
        } else {
          await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
        }
      }

      throw new Error(`Purchase failed: ${errorMessage}`);
    }

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: billRecord.id,
        reference,
        status: finalStatus,
        transaction_type,
        amount: purchaseAmount,
        service_provider: service_provider.toUpperCase(),
        beneficiary_phone: phone,
        message: finalStatus === 'successful' 
          ? `${transaction_type === 'airtime' ? 'Airtime' : 'Data'} purchase successful` 
          : `${transaction_type === 'airtime' ? 'Airtime' : 'Data'} purchase is being processed`,
        purchase_response: purchaseResponse,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in purchase-bills:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
