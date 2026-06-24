import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Edge function for initiating a wallet top-up via PocketFi (second payment gateway,
// alongside Ercas Pay). Mirrors the create-wallet-topup (Ercas) function's shape so the
// frontend can treat both gateways the same way: POST in, { success, data: { checkoutUrl,
// transactionReference, paymentReference } } out.
//
// NOTE: PocketFi's exact endpoint path / payload field names should be confirmed against
// their current API docs once you have them — this scaffold uses the common Nigerian
// payment-aggregator shape (init transaction -> checkoutUrl + reference) and is wired to
// be easily adjusted via the POCKETFI_BASE_URL env var without code changes.

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

function generatePaymentReference() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `PKF-${timestamp}-${random}`
}

function cleanCustomerName(value: unknown) {
  const cleaned = String(value || '').replace(/[^a-zA-Z\s]/g, '').trim()
  return cleaned || 'Tally Store Customer'
}

function normalizeRedirectUrl(value: unknown, originHeader: string | null) {
  const fallbackOrigin = originHeader && /^https?:\/\//i.test(originHeader)
    ? originHeader
    : 'https://tallystore.app'
  const fallback = `${fallbackOrigin.replace(/\/$/, '')}/wallet`

  if (typeof value !== 'string' || !value) return fallback

  try {
    const url = new URL(value)
    const fallbackUrl = new URL(fallback)
    if (url.origin !== fallbackUrl.origin) return fallback
    return url.toString()
  } catch {
    return fallback
  }
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Missing authorization header')

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    },
  )

  const { data: { user }, error } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''))
  if (error || !user?.email) throw new Error('Unauthorized')
  return user
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return json({ success: false, error: 'Method not allowed' }, 405)
    }

    const user = await getAuthenticatedUser(req)
    const body = await req.json().catch(() => ({})) as Record<string, any>
    const amount = Math.trunc(Number(body.amount || 0))

    if (!amount || amount < 100) {
      throw new Error('Please enter an amount of at least NGN 100.')
    }

    if (amount > 1000000) {
      throw new Error('Maximum top-up amount is NGN 1,000,000.')
    }

    const pocketfiSecretKey = Deno.env.get('POCKETFI_SECRET_KEY')
    if (!pocketfiSecretKey) {
      throw new Error('Payments are temporarily unavailable.')
    }

    const pocketfiBaseUrl = Deno.env.get('POCKETFI_BASE_URL') || 'https://api.pocketfi.ng/v1'

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    )

    const paymentReference = generatePaymentReference()

    const transactionData = {
      amount,
      reference: paymentReference,
      email: user.email,
      customer_name: cleanCustomerName(body.customerName),
      phone: String(body.customerPhoneNumber || ''),
      redirect_url: normalizeRedirectUrl(body.redirectUrl, req.headers.get('Origin')),
      description: String(body.description || 'Wallet Top-up'),
      currency: 'NGN',
      metadata: {
        ...(typeof body.metadata === 'object' && body.metadata ? body.metadata : {}),
        source: 'tally-store-wallet-topup',
        user_id: user.id,
        userId: user.id,
        type: 'wallet_topup',
        originalAmount: amount,
      },
    }

    const response = await fetch(`${pocketfiBaseUrl}/transactions/initialize`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pocketfiSecretKey}`,
      },
      body: JSON.stringify(transactionData),
    })

    const result = await response.json().catch(() => null) as Record<string, any> | null
    if (!response.ok || result?.status === false) {
      const message = result?.message || result?.error || 'Unable to start payment. Please try again.'
      return json({ success: false, message, error: message }, 400)
    }

    const responseData = result?.data || result || {}
    const transactionReference = String(responseData.reference || responseData.transaction_reference || paymentReference)
    const checkoutUrl = String(responseData.checkout_url || responseData.authorization_url || responseData.link || '')

    if (!checkoutUrl) {
      throw new Error('Payment service returned an incomplete checkout response.')
    }

    await supabaseAdmin
      .from('pending_payments')
      .insert({
        user_id: user.id,
        transaction_reference: transactionReference,
        ercas_reference: paymentReference, // shared column, used for any gateway's merchant reference
        amount,
        status: 'pending',
      })

    return json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        paymentReference,
        transactionReference,
        checkoutUrl,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initiate payment'
    const status = message === 'Unauthorized' || message === 'Missing authorization header' ? 401 : 400
    console.error('Create PocketFi top-up error:', message)
    return json({ success: false, message, error: message }, status)
  }
})
