import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getUsdToNgnRate } from '../_shared/forex-rates.ts'
import {
  createSmsBusClient,
  extractSmsCode,
  SmsBusApiError,
  SmsBusPrice,
  SmsBusRentalArea,
} from '../_shared/smsbus-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TERMINAL_STATUSES = ['completed', 'cancelled', 'expired', 'failed']

const RATE_LIMITS: Record<string, { limit: number; windowSeconds: number }> = {
  health: { limit: 30, windowSeconds: 60 },
  countries: { limit: 30, windowSeconds: 60 },
  services: { limit: 30, windowSeconds: 60 },
  rental_areas: { limit: 30, windowSeconds: 60 },
  orders: { limit: 60, windowSeconds: 60 },
  create_otp: { limit: 5, windowSeconds: 60 },
  rent_number: { limit: 5, windowSeconds: 60 },
  renew_rental: { limit: 5, windowSeconds: 60 },
  check_otp: { limit: 30, windowSeconds: 60 },
  cancel_otp: { limit: 20, windowSeconds: 60 },
  rental_sms: { limit: 30, windowSeconds: 60 },
  cancel_rental: { limit: 20, windowSeconds: 60 },
}

const memoryRateLimits = new Map<string, { count: number; resetAt: number }>()

type SupabaseAdmin = ReturnType<typeof createClient>

type PriceBreakdown = {
  providerCostUsd: number
  marginUsd: number
  totalCostUsd: number
  exchangeRate: number
  priceNgn: number
}

type WalletDebit = {
  previousBalance: number
  newBalance: number
}

type SmsOrder = {
  id: string
  user_id: string
  reference: string
  order_type: 'otp' | 'rental'
  provider_request_id?: string | null
  provider_order_id?: string | null
  service_id: string
  service_name: string
  country_id?: number | null
  country_code?: string | null
  area_code?: string | null
  phone_number?: string | null
  raw_phone_number?: string | null
  dialing_code?: string | null
  rent_months?: number | null
  price_ngn: number
  status: string
  messages: Array<Record<string, unknown>>
  provider_payload: Record<string, unknown>
  refunded_at?: string | null
  created_at: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function generateReference(prefix = 'SMS') {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

function envNumber(name: string, fallback: number) {
  const raw = Deno.env.get(name)
  const value = raw ? Number(raw) : fallback
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

function getSmsBusToken() {
  return Deno.env.get('SMSBUS_API_KEY') || Deno.env.get('SMS_BUS_API_KEY') || ''
}

function friendlyError(error: unknown) {
  if (error instanceof SmsBusApiError) {
    const publicMessages: Record<string, string> = {
      bad_token: 'SMS number purchases are temporarily unavailable.',
      no_service: 'This SMS service is unavailable right now.',
      no_number: 'No number is available for this selection right now.',
      waiting: 'SMS has not arrived yet.',
      expired: 'The number expired before receiving an SMS.',
      too_many_waiting_requests: 'Too many SMS requests are pending. Please try again later.',
      insufficient_provider_balance: 'SMS number purchases are temporarily unavailable.',
      provider_account_not_activated: 'SMS number purchases are temporarily unavailable.',
      provider_service_blocked: 'This SMS service is temporarily unavailable.',
      minimum_rent_not_met: 'The selected rental period is below the minimum.',
      sms_received_cannot_cancel: 'This rental cannot be cancelled because an SMS has already been received.',
      cancel_limit_reached: 'This number can no longer be cancelled.',
    }

    return {
      status: error.status,
      message: publicMessages[error.status] || 'SMS request failed.',
    }
  }

  const message = error instanceof Error ? error.message : 'Unexpected SMS error'
  return { status: 'app_error', message }
}

function rateLimitError() {
  const error = new Error('Too many SMS requests. Please wait a moment and try again.')
  error.name = 'RateLimited'
  return error
}

function enforceMemoryRateLimit(userId: string, action: string, config: { limit: number; windowSeconds: number }) {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const resetAt = Math.floor(now / windowMs) * windowMs + windowMs
  const key = `${userId}:${action}:${resetAt}`
  const current = memoryRateLimits.get(key)

  for (const [itemKey, item] of memoryRateLimits.entries()) {
    if (item.resetAt <= now) memoryRateLimits.delete(itemKey)
  }

  if (!current) {
    memoryRateLimits.set(key, { count: 1, resetAt })
    return
  }

  if (current.count >= config.limit) {
    throw rateLimitError()
  }

  current.count += 1
}

function isMissingRateLimitTable(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === '42P01' || /sms_rate_limits|does not exist|schema cache/i.test(error?.message || '')
}

async function enforceRateLimit(admin: SupabaseAdmin, userId: string, action: string) {
  const config = RATE_LIMITS[action]
  if (!config) return

  const windowMs = config.windowSeconds * 1000
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString()

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: row, error: selectError } = await admin
      .from('sms_rate_limits')
      .select('id,count')
      .eq('user_id', userId)
      .eq('action', action)
      .eq('window_start', windowStart)
      .maybeSingle()

    if (selectError) {
      if (isMissingRateLimitTable(selectError)) {
        enforceMemoryRateLimit(userId, action, config)
        return
      }
      throw new Error('Unable to check SMS request limits')
    }

    if (!row) {
      const { error: insertError } = await admin
        .from('sms_rate_limits')
        .insert({
          user_id: userId,
          action,
          window_start: windowStart,
          count: 1,
        })

      if (!insertError) return
      if (isMissingRateLimitTable(insertError)) {
        enforceMemoryRateLimit(userId, action, config)
        return
      }
      if (insertError.code !== '23505') throw new Error('Unable to reserve SMS request limit')
      continue
    }

    const currentCount = Number(row.count || 0)
    if (currentCount >= config.limit) {
      throw rateLimitError()
    }

    const { data: updated, error: updateError } = await admin
      .from('sms_rate_limits')
      .update({ count: currentCount + 1, updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('count', currentCount)
      .select('id')
      .maybeSingle()

    if (!updateError && updated) return
    if (isMissingRateLimitTable(updateError)) {
      enforceMemoryRateLimit(userId, action, config)
      return
    }
  }

  throw rateLimitError()
}

async function requireAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('Missing authorization header')
  }

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    },
  )

  const { data: { user }, error } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''))
  if (error || !user) {
    throw new Error('Unauthorized')
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )

  return { user, supabaseAdmin }
}

