import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Supabase Edge Function version of the PocketFi inward-transfer webhook.
// Runs entirely inside Supabase -- no Vercel env vars needed, since
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase
// for every edge function.
//
// IMPORTANT WHEN DEPLOYING: in the Supabase dashboard, when you create this
// function, there will be a "Verify JWT" / "Enforce JWT verification" toggle.
// You MUST turn that OFF for this function. PocketFi calls this URL directly
// with no Supabase auth token, so if JWT verification is on, every webhook
// call gets rejected with 401 before your code even runs.
//
// Confirmed real PocketFi webhook payload shape (from a live transfer):
// {
//   order: { amount, settlement_amount, fee, description },
//   transaction: { reference },
//   account_number,
//   customer: { id, first_name, last_name, phone, email, businessId, ... }
// }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function firstDefined(...values: any[]) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

function extractAccountNumber(payload: any): string | undefined {
  const value = firstDefined(
    payload.account_number,
    payload.accountNumber,
    payload.virtualAccountNumber,
    payload.data?.account_number,
    payload.data?.accountNumber,
    payload.account?.accountNumber,
    payload.account?.number,
  )
  return value ? String(value) : undefined
}

function extractAmount(payload: any): number {
  const value = firstDefined(
    payload.order?.amount,
    payload.order?.settlement_amount,
    payload.data?.order?.amount,
    payload.data?.order?.settlement_amount,
    payload.amount,
    payload.data?.amount,
    payload.transaction?.amount,
  )
  return Number(value || 0)
}

function extractReference(payload: any): string | undefined {
  const value = firstDefined(
    payload.transaction?.reference,
    payload.transaction?.id,
    payload.data?.transaction?.reference,
    payload.data?.transaction?.id,
    payload.reference,
    payload.transaction_reference,
    payload.transactionReference,
    payload.data?.reference,
    payload.data?.transaction_reference,
    payload.sessionId,
    payload.id,
  )
  return value ? String(value) : undefined
}

function extractStatus(payload: any): string {
  return String(
    firstDefined(payload.status, payload.data?.status, payload.event, '') || '',
  ).toLowerCase()
}

// Referral commission is earned on deposits/top-ups (not on purchases) - a
// percentage of every successful top-up made by a referred user gets credited
// to their referrer's referral_balance. Reads the live referral_commission_pct
// from app_settings (admin-configurable), defaulting to 5% if unset.
// Non-blocking: any failure here must never affect the top-up that already
// completed successfully.
async function creditReferrerForTopup(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  amount: number,
) {
  try {
    const { data: buyerProfile } = await supabaseAdmin
      .from('profiles')
      .select('referred_by')
      .eq('id', userId)
      .single()

    if (!buyerProfile?.referred_by) return

    const referrerId = buyerProfile.referred_by

    const { data: pctSetting } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'referral_commission_pct')
      .maybeSingle()

    const commissionPct = pctSetting?.value ? parseFloat(pctSetting.value) : 5
    const commissionAmount = (amount * commissionPct) / 100
    if (commissionAmount <= 0) return

    const { data: referrerProfile } = await supabaseAdmin
      .from('profiles')
      .select('referral_balance')
      .eq('id', referrerId)
      .single()

    if (!referrerProfile) return

    const newReferralBalance = (referrerProfile.referral_balance || 0) + commissionAmount

    await supabaseAdmin
      .from('profiles')
      .update({ referral_balance: newReferralBalance })
      .eq('id', referrerId)

    await supabaseAdmin
      .from('referral_earnings')
      .insert([{
        referrer_id: referrerId,
        referred_user_id: userId,
        order_amount: amount,
        commission_pct: commissionPct,
        commission_amount: commissionAmount,
      }])

    console.log(`✅ Referral top-up reward: ₦${commissionAmount} credited to referrer ${referrerId}`)
  } catch (referralError) {
    console.error('⚠️ Referral top-up reward error (non-blocking):', referralError)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // Auto-injected by Supabase -- no manual secret setup needed.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )

  const payload = await req.json().catch(() => ({})) as Record<string, any>

  try {
    const accountNumber = extractAccountNumber(payload)
    const amount = extractAmount(payload)
    const reference = extractReference(payload) || `PKF-INWARD-${Date.now()}`
    const status = extractStatus(payload)

    console.log('PocketFi webhook received:', { accountNumber, amount, reference, status })

    const { data: logRow } = await supabase
      .from('pocketfi_webhook_logs')
      .insert({
        raw_payload: payload,
        matched_account_number: accountNumber || null,
      })
      .select('id')
      .single()

    if (!accountNumber || !amount) {
      const message = 'Missing account number or amount in PocketFi webhook payload'
      console.error(message, payload)
      if (logRow) {
        await supabase.from('pocketfi_webhook_logs').update({ error_message: message }).eq('id', logRow.id)
      }
      return json({ message: 'Payload could not be parsed, logged for review' })
    }

    const isSuccess = status === '' || status.includes('success') || status === 'completed' || status === 'paid' || status === 'credit'
    if (!isSuccess) {
      console.log('Ignoring non-successful PocketFi event:', status)
      return json({ message: 'Event ignored' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('pocketfi_account_number', accountNumber)
      .maybeSingle()

    if (!profile) {
      const message = `No user found for PocketFi account number ${accountNumber}`
      console.error(message)
      if (logRow) {
        await supabase.from('pocketfi_webhook_logs').update({ error_message: message }).eq('id', logRow.id)
      }
      return json({ message: 'No matching account on file' })
    }

    const userId = profile.id

    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('reference', reference)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingTransaction) {
      console.log('PocketFi transaction already processed:', reference)
      return json({ message: 'Transaction already processed' })
    }

    const newBalance = (profile.wallet_balance || 0) + amount

    const { error: balanceError } = await supabase
      .from('profiles')
      .update({
        wallet_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (balanceError) {
      throw new Error(`Failed to update wallet: ${balanceError.message}`)
    }

    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([{
        user_id: userId,
        type: 'topup',
        amount,
        status: 'completed',
        balance_after: newBalance,
        description: `Wallet top-up via PocketFi bank transfer (${accountNumber})`,
        reference,
      }])

    if (transactionError) {
      throw new Error(`Failed to record transaction: ${transactionError.message}`)
    }

    if (logRow) {
      await supabase
        .from('pocketfi_webhook_logs')
        .update({ processed: true, matched_user_id: userId })
        .eq('id', logRow.id)
    }

    console.log('PocketFi webhook payment processed successfully for user:', userId)

    await creditReferrerForTopup(supabase, userId, amount)

    return json({
      success: true,
      message: 'Payment processed successfully',
      data: { user_id: userId, amount, new_balance: newBalance, reference },
    })
  } catch (error) {
    console.error('PocketFi webhook processing error:', error)
    return json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
})
