// Supabase Edge Function: Bitnob Webhook Handler
// Receives webhooks from Bitnob when crypto is received or payouts complete

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { BitnobClient } from "../_shared/bitnob-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bitnob-signature',
};

interface WebhookPayload {
  event: string;
  data: {
    reference?: string;
    transactionId?: string;
    amount?: number;
    currency?: string;
    chain?: string;
    address?: string;
    hash?: string;
    confirmations?: number;
    status?: string;
    customerEmail?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get webhook signature from headers
    const signature = req.headers.get('x-bitnob-signature') || '';
    const rawBody = await req.text();

    // Initialize Bitnob client for signature verification
    const bitnob = new BitnobClient({
      secretKey: Deno.env.get('BITNOB_SECRET_KEY') ?? '',
      hmacKey: Deno.env.get('BITNOB_HMAC_KEY') ?? '',
      webhookSecret: Deno.env.get('BITNOB_WEBHOOK_SECRET') ?? '',
    });

    // Verify webhook signature (CRITICAL SECURITY)
    const isValid = bitnob.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error('Invalid webhook signature');
      // Still return 200 to prevent Bitnob from retrying
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse webhook payload
    const payload: WebhookPayload = JSON.parse(rawBody);
    const { event, data } = payload;

    console.log('Received webhook:', { event, data });

    // Initialize Supabase Admin client (no auth required for webhooks)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check for duplicate webhook processing (idempotency)
    const transactionId = data.transactionId || data.reference || '';
    const { data: existingEvent } = await supabaseAdmin
      .from('webhook_events')
      .select('id')
      .eq('bitnob_transaction_id', transactionId)
      .single();

    if (existingEvent) {
      console.log('Webhook already processed, skipping');
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store webhook event for idempotency
    await supabaseAdmin.from('webhook_events').insert({
      bitnob_transaction_id: transactionId,
      event_type: event,
      payload: payload,
    });

    // Process webhook based on event type
    switch (event) {
      case 'btc.onchain.received.success':
      case 'stablecoin.usdt.received.success':
      case 'stablecoin.usdc.received.success':
        await handleCryptoReceived(supabaseAdmin, data);
        break;

      case 'payout.transfer.success':
      case 'mobilepayment.settlement.success':
        await handlePayoutSuccess(supabaseAdmin, data);
        break;

      case 'payout.transfer.failed':
        await handlePayoutFailed(supabaseAdmin, data);
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    // Always return 200 OK (or Bitnob will retry 3 times)
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Still return 200 to prevent retries
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Handle crypto received webhook
 */
async function handleCryptoReceived(supabase: any, data: any) {
  try {
    const { reference, amount, hash, confirmations, chain } = data;

    // Find transaction by Bitnob reference
    const { data: transaction, error: txError } = await supabase
      .from('crypto_transactions')
      .select('*')
      .eq('bitnob_reference', reference)
      .single();

    if (txError || !transaction) {
      console.error('Transaction not found for reference:', reference);
      return;
    }

    // Update transaction with blockchain details
    const { error: updateError } = await supabase
      .from('crypto_transactions')
      .update({
        blockchain_hash: hash,
        confirmations: confirmations || 1,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Failed to update transaction:', updateError);
      return;
    }

    // Credit user's crypto balance
    const { error: creditError } = await supabase.rpc('credit_crypto_balance', {
      p_user_id: transaction.user_id,
      p_amount: transaction.naira_amount,
    });

    if (creditError) {
      console.error('Failed to credit balance:', creditError);
      return;
    }

    // Update daily limit
    const today = new Date().toISOString().split('T')[0];
    await supabase.rpc('update_daily_limit', {
      p_user_id: transaction.user_id,
      p_amount: transaction.naira_amount,
      p_date: today,
    });

    console.log('✅ Crypto received and balance credited:', {
      userId: transaction.user_id,
      amount: transaction.naira_amount,
      hash,
    });
  } catch (error) {
    console.error('Error in handleCryptoReceived:', error);
  }
}

/**
 * Handle payout success webhook
 */
async function handlePayoutSuccess(supabase: any, data: any) {
  try {
    const { transactionId, reference } = data;

    // Find withdrawal by Bitnob transaction ID
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('crypto_withdrawals')
      .select('*')
      .eq('bitnob_transaction_id', transactionId)
      .single();

    if (withdrawalError || !withdrawal) {
      console.error('Withdrawal not found for transaction:', transactionId);
      return;
    }

    // Update withdrawal status
    const { error: updateError } = await supabase
      .from('crypto_withdrawals')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', withdrawal.id);

    if (updateError) {
      console.error('Failed to update withdrawal:', updateError);
      return;
    }

    console.log('✅ Payout completed:', {
      withdrawalId: withdrawal.id,
      userId: withdrawal.user_id,
      amount: withdrawal.net_amount,
    });
  } catch (error) {
    console.error('Error in handlePayoutSuccess:', error);
  }
}

/**
 * Handle payout failed webhook
 */
async function handlePayoutFailed(supabase: any, data: any) {
  try {
    const { transactionId, reference } = data;

    // Find withdrawal by Bitnob transaction ID
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('crypto_withdrawals')
      .select('*')
      .eq('bitnob_transaction_id', transactionId)
      .single();

    if (withdrawalError || !withdrawal) {
      console.error('Withdrawal not found for transaction:', transactionId);
      return;
    }

    // Update withdrawal status to rejected
    const { error: updateError } = await supabase
      .from('crypto_withdrawals')
      .update({
        status: 'rejected',
        rejection_reason: 'Bitnob payout failed',
      })
      .eq('id', withdrawal.id);

    if (updateError) {
      console.error('Failed to update withdrawal:', updateError);
      return;
    }

    // Refund user's crypto balance (they paid the fee, refund net amount)
    const { error: refundError } = await supabase.rpc('credit_crypto_balance', {
      p_user_id: withdrawal.user_id,
      p_amount: withdrawal.net_amount,
    });

    if (refundError) {
      console.error('Failed to refund balance:', refundError);
      return;
    }

    console.log('⚠️ Payout failed, refunded user:', {
      withdrawalId: withdrawal.id,
      userId: withdrawal.user_id,
      refundAmount: withdrawal.net_amount,
    });
  } catch (error) {
    console.error('Error in handlePayoutFailed:', error);
  }
}