async function calculatePrice(providerCostUsd: number, marginUsd: number, multiplier = 1): Promise<PriceBreakdown> {
  const exchangeRate = await getUsdToNgnRate()
  const totalMarginUsd = marginUsd * multiplier
  const totalProviderCostUsd = providerCostUsd * multiplier
  const totalCostUsd = totalProviderCostUsd + totalMarginUsd

  return {
    providerCostUsd: Number(totalProviderCostUsd.toFixed(4)),
    marginUsd: Number(totalMarginUsd.toFixed(4)),
    totalCostUsd: Number(totalCostUsd.toFixed(4)),
    exchangeRate: Number(exchangeRate.toFixed(4)),
    priceNgn: Math.ceil(totalCostUsd * exchangeRate),
  }
}

async function debitWallet(admin: SupabaseAdmin, userId: string, amount: number): Promise<WalletDebit> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: profile, error } = await admin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      throw new Error('Failed to fetch wallet balance')
    }

    const previousBalance = Number(profile.wallet_balance || 0)
    if (previousBalance < amount) {
      throw new Error(`Insufficient wallet balance. Required: NGN ${amount.toLocaleString()}, Available: NGN ${previousBalance.toLocaleString()}`)
    }

    const newBalance = previousBalance - amount
    const { data: updated, error: updateError } = await admin
      .from('profiles')
      .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('wallet_balance', previousBalance)
      .select('wallet_balance')
      .single()

    if (!updateError && updated) {
      return { previousBalance, newBalance }
    }
  }

  throw new Error('Wallet balance changed during purchase. Please try again.')
}

