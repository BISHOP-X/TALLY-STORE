import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createSageCloudClient, type BalanceCheckResult, SageCloudClient } from '../_shared/sagecloud-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Log admin alert for low SageCloud balance
 * In production, this could trigger email/SMS/Slack notifications
 */
async function logAdminAlert(
  supabaseAdmin: any,
  alertType: 'low_balance' | 'critical_balance' | 'insufficient_balance',
  balanceInfo: BalanceCheckResult,
  context: { transaction_type: string; user_id: string; reference?: string }
) {
  const thresholds = SageCloudClient.getThresholds();
  
  const alertMessage = alertType === 'critical_balance'
    ? `🚨 CRITICAL: SageCloud balance (₦${balanceInfo.currentBalance.toLocaleString()}) is below critical threshold (₦${thresholds.CRITICAL_BALANCE_THRESHOLD.toLocaleString()})`
    : alertType === 'low_balance'
    ? `⚠️ WARNING: SageCloud balance (₦${balanceInfo.currentBalance.toLocaleString()}) is below warning threshold (₦${thresholds.LOW_BALANCE_THRESHOLD.toLocaleString()})`
    : `❌ FAILED: Insufficient SageCloud balance. Needed: ₦${balanceInfo.requestedAmount.toLocaleString()}, Available: ₦${balanceInfo.currentBalance.toLocaleString()}, Shortfall: ₦${balanceInfo.shortfall.toLocaleString()}`;

  console.error(`[ADMIN ALERT] ${alertMessage}`);
  console.error(`[ADMIN ALERT] Context: ${JSON.stringify(context)}`);

  // Log to admin_alerts table for dashboard visibility
  try {
    await supabaseAdmin
      .from('admin_alerts')
      .insert({
        alert_type: alertType,
        severity: alertType === 'critical_balance' ? 'critical' : alertType === 'low_balance' ? 'warning' : 'error',
        message: alertMessage,
        context: {
          ...context,
          balance_info: balanceInfo,
          thresholds,
        },
        acknowledged: false,
      });
  } catch (dbError) {
    // Don't fail the transaction if alert logging fails
    console.error('[ADMIN ALERT] Failed to log to database:', dbError);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Kill switch - can disable all withdrawals instantly via env var
    if (Deno.env.get('WITHDRAWALS_ENABLED') === 'false') {
      throw new Error('Withdrawals are temporarily disabled for maintenance. Please try again later.');
    }
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
    const { amount, bank_code, account_number, account_name, narration } = await req.json();

    // Validate required fields
    if (!amount || !bank_code || !account_number || !account_name) {
      throw new Error('Missing required fields: amount, bank_code, account_number, account_name');
    }

    // Validate amount
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      throw new Error('Invalid amount');
    }

    // Check user's crypto balance
    const { data: userData, error: userFetchError } = await supabaseClient
      .from('profiles')
      .select('crypto_balance')
      .eq('id', user.id)
      .single();

    if (userFetchError) {
      throw new Error('Failed to fetch user balance');
    }

    const currentBalance = parseFloat(userData.crypto_balance || '0');
    if (currentBalance < withdrawalAmount) {
      throw new Error(`Insufficient balance. Available: ₦${currentBalance.toLocaleString()}, Requested: ₦${withdrawalAmount.toLocaleString()}`);
    }

    // Initialize SageCloud client
    const sageCloudClient = createSageCloudClient({
      publicKey: Deno.env.get('SAGECLOUD_PUBLIC_KEY') ?? '',
      secretKey: Deno.env.get('SAGECLOUD_SECRET_KEY') ?? '',
    });

    // Initialize admin client for alerts (uses service role key)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Step 1: Validate bank account (verify account name)
    console.log('Validating bank account...');
    let validatedAccountName = account_name;
    
    try {
      const validationResponse = await sageCloudClient.validateBankAccount({
        bank_code,
        account_number,
      });
      
      if (validationResponse && validationResponse.account_name) {
        validatedAccountName = validationResponse.account_name;
        console.log('Account validated:', validatedAccountName);
      }
    } catch (validationError) {
      console.warn('Account validation failed, proceeding with provided name:', validationError);
      // Continue with user-provided name if validation fails
    }

    // Step 2: Check SageCloud balance with detailed info for admin alerts
    console.log('Checking SageCloud balance...');
    const balanceCheck = await sageCloudClient.checkBalanceWithDetails(withdrawalAmount);
    
    // Log balance status for monitoring
    console.log(`SageCloud balance check: Current=₦${balanceCheck.currentBalance.toLocaleString()}, Required=₦${balanceCheck.requestedAmount.toLocaleString()}, HasBalance=${balanceCheck.hasBalance}`);
    
    // Trigger admin alerts based on balance thresholds
    if (balanceCheck.isCriticalBalance) {
      await logAdminAlert(supabaseAdmin, 'critical_balance', balanceCheck, {
        transaction_type: 'withdrawal',
        user_id: user.id,
      });
    } else if (balanceCheck.isLowBalance) {
      await logAdminAlert(supabaseAdmin, 'low_balance', balanceCheck, {
        transaction_type: 'withdrawal',
        user_id: user.id,
      });
    }
    
    // If insufficient balance, log alert and return user-friendly error
    if (!balanceCheck.hasBalance) {
      await logAdminAlert(supabaseAdmin, 'insufficient_balance', balanceCheck, {
        transaction_type: 'withdrawal',
        user_id: user.id,
      });
      throw new Error('Insufficient SageCloud balance. Please contact support.');
    }

    // Generate unique reference
    const reference = `TALLY-WD-${Date.now()}-${user.id.substring(0, 8)}`;

    // Step 3: Create withdrawal record (pending status)
    const { data: withdrawalRecord, error: dbError } = await supabaseClient
      .from('crypto_withdrawals')
      .insert({
        user_id: user.id,
        amount: withdrawalAmount,
        bank_code,
        account_number,
        account_name: validatedAccountName,
        status: 'pending',
        withdrawal_provider: 'sagecloud',
        sagecloud_reference: reference,
        sagecloud_narration: narration || `Withdrawal to ${validatedAccountName}`,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to create withdrawal record: ${dbError.message}`);
    }

    // Step 4: Deduct from user's crypto balance with optimistic locking
    let balanceDeducted = false;
    let actualCurrentBalance = currentBalance;
    
    for (let attempt = 0; attempt < 5 && !balanceDeducted; attempt++) {
      // Re-fetch balance to ensure we have latest value
      const { data: freshUserData } = await supabaseClient
        .from('profiles')
        .select('crypto_balance')
        .eq('id', user.id)
        .single();
      
      actualCurrentBalance = parseFloat(freshUserData?.crypto_balance || '0');
      
      // Re-check balance is sufficient
      if (actualCurrentBalance < withdrawalAmount) {
        // Rollback withdrawal record
        await supabaseClient
          .from('crypto_withdrawals')
          .delete()
          .eq('id', withdrawalRecord.id);
        throw new Error(`Insufficient balance. Available: ₦${actualCurrentBalance.toLocaleString()}, Requested: ₦${withdrawalAmount.toLocaleString()}`);
      }
      
      // Optimistic lock: only update if balance matches what we read
      const { data: updateData, error: balanceError } = await supabaseClient
        .from('profiles')
        .update({ crypto_balance: actualCurrentBalance - withdrawalAmount })
        .match({ id: user.id, crypto_balance: actualCurrentBalance })
        .select()
        .single();

      if (balanceError) {
        console.warn(`⚠️ Balance deduction conflict on attempt ${attempt + 1}, retrying...`);
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
        continue;
      }

      if (updateData) {
        balanceDeducted = true;
        console.log(`✅ Deducted ${withdrawalAmount} from user ${user.id}`);
      } else {
        console.warn(`🔁 No rows updated on attempt ${attempt + 1}, retrying...`);
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
      }
    }
    
    if (!balanceDeducted) {
      // Rollback withdrawal record
      await supabaseClient
        .from('crypto_withdrawals')
        .delete()
        .eq('id', withdrawalRecord.id);
      throw new Error('Failed to deduct balance after multiple attempts. Please try again.');
    }

    // Step 5: Process transfer via SageCloud
    let transferResponse;
    let finalStatus = 'pending';
    
    try {
      console.log('Processing SageCloud transfer...');
      transferResponse = await sageCloudClient.transfer({
        reference,
        bank_code,
        account_number,
        account_name: validatedAccountName,
        amount: withdrawalAmount,
        narration: narration || `Withdrawal to ${validatedAccountName}`,
      });

      console.log('SageCloud response:', JSON.stringify(transferResponse, null, 2));

      // Check if transfer was successful
      if (transferResponse.success && transferResponse.status === 'success') {
        finalStatus = 'completed';
      } else {
        finalStatus = 'failed';
      }

      // Update withdrawal record with transfer response
      await supabaseClient
        .from('crypto_withdrawals')
        .update({
          status: finalStatus,
          sagecloud_response: JSON.stringify(transferResponse),
          sagecloud_transfer_status: transferResponse.status,
          completed_at: finalStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', withdrawalRecord.id);

    } catch (transferError: unknown) {
      console.error('SageCloud transfer failed:', transferError);
      const errorMessage = transferError instanceof Error ? transferError.message : 'Unknown transfer error';
      
      // Update withdrawal as failed
      await supabaseClient
        .from('crypto_withdrawals')
        .update({
          status: 'failed',
          sagecloud_response: JSON.stringify({ error: errorMessage }),
        })
        .eq('id', withdrawalRecord.id);

      // Refund user's balance with optimistic locking
      let refunded = false;
      for (let attempt = 0; attempt < 5 && !refunded; attempt++) {
        const { data: currentUserData } = await supabaseClient
          .from('profiles')
          .select('crypto_balance')
          .eq('id', user.id)
          .single();
        
        const currentBal = parseFloat(currentUserData?.crypto_balance || '0');
        const refundedBalance = currentBal + withdrawalAmount;
        
        const { data: refundData } = await supabaseClient
          .from('profiles')
          .update({ crypto_balance: refundedBalance })
          .match({ id: user.id, crypto_balance: currentBal })
          .select()
          .single();
        
        if (refundData) {
          refunded = true;
          console.log(`✅ Refunded ${withdrawalAmount} to user ${user.id}`);
        } else {
          await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
        }
      }

      throw new Error(`Transfer failed: ${errorMessage}`);
    }

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        withdrawal_id: withdrawalRecord.id,
        reference,
        status: finalStatus,
        amount: withdrawalAmount,
        account_name: validatedAccountName,
        message: finalStatus === 'completed' 
          ? 'Withdrawal processed successfully' 
          : 'Withdrawal is being processed',
        transfer_response: transferResponse,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error in create-withdrawal-request:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
