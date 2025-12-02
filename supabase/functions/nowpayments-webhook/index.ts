import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-nowpayments-sig',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client (no user auth required for webhooks)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for admin access
    );

    // Parse webhook payload
    const payload = await req.json();
    console.log('NowPayments webhook received:', JSON.stringify(payload, null, 2));

    // Extract payment details from webhook
    const {
      payment_id,
      payment_status,
      pay_address,
      price_amount,
      price_currency,
      pay_amount,
      actually_paid,
      pay_currency,
      order_id,
      order_description,
      purchase_id,
      outcome_amount,
      outcome_currency,
      payin_hash,
      payout_hash,
      payin_extra_id,
      smart_contract,
      network,
      network_precision,
      time_limit,
      burning_percent,
      expiration_estimate_date,
      payment_extra_ids,
      parent_payment_id,
      origin_type,
      type,
    } = payload;

    // Find transaction by payment_id or order_id
    const { data: existingTransaction, error: findError } = await supabaseAdmin
      .from('crypto_transactions')
      .select('*')
      .or(`nowpayments_payment_id.eq.${payment_id},payment_reference.eq.${order_id}`)
      .single();

    if (findError || !existingTransaction) {
      console.error('Transaction not found:', payment_id, order_id);
      // Still return 200 to acknowledge webhook (prevent retries)
      return new Response(
        JSON.stringify({ success: true, message: 'Transaction not found, webhook acknowledged' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Map NowPayments status to our status
    let transactionStatus = existingTransaction.status;
    let shouldCreditUser = false;

    switch (payment_status) {
      case 'waiting':
        transactionStatus = 'pending';
        break;
      case 'confirming':
        transactionStatus = 'processing';
        break;
      case 'confirmed':
      case 'sending':
        transactionStatus = 'processing';
        break;
      case 'finished':
        transactionStatus = 'completed';
        shouldCreditUser = true;
        break;
      case 'partially_paid':
        transactionStatus = 'partially_paid';
        shouldCreditUser = true; // Credit the partial amount
        break;
      case 'failed':
        transactionStatus = 'failed';
        break;
      case 'refunded':
        transactionStatus = 'refunded';
        break;
      case 'expired':
        transactionStatus = 'expired';
        break;
      default:
        transactionStatus = payment_status;
    }

    // Update transaction with webhook data
    const { error: updateError } = await supabaseAdmin
      .from('crypto_transactions')
      .update({
        status: transactionStatus,
        nowpayments_amount_received: actually_paid || pay_amount,
        actually_paid: actually_paid || 0,
        outcome_amount: outcome_amount,
        outcome_currency: outcome_currency,
        payout_hash: payout_hash,
        payment_extra_ids: payment_extra_ids ? payment_extra_ids : null,
        parent_payment_id: parent_payment_id,
        origin_type: origin_type,
      })
      .eq('id', existingTransaction.id);

    if (updateError) {
      console.error('Failed to update transaction:', updateError);
      throw updateError;
    }

    // Credit user's crypto balance if payment is finished or partially paid
    if (shouldCreditUser) {
      const amountToCredit = actually_paid || pay_amount || 0;
      
      if (amountToCredit > 0) {
        // IDEMPOTENCY CHECK: Only credit if this transaction hasn't been credited before
        // We check if status was already 'completed' before this webhook call
        if (existingTransaction.status === 'completed') {
          console.log(`⏭️ Transaction ${existingTransaction.id} already completed, skipping balance credit`);
        } else {
          // Re-fetch transaction status to ensure no race condition (another webhook might have just finished)
          const { data: freshTx } = await supabaseAdmin
            .from('crypto_transactions')
            .select('status')
            .eq('id', existingTransaction.id)
            .single();
            
          if (freshTx && freshTx.status === 'completed') {
             console.log(`⏭️ Transaction ${existingTransaction.id} was just completed by another process, skipping credit`);
             // We still want to update the transaction details below if needed, but skip credit
             shouldCreditUser = false;
          } else {
            // Get user's current balance with retry loop for optimistic locking
            const creditAmount = parseFloat(existingTransaction.naira_amount);
            let credited = false;
            
            for (let attempt = 0; attempt < 5 && !credited; attempt++) {
              const { data: userData, error: userError } = await supabaseAdmin
                .from('profiles')
                .select('crypto_balance')
                .eq('id', existingTransaction.user_id)
                .single();

              if (userError) {
                console.error('Failed to fetch user:', userError);
                break;
              }

              const currentBalance = parseFloat(userData.crypto_balance || '0');
              const newBalance = currentBalance + creditAmount;

              // Optimistic lock: only update if balance matches what we read
              const { data: updateData, error: balanceError } = await supabaseAdmin
                .from('profiles')
                .update({ crypto_balance: newBalance })
                .match({ id: existingTransaction.user_id, crypto_balance: currentBalance })
                .select()
                .single();

              if (balanceError) {
                console.warn(`⚠️ Balance update conflict on attempt ${attempt + 1}, retrying...`);
                await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
                continue;
              }

              if (updateData) {
                console.log(`✅ Credited ${creditAmount} NGN to user ${existingTransaction.user_id} (new balance: ${newBalance})`);
                credited = true;
              } else {
                console.warn(`🔁 No rows updated on attempt ${attempt + 1}, retrying...`);
                await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
              }
            }

            if (!credited) {
              console.error('❌ Failed to credit user balance after max retries');
            }
          }
        }
      }
    }

    console.log(`Webhook processed: payment_id=${payment_id}, status=${payment_status} -> ${transactionStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        transaction_id: existingTransaction.id,
        status: transactionStatus,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error in nowpayments-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    // Still return 200 to prevent webhook retries
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