async function creditWalletOnce(
  admin: SupabaseAdmin,
  order: Pick<SmsOrder, 'id' | 'user_id' | 'reference' | 'price_ngn'>,
  description: string,
) {
  const amount = Number(order.price_ngn || 0)
  if (amount <= 0) return { refunded: false, reason: 'zero_amount' }

  const refundReference = `REFUND-${order.reference}`

  const { data: existingRefund } = await admin
    .from('transactions')
    .select('id,status')
    .eq('reference', refundReference)
    .maybeSingle()

  if (existingRefund) {
    return { refunded: false, reason: 'already_refunded', reference: refundReference }
  }

  const { data: pendingRefund, error: insertError } = await admin
    .from('transactions')
    .insert({
      user_id: order.user_id,
      type: 'refund',
      amount,
      balance_after: 0,
      description,
      reference: refundReference,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !pendingRefund) {
    const duplicate = insertError?.code === '23505'
    if (duplicate) return { refunded: false, reason: 'already_refunded', reference: refundReference }
    throw new Error(`Failed to reserve refund transaction: ${insertError?.message || 'unknown error'}`)
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: profile, error } = await admin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', order.user_id)
      .single()

    if (error || !profile) {
      throw new Error('Failed to fetch wallet balance for refund')
    }

    const currentBalance = Number(profile.wallet_balance || 0)
    const balanceAfter = currentBalance + amount

    const { data: updated, error: updateError } = await admin
      .from('profiles')
      .update({ wallet_balance: balanceAfter, updated_at: new Date().toISOString() })
      .eq('id', order.user_id)
      .eq('wallet_balance', currentBalance)
      .select('wallet_balance')
      .single()

    if (!updateError && updated) {
      await admin
        .from('transactions')
        .update({ status: 'completed', balance_after: balanceAfter })
        .eq('id', pendingRefund.id)

      await admin
        .from('sms_orders')
        .update({
          refunded_at: new Date().toISOString(),
          refund_amount_ngn: amount,
          refund_reference: refundReference,
        })
        .eq('id', order.id)
        .is('refunded_at', null)

      return { refunded: true, reference: refundReference, balance_after: balanceAfter }
    }
  }

  await admin
    .from('transactions')
    .update({ status: 'failed', description: `${description} - wallet credit failed` })
    .eq('id', pendingRefund.id)

  throw new Error('Wallet balance changed during refund. Please retry.')
}

async function recordPurchaseTransaction(
  admin: SupabaseAdmin,
  params: {
    userId: string
    reference: string
    amount: number
    balanceAfter: number
    description: string
  },
) {
  const { error } = await admin.from('transactions').insert({
    user_id: params.userId,
    type: 'purchase',
    amount: -params.amount,
    balance_after: params.balanceAfter,
    description: params.description,
    reference: params.reference,
    status: 'completed',
  })

  if (error) {
    throw new Error(`Failed to record purchase transaction: ${error.message}`)
  }
}

async function loadOtpServices(client: ReturnType<typeof createSmsBusClient>, countryId: number) {
  const [projects, prices] = await Promise.all([
    client.listProjects(),
    client.listPrices(countryId),
  ])

  const projectMap = new Map(projects.map((project) => [Number(project.id), project]))
  const otpMarginUsd = envNumber('SMSBUS_OTP_MARGIN_USD', 0.35)

  return Promise.all(
    prices.map(async (price) => {
      const project = projectMap.get(Number(price.project_id))
      const pricing = await calculatePrice(Number(price.cost || 0), otpMarginUsd)

      return {
        country_id: Number(price.country_id || countryId),
        country_code: price.code,
        project_id: Number(price.project_id),
        service_id: String(price.project_id),
        service_name: project?.title || `Service ${price.project_id}`,
        service_code: project?.code || null,
        provider_cost_usd: pricing.providerCostUsd,
        margin_usd: pricing.marginUsd,
        total_cost_usd: pricing.totalCostUsd,
        exchange_rate: pricing.exchangeRate,
        price_ngn: pricing.priceNgn,
        available_count: Number(price.total_count || 0),
      }
    }),
  )
}

async function findCountryId(client: ReturnType<typeof createSmsBusClient>, body: Record<string, unknown>) {
  if (body.country_id) return Number(body.country_id)

  const countryCode = String(body.country_code || 'us').toLowerCase()
  const countries = await client.listCountries()
  const country = countries.find((item) => item.code?.toLowerCase() === countryCode)

  if (!country) {
    throw new Error(`SMSBus country ${countryCode.toUpperCase()} is unavailable`)
  }

  return Number(country.id)
}

