// Supabase Edge Function: Create Withdrawal Request
// Initiates a bank withdrawal using Bitnob Payouts API

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { BitnobClient } from "../_shared/bitnob-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateWithdrawalRequest {
  amount: number; // Naira amount
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CreateWithdrawalRequest = await req.json();
    const { amount, bankCode, bankName, accountNumber, accountName } = body;

    // Validate input
    if (!amount || amount < 1000 || amount > 2000000) {
      return new Response(
        JSON.stringify({ error: 'Amount must be between ₦1,000 and ₦2,000,000' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bankCode || !bankName || !accountNumber || !accountName) {
      return new Response(
        JSON.stringify({ error: 'All bank details are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's crypto balance
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('crypto_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate fee (2%)
    const fee = amount * 0.02;
    const netAmount = amount - fee;

    // Check sufficient balance
    if (profile.crypto_balance < amount) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient balance',
          available: profile.crypto_balance,
          required: amount,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct balance immediately (prevent double withdrawal)
    const { error: deductError } = await supabaseClient.rpc('deduct_crypto_balance', {
      p_user_id: user.id,
      p_amount: amount,
    });

    if (deductError) {
      return new Response(
        JSON.stringify({ error: 'Failed to deduct balance: ' + deductError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if withdrawal requires approval (≥₦500k)
    const requiresApproval = amount >= 500000;

    // Create withdrawal record
    const { data: withdrawal, error: withdrawalError } = await supabaseClient
      .from('crypto_withdrawals')
      .insert({
        user_id: user.id,
        amount,
        fee,
        net_amount: netAmount,
        bank_code: bankCode,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        status: requiresApproval ? 'pending' : 'processing',
        requires_approval: requiresApproval,
      })
      .select()
      .single();

    if (withdrawalError || !withdrawal) {
      // Refund balance if withdrawal creation failed
      await supabaseClient.rpc('credit_crypto_balance', {
        p_user_id: user.id,
        p_amount: amount,
      });

      return new Response(
        JSON.stringify({ error: 'Failed to create withdrawal request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If requires approval, stop here (admin must approve)
    if (requiresApproval) {
      return new Response(
        JSON.stringify({
          success: true,
          requiresApproval: true,
          withdrawal: {
            id: withdrawal.id,
            amount,
            fee,
            netAmount,
            status: 'pending',
            message: 'Withdrawal request submitted for admin approval',
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Bitnob client
    const bitnob = new BitnobClient({
      secretKey: Deno.env.get('BITNOB_SECRET_KEY') ?? '',
      hmacKey: Deno.env.get('BITNOB_HMAC_KEY') ?? '',
      webhookSecret: Deno.env.get('BITNOB_WEBHOOK_SECRET') ?? '',
    });

    // Step 1: Create beneficiary (or reuse existing)
    const beneficiaryResult = await bitnob.createBeneficiary({
      accountNumber,
      accountName,
      bankCode,
      bankName,
    });

    if (!beneficiaryResult.success || !beneficiaryResult.beneficiaryId) {
      // Rollback: Refund balance and mark withdrawal as rejected
      await supabaseClient.rpc('credit_crypto_balance', {
        p_user_id: user.id,
        p_amount: amount,
      });

      await supabaseClient
        .from('crypto_withdrawals')
        .update({
          status: 'rejected',
          rejection_reason: beneficiaryResult.error || 'Failed to create beneficiary',
        })
        .eq('id', withdrawal.id);

      return new Response(
        JSON.stringify({ error: beneficiaryResult.error || 'Failed to create beneficiary' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Initiate payout (amount in cents)
    const amountInCents = Math.round(netAmount * 100);
    const payoutResult = await bitnob.initiatePayout({
      beneficiaryId: beneficiaryResult.beneficiaryId,
      amount: amountInCents,
      reference: `WD_${withdrawal.id}_${Date.now()}`,
    });

    if (!payoutResult.success) {
      // Rollback: Refund balance and mark withdrawal as rejected
      await supabaseClient.rpc('credit_crypto_balance', {
        p_user_id: user.id,
        p_amount: amount,
      });

      await supabaseClient
        .from('crypto_withdrawals')
        .update({
          status: 'rejected',
          rejection_reason: payoutResult.error || 'Failed to initiate payout',
        })
        .eq('id', withdrawal.id);

      return new Response(
        JSON.stringify({ error: payoutResult.error || 'Failed to initiate payout' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update withdrawal with Bitnob IDs
    await supabaseClient
      .from('crypto_withdrawals')
      .update({
        bitnob_transaction_id: payoutResult.transactionId,
        bitnob_beneficiary_id: beneficiaryResult.beneficiaryId,
        bitnob_reference: payoutResult.reference,
        status: 'processing',
      })
      .eq('id', withdrawal.id);

    // Return success (webhook will update status to completed)
    return new Response(
      JSON.stringify({
        success: true,
        requiresApproval: false,
        withdrawal: {
          id: withdrawal.id,
          amount,
          fee,
          netAmount,
          status: 'processing',
          bitnobTransactionId: payoutResult.transactionId,
          message: 'Withdrawal is being processed. You will receive the money in 5-15 minutes.',
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-withdrawal-request:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
