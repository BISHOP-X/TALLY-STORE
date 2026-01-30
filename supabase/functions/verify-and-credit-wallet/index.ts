import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ERCASPAY_BASE_URL = 'https://api.ercaspay.com/api/v1';

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
    const { transaction_reference, ercas_reference } = await req.json();

    if (!transaction_reference) {
      throw new Error('transaction_reference is required');
    }

    console.log(`🔍 Verifying payment: ${transaction_reference} for user ${user.id}`);

    // Check if already processed (idempotency)
    const { data: existingTx } = await supabaseAdmin
      .from('transactions')
      .select('id, amount, balance_after')
      .or(`reference.eq.${transaction_reference},ercas_reference.eq.${ercas_reference || transaction_reference}`)
      .eq('user_id', user.id)
      .eq('type', 'topup')
      .single();

    if (existingTx) {
      console.log(`⚠️ Transaction already processed: ${transaction_reference}`);
      return new Response(
        JSON.stringify({
          success: true,
          already_processed: true,
          amount: existingTx.amount,
          new_balance: existingTx.balance_after,
          message: 'Payment already credited to wallet',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify with Ercas Pay API
    const ercasSecretKey = Deno.env.get('ERCASPAY_SECRET_KEY');
    if (!ercasSecretKey) {
      throw new Error('Ercas Pay not configured');
    }

    const verifyResponse = await fetch(
      `${ERCASPAY_BASE_URL}/payment/transaction/verify/${transaction_reference}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${ercasSecretKey}`,
        },
      }
    );

    // Parse response body regardless of status code (Ercas returns 400 for pending)
    const verifyResult = await verifyResponse.json();
    console.log('📥 Ercas verification result:', JSON.stringify(verifyResult));

    // Handle pending payments gracefully
    if (verifyResult.responseBody?.status === 'PENDING' || verifyResult.responseCode === 'pending') {
      console.log('⏳ Payment is still pending');
      return new Response(
        JSON.stringify({
          success: false,
          status: 'pending',
          error: 'Payment is still pending. Please complete the payment.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Handle failed verification
    if (!verifyResult.requestSuccessful && verifyResult.responseBody?.status !== 'SUCCESSFUL') {
      const errorMsg = verifyResult.errorMessage || verifyResult.responseMessage || 'Payment verification failed';
      console.error('❌ Verification failed:', errorMsg);
      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          error: errorMsg,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const transaction = verifyResult.responseBody;

    if (transaction.status !== 'SUCCESSFUL') {
      return new Response(
        JSON.stringify({
          success: false,
          status: transaction.status.toLowerCase(),
          error: `Payment status: ${transaction.status}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const amount = transaction.amount;
    const ercasRef = transaction.ercs_reference;

    // Get current wallet balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Failed to fetch wallet balance');
    }

    const currentBalance = profile.wallet_balance || 0;
    const newBalance = currentBalance + amount;

    // Update wallet balance with optimistic locking
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        wallet_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .eq('wallet_balance', currentBalance)
      .select()
      .single();

    if (updateError || !updatedProfile) {
      // Retry with fresh balance
      const { data: freshProfile } = await supabaseAdmin
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      if (freshProfile) {
        const retryBalance = freshProfile.wallet_balance + amount;
        await supabaseAdmin
          .from('profiles')
          .update({
            wallet_balance: retryBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
    }

    // Record transaction
    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'topup',
        amount: amount,
        status: 'completed',
        balance_after: newBalance,
        description: 'Wallet top-up via Ercas Pay',
        reference: transaction_reference,
        ercas_reference: ercasRef,
      });

    if (txError) {
      console.error('❌ Failed to record transaction:', txError);
      // Don't fail - wallet was updated
    }

    console.log(`✅ Wallet credited: +₦${amount} for user ${user.id}, new balance: ₦${newBalance}`);

    return new Response(
      JSON.stringify({
        success: true,
        amount: amount,
        new_balance: newBalance,
        message: `₦${amount.toLocaleString()} has been added to your wallet`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Verify and credit error:', error);

    const message = error instanceof Error ? error.message : 'Failed to process payment';
    const status = message === 'Unauthorized' ? 401 : 400;

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
    );
  }
});