async function handleCountries() {
  const client = createSmsBusClient(getSmsBusToken())
  const countries = await client.listCountries()
  return json({ success: true, data: countries })
}

async function handleServices(body: Record<string, unknown>) {
  const client = createSmsBusClient(getSmsBusToken())
  const countryId = await findCountryId(client, body)
  const services = await loadOtpServices(client, countryId)
  return json({ success: true, data: services.filter((service) => service.available_count > 0) })
}

async function handleRentalAreas() {
  const client = createSmsBusClient(getSmsBusToken())
  const areas = await client.listRentalAreas()
  const rentalMarginUsd = envNumber('SMSBUS_RENTAL_MARGIN_USD', 2)

  const enriched = await Promise.all(
    areas.map(async (area: SmsBusRentalArea) => {
      const providerMonthlyUsd = Number(area.unit_price || 0) / 100
      const pricing = await calculatePrice(providerMonthlyUsd, rentalMarginUsd)

      return {
        ...area,
        provider_monthly_usd: pricing.providerCostUsd,
        margin_monthly_usd: pricing.marginUsd,
        total_monthly_usd: pricing.totalCostUsd,
        exchange_rate: pricing.exchangeRate,
        price_ngn_monthly: pricing.priceNgn,
      }
    }),
  )

  return json({ success: true, data: enriched })
}

async function handleHealth() {
  const token = getSmsBusToken()
  if (!token) {
    return json({ success: true, configured: false, valid: false, balance: null })
  }

  try {
    const client = createSmsBusClient(token)
    const balance = await client.getBalance()
    return json({ success: true, configured: true, valid: true, balance })
  } catch (error) {
    if (error instanceof SmsBusApiError) {
      return json({
        success: true,
        configured: true,
        valid: false,
        balance: null,
      })
    }

    throw error
  }
}

async function handleOrders(admin: SupabaseAdmin, userId: string) {
  const { data, error } = await admin
    .from('sms_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    throw new Error(`Failed to load SMS orders: ${error.message}`)
  }

  return json({ success: true, data: data || [] })
}

async function findOtpPrice(client: ReturnType<typeof createSmsBusClient>, countryId: number, projectId: number) {
  const services = await loadOtpServices(client, countryId)
  const service = services.find((item) => Number(item.project_id) === Number(projectId))

  if (!service) {
    throw new SmsBusApiError(50001, 'No service available')
  }

  if (service.available_count < 1) {
    throw new SmsBusApiError(50002, 'No number available')
  }

  return service
}

async function handleCreateOtp(admin: SupabaseAdmin, userId: string, body: Record<string, unknown>) {
  const idempotencyKey = String(body.idempotency_key || '')
  if (!idempotencyKey || idempotencyKey.length < 10) {
    throw new Error('Valid idempotency_key is required')
  }

  const projectId = Number(body.project_id || body.service_id)
  if (!projectId) {
    throw new Error('project_id is required')
  }

  const { data: existingOrder } = await admin
    .from('sms_orders')
    .select('*')
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (existingOrder) {
    return json({ success: true, data: existingOrder, idempotency_hit: true })
  }

  const client = createSmsBusClient(getSmsBusToken())
  const countryId = await findCountryId(client, body)
  const service = await findOtpPrice(client, countryId, projectId)

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    throw new Error('Failed to fetch wallet balance')
  }

  if (Number(profile.wallet_balance || 0) < service.price_ngn) {
    throw new Error(`Insufficient wallet balance. Required: NGN ${service.price_ngn.toLocaleString()}`)
  }

  const providerNumber = await client.getNumber(countryId, projectId)
  const requestId = String(providerNumber.request_id)
  const reference = generateReference('SMS')
  let debit: WalletDebit | null = null

  try {
    debit = await debitWallet(admin, userId, service.price_ngn)

    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString()
    const { data: order, error: orderError } = await admin
      .from('sms_orders')
      .insert({
        user_id: userId,
        reference,
        idempotency_key: idempotencyKey,
        order_type: 'otp',
        provider_request_id: requestId,
        service_id: String(projectId),
        service_name: service.service_name,
        country_id: countryId,
        country_code: service.country_code,
        phone_number: providerNumber.number.startsWith('+') ? providerNumber.number : `+${providerNumber.number}`,
        raw_phone_number: providerNumber.number,
        provider_cost_usd: service.provider_cost_usd,
        margin_usd: service.margin_usd,
        total_cost_usd: service.total_cost_usd,
        exchange_rate: service.exchange_rate,
        price_ngn: service.price_ngn,
        status: 'active',
        expires_at: expiresAt,
        can_cancel_until: expiresAt,
        provider_payload: { provider_number: providerNumber, service },
      })
      .select()
      .single()

    if (orderError || !order) {
      throw new Error(`Failed to create SMS order: ${orderError?.message || 'unknown error'}`)
    }

    await recordPurchaseTransaction(admin, {
      userId,
      reference,
      amount: service.price_ngn,
      balanceAfter: debit.newBalance,
      description: `SMS OTP: ${service.service_name}`,
    })

    return json({ success: true, data: order, new_balance: debit.newBalance })
  } catch (error) {
    try {
      await client.cancelRequest(requestId)
    } catch (cancelError) {
      console.error('SMSBus cancel after create failure:', friendlyError(cancelError))
    }

    if (debit) {
      await creditWalletOnce(
        admin,
        { id: '00000000-0000-0000-0000-000000000000', user_id: userId, reference, price_ngn: service.price_ngn },
        `Auto-refund for failed SMS OTP order: ${service.service_name}`,
      )
    }

    throw error
  }
}

async function loadOwnedOrder(admin: SupabaseAdmin, userId: string, orderId: string): Promise<SmsOrder> {
  const { data, error } = await admin
    .from('sms_orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw new Error('SMS order not found')
  }

  return data as SmsOrder
}

async function handleCheckOtp(admin: SupabaseAdmin, userId: string, body: Record<string, unknown>) {
  const order = await loadOwnedOrder(admin, userId, String(body.order_id || ''))
  if (order.order_type !== 'otp') throw new Error('Order is not an OTP order')

  if (TERMINAL_STATUSES.includes(order.status)) {
    return json({ success: true, data: order })
  }

  const requestId = order.provider_request_id
  if (!requestId) throw new Error('Order is missing SMSBus request id')

  const client = createSmsBusClient(getSmsBusToken())

  try {
    const smsContent = await client.getSms(requestId)
    const messages = Array.isArray(order.messages) ? order.messages : []
    const alreadyStored = messages.some((message) => message.content === smsContent)
    const nextMessages = alreadyStored
      ? messages
      : [
        ...messages,
        {
          content: smsContent,
          code: extractSmsCode(smsContent),
          received_at: new Date().toISOString(),
        },
      ]

    const { data: updated, error } = await admin
      .from('sms_orders')
      .update({
        status: 'completed',
        messages: nextMessages,
        completed_at: new Date().toISOString(),
        last_provider_response: { code: 200, data: smsContent },
      })
      .eq('id', order.id)
      .select()
      .single()

    if (error) throw new Error(`Failed to store SMS: ${error.message}`)

    return json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof SmsBusApiError && error.status === 'waiting') {
      await admin
        .from('sms_orders')
        .update({
          status: 'waiting',
          last_provider_response: {
            code: error.code,
            message: error.providerMessage,
            status: error.status,
          },
        })
        .eq('id', order.id)

      return json({ success: true, data: { ...order, status: 'waiting' }, waiting: true })
    }

    if (error instanceof SmsBusApiError && error.status === 'expired') {
      await admin
        .from('sms_orders')
        .update({
          status: 'expired',
          error_code: String(error.code),
          error_message: error.providerMessage,
          last_provider_response: {
            code: error.code,
            message: error.providerMessage,
            status: error.status,
          },
        })
        .eq('id', order.id)

      const refund = await creditWalletOnce(admin, order, `Auto-refund for expired SMS OTP order: ${order.reference}`)
      return json({ success: true, data: { ...order, status: 'expired' }, refund })
    }

    throw error
  }
}

async function handleCancelOtp(admin: SupabaseAdmin, userId: string, body: Record<string, unknown>) {
  const order = await loadOwnedOrder(admin, userId, String(body.order_id || ''))
  if (order.order_type !== 'otp') throw new Error('Order is not an OTP order')

  if (TERMINAL_STATUSES.includes(order.status)) {
    return json({ success: true, data: order, already_final: true })
  }

  const requestId = order.provider_request_id
  if (!requestId) throw new Error('Order is missing SMSBus request id')

  const client = createSmsBusClient(getSmsBusToken())
  await client.cancelRequest(requestId)

  const { data: updated, error } = await admin
    .from('sms_orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      last_provider_response: { code: 200, message: 'Cancel successful' },
    })
    .eq('id', order.id)
    .select()
    .single()

  if (error) throw new Error(`Failed to cancel SMS order: ${error.message}`)

  const refund = await creditWalletOnce(admin, order, `Refund for cancelled SMS OTP order: ${order.reference}`)
  return json({ success: true, data: updated, refund })
}

async function findRentalArea(client: ReturnType<typeof createSmsBusClient>, areaCode: string) {
  const areas = await client.listRentalAreas()
  const area = areas.find((item) => item.area_code.toUpperCase() === areaCode.toUpperCase())
  if (!area) throw new SmsBusApiError(50401, 'No available area found.')
  if (Number(area.total || 0) < 1) throw new SmsBusApiError(50004, 'Not enough numbers available')
  return area
}

async function handleRentNumber(admin: SupabaseAdmin, userId: string, body: Record<string, unknown>) {
  const idempotencyKey = String(body.idempotency_key || '')
  if (!idempotencyKey || idempotencyKey.length < 10) {
    throw new Error('Valid idempotency_key is required')
  }

  const { data: existingOrder } = await admin
    .from('sms_orders')
    .select('*')
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (existingOrder) {
    return json({ success: true, data: existingOrder, idempotency_hit: true })
  }

  const areaCode = String(body.area_code || 'US').toUpperCase()
  const requestedMonths = Math.min(Math.max(Number(body.months || 1), 1), 12)
  const client = createSmsBusClient(getSmsBusToken())
  const area = await findRentalArea(client, areaCode)
  const months = Math.max(requestedMonths, Number(area.min_month || 1))
  const providerMonthlyUsd = Number(area.unit_price || 0) / 100
  const rentalMarginUsd = envNumber('SMSBUS_RENTAL_MARGIN_USD', 2)
  const pricing = await calculatePrice(providerMonthlyUsd, rentalMarginUsd, months)

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .single()

  if (profileError || !profile) throw new Error('Failed to fetch wallet balance')
  if (Number(profile.wallet_balance || 0) < pricing.priceNgn) {
    throw new Error(`Insufficient wallet balance. Required: NGN ${pricing.priceNgn.toLocaleString()}`)
  }

  const providerRental = await client.rentNumber(area.area_code, months)
  const reference = generateReference('SMSR')
  let debit: WalletDebit | null = null

  try {
    debit = await debitWallet(admin, userId, pricing.priceNgn)

    const { data: order, error: orderError } = await admin
      .from('sms_orders')
      .insert({
        user_id: userId,
        reference,
        idempotency_key: idempotencyKey,
        order_type: 'rental',
        provider_order_id: providerRental.order_id,
        service_id: area.area_code,
        service_name: `${area.area_title} rental number`,
        area_code: providerRental.area_code,
        country_code: providerRental.area_code.toLowerCase(),
        phone_number: `+${providerRental.dialing_code}${providerRental.mobile_number}`,
        raw_phone_number: providerRental.mobile_number,
        dialing_code: providerRental.dialing_code,
        rent_months: months,
        provider_cost_usd: pricing.providerCostUsd,
        margin_usd: pricing.marginUsd,
        total_cost_usd: pricing.totalCostUsd,
        exchange_rate: pricing.exchangeRate,
        price_ngn: pricing.priceNgn,
        status: 'active',
        expires_at: providerRental.expire_at,
        keep_at: providerRental.keep_at,
        can_cancel_until: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        provider_payload: { provider_rental: providerRental, area },
      })
      .select()
      .single()

    if (orderError || !order) {
      throw new Error(`Failed to create rental order: ${orderError?.message || 'unknown error'}`)
    }

    await recordPurchaseTransaction(admin, {
      userId,
      reference,
      amount: pricing.priceNgn,
      balanceAfter: debit.newBalance,
      description: `SMS rental: ${area.area_title} (${months} month${months === 1 ? '' : 's'})`,
    })

    return json({ success: true, data: order, new_balance: debit.newBalance })
  } catch (error) {
    try {
      await client.cancelRental(providerRental.order_id)
    } catch (cancelError) {
      console.error('SMSBus rental cancel after create failure:', friendlyError(cancelError))
    }

    if (debit) {
      await creditWalletOnce(
        admin,
        { id: '00000000-0000-0000-0000-000000000000', user_id: userId, reference, price_ngn: pricing.priceNgn },
        `Auto-refund for failed SMS rental order: ${area.area_title}`,
      )
    }

    throw error
  }
}

function normalizeRentalSmsResponse(raw: unknown) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'object' && raw !== null) {
    const record = raw as Record<string, unknown>
    if (Array.isArray(record.data)) return record.data
    if (Array.isArray(record.list)) return record.list
    if (typeof record.content === 'string') return [record]
  }
  return []
}

async function handleRentalSms(admin: SupabaseAdmin, userId: string, body: Record<string, unknown>) {
  const order = await loadOwnedOrder(admin, userId, String(body.order_id || ''))
  if (order.order_type !== 'rental') throw new Error('Order is not a rental order')
  if (!order.area_code || !order.raw_phone_number) throw new Error('Rental order is missing provider phone metadata')

  const client = createSmsBusClient(getSmsBusToken())
  const mode = String(body.mode || 'latest')
  const raw = mode === 'history'
    ? await client.listRentalSms(order.area_code, order.raw_phone_number, Number(body.page_num || 1), Number(body.page_size || 20))
    : await client.getRentalSms(order.area_code, order.raw_phone_number)

  const incoming = normalizeRentalSmsResponse(raw)
  const currentMessages = Array.isArray(order.messages) ? order.messages : []
  const seen = new Set(currentMessages.map((message) => `${message.content || ''}:${message.receive_at || message.received_at || ''}`))
  const nextMessages = [...currentMessages]

  for (const message of incoming) {
    const item = message as Record<string, unknown>
    const key = `${item.content || ''}:${item.receive_at || item.received_at || ''}`
    if (!seen.has(key)) {
      nextMessages.push({
        ...item,
        code: typeof item.content === 'string' ? extractSmsCode(item.content) : null,
        received_at: item.receive_at || item.received_at || new Date().toISOString(),
      })
    }
  }

  const { data: updated, error } = await admin
    .from('sms_orders')
    .update({
      messages: nextMessages,
      last_provider_response: { mode, raw },
    })
    .eq('id', order.id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update rental SMS messages: ${error.message}`)

  return json({ success: true, data: updated, messages: nextMessages })
}

async function handleRenewRental(admin: SupabaseAdmin, userId: string, body: Record<string, unknown>) {
  const order = await loadOwnedOrder(admin, userId, String(body.order_id || ''))
  if (order.order_type !== 'rental') throw new Error('Order is not a rental order')
  if (!order.area_code || !order.raw_phone_number) throw new Error('Rental order is missing provider phone metadata')
  if (TERMINAL_STATUSES.includes(order.status)) throw new Error('This rental order is no longer active')

  const months = Math.min(Math.max(Number(body.months || 1), 1), 12)
  const client = createSmsBusClient(getSmsBusToken())
  const area = await findRentalArea(client, order.area_code)
  const providerMonthlyUsd = Number(area.unit_price || 0) / 100
  const rentalMarginUsd = envNumber('SMSBUS_RENTAL_MARGIN_USD', 2)
  const pricing = await calculatePrice(providerMonthlyUsd, rentalMarginUsd, months)
  const reference = generateReference('SMSR-RENEW')
  const debit = await debitWallet(admin, userId, pricing.priceNgn)

  try {
    const renewal = await client.renewRental(order.area_code, order.raw_phone_number, months)

    const { data: updated, error } = await admin
      .from('sms_orders')
      .update({
        provider_order_id: renewal.order_id,
        rent_months: Number(order.rent_months || 0) + months,
        expires_at: renewal.expire_at,
        keep_at: renewal.keep_at,
        provider_payload: {
          ...order.provider_payload,
          last_renewal: renewal,
          last_renewal_pricing: pricing,
        },
        last_provider_response: { renewal },
      })
      .eq('id', order.id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update rental renewal: ${error.message}`)

    await recordPurchaseTransaction(admin, {
      userId,
      reference,
      amount: pricing.priceNgn,
      balanceAfter: debit.newBalance,
      description: `SMS rental renewal: ${order.service_name} (${months} month${months === 1 ? '' : 's'})`,
    })

    return json({ success: true, data: updated, new_balance: debit.newBalance })
  } catch (error) {
    await creditWalletOnce(
      admin,
      { id: '00000000-0000-0000-0000-000000000000', user_id: order.user_id, reference, price_ngn: pricing.priceNgn },
      `Auto-refund for failed SMS rental renewal: ${order.reference}`,
    )
    throw error
  }
}

async function handleCancelRental(admin: SupabaseAdmin, userId: string, body: Record<string, unknown>) {
  const order = await loadOwnedOrder(admin, userId, String(body.order_id || ''))
  if (order.order_type !== 'rental') throw new Error('Order is not a rental order')

  if (TERMINAL_STATUSES.includes(order.status)) {
    return json({ success: true, data: order, already_final: true })
  }

  if (!order.provider_order_id) throw new Error('Rental order is missing SMSBus provider order id')

  const client = createSmsBusClient(getSmsBusToken())
  await client.cancelRental(order.provider_order_id)

  const { data: updated, error } = await admin
    .from('sms_orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      last_provider_response: { code: 200, message: 'Cancel successful' },
    })
    .eq('id', order.id)
    .select()
    .single()

  if (error) throw new Error(`Failed to cancel rental order: ${error.message}`)

  const refund = await creditWalletOnce(admin, order, `Refund for cancelled SMS rental order: ${order.reference}`)
  return json({ success: true, data: updated, refund })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user, supabaseAdmin } = await requireAuthenticatedUser(req)
    const body = req.method === 'GET' ? {} : await req.json().catch(() => ({}))
    const action = String((body as Record<string, unknown>).action || '')
    await enforceRateLimit(supabaseAdmin, user.id, action)

    switch (action) {
      case 'health':
        return await handleHealth()
      case 'countries':
        return await handleCountries()
      case 'services':
        return await handleServices(body)
      case 'rental_areas':
        return await handleRentalAreas()
      case 'orders':
        return await handleOrders(supabaseAdmin, user.id)
      case 'create_otp':
        return await handleCreateOtp(supabaseAdmin, user.id, body)
      case 'check_otp':
        return await handleCheckOtp(supabaseAdmin, user.id, body)
      case 'cancel_otp':
        return await handleCancelOtp(supabaseAdmin, user.id, body)
      case 'rent_number':
        return await handleRentNumber(supabaseAdmin, user.id, body)
      case 'rental_sms':
        return await handleRentalSms(supabaseAdmin, user.id, body)
      case 'renew_rental':
        return await handleRenewRental(supabaseAdmin, user.id, body)
      case 'cancel_rental':
        return await handleCancelRental(supabaseAdmin, user.id, body)
      default:
        throw new Error('Unsupported SMSBus action')
    }
  } catch (error) {
    const normalized = friendlyError(error)
    const message = error instanceof Error ? error.message : ''
    const status = message === 'Unauthorized'
      ? 401
      : error instanceof Error && error.name === 'RateLimited'
        ? 429
        : normalized.message === 'SMSBus API key is not configured'
          ? 503
          : 400

    console.error('SMSBus function error:', {
      status: normalized.status,
      message: normalized.message,
    })

    return json({ success: false, error: normalized.message }, status)
  }
})
