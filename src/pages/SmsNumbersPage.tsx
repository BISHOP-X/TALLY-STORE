import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactCountryFlag from 'react-country-flag'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock3,
  Copy,
  Inbox,
  KeyRound,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import NavbarAuth from '@/components/NavbarAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/SimpleAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const SMS_TEST_ADMIN_EMAIL = 'wisdomthedev@gmail.com'
const NAIRA = '\u20a6'

type SmsApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
  configured?: boolean
  valid?: boolean
  balance?: SmsProviderBalance | null
  provider_status?: string
  provider_code?: number
  provider_message?: string
  waiting?: boolean
  idempotency_hit?: boolean
  new_balance?: number
  refund?: unknown
  messages?: SmsMessage[]
}

type SmsProviderBalance = {
  frozen: number
  balance: number
}

type SmsService = {
  service_id: string
  project_id: number
  service_name: string
  service_code?: string | null
  country_id: number
  country_code?: string | null
  provider_cost_usd: number
  margin_usd: number
  total_cost_usd: number
  exchange_rate: number
  price_ngn: number
  available_count: number
}

type SmsRentalArea = {
  area_code: string
  area_title: string
  unit_price: number
  min_month: number
  total: number
  provider_monthly_usd: number
  margin_monthly_usd: number
  total_monthly_usd: number
  exchange_rate: number
  price_ngn_monthly: number
}

type SmsMessage = {
  content?: string
  code?: string | null
  received_at?: string
  receive_at?: string
}

type SmsOrder = {
  id: string
  reference: string
  order_type: 'otp' | 'rental'
  service_name: string
  phone_number?: string | null
  raw_phone_number?: string | null
  area_code?: string | null
  price_ngn: number
  status: string
  messages: SmsMessage[]
  expires_at?: string | null
  keep_at?: string | null
  rent_months?: number | null
  created_at: string
}

type SmsTab = 'otp' | 'rental' | 'orders'

function formatNaira(value: number) {
  return `${NAIRA}${Number(value || 0).toLocaleString('en-NG')}`
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'
  return date.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function isTerminalStatus(status: string) {
  return ['completed', 'cancelled', 'expired', 'failed'].includes(status)
}

function statusClass(status: string) {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
  if (status === 'cancelled' || status === 'expired' || status === 'failed') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200'
  }
  return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200'
}

async function invokeSms<T>(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke<SmsApiResponse<T>>('smsbus', {
    body: { action, ...payload },
  })

  if (error) {
    throw new Error(error.message || 'SMS request failed')
  }

  if (!data?.success) {
    throw new Error(data?.error || 'SMS request failed')
  }

  return data
}

function SmsComingSoonBlocker() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="overflow-hidden rounded-[2rem] border-0 bg-slate-950 text-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
        <CardContent className="relative p-6 sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(103,232,249,0.2),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(167,139,250,0.24),transparent_30%)]" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-3xl bg-white/10">
                <ReactCountryFlag countryCode="US" svg className="text-3xl" aria-label="United States" />
              </span>
              <Badge className="rounded-full bg-cyan-300/15 px-4 py-2 text-cyan-100 hover:bg-cyan-300/15">
                Coming very soon
              </Badge>
            </div>

            <h1 className="mt-10 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Buy US numbers for SMS verification.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              This purchase flow is being staged for launch. You will be able to buy US numbers directly
              from your TallyStore wallet once testing is complete.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: PhoneCall, label: 'US numbers' },
                { icon: MessageSquareText, label: 'SMS inbox' },
                { icon: Wallet, label: 'Wallet checkout' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <Icon className="h-5 w-5 text-cyan-200" />
                    <p className="mt-3 text-sm font-bold">{item.label}</p>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="h-12 rounded-2xl bg-white px-5 text-slate-950 hover:bg-cyan-50">
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Back to dashboard
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-2xl border-white/20 bg-white/10 px-5 text-white hover:bg-white/15 hover:text-white"
              >
                <Link to="/wallet">
                  <Wallet className="h-4 w-4" />
                  Top up wallet
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card className="rounded-[1.75rem] border-0 bg-white shadow-card dark:bg-card">
          <CardContent className="p-6">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-black tracking-tight">Private beta is locked</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-muted-foreground">
              Public access stays blocked until the SMSBus integration passes wallet, provider, refund,
              and inbox testing.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-0 bg-white shadow-card dark:bg-card">
          <CardContent className="space-y-4 p-6">
            {[
              { icon: Clock3, text: 'Live number availability' },
              { icon: Bell, text: 'SMS arrival notifications' },
              { icon: ShieldCheck, text: 'One-time refund protection' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.text} className="flex items-center gap-3 text-sm font-semibold">
                  <span className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-muted dark:text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  {item.text}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl bg-slate-100 p-6 text-center dark:bg-muted">
      <Inbox className="mx-auto h-8 w-8 text-slate-400" />
      <p className="mt-3 text-sm font-black">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-muted-foreground">{body}</p>
    </div>
  )
}

function SmsOrderCard({
  order,
  busy,
  onCheck,
  onCancel,
  onLatest,
  onHistory,
  onRenew,
}: {
  order: SmsOrder
  busy: boolean
  onCheck: (order: SmsOrder) => void
  onCancel: (order: SmsOrder) => void
  onLatest: (order: SmsOrder) => void
  onHistory: (order: SmsOrder) => void
  onRenew: (order: SmsOrder) => void
}) {
  const lastMessage = order.messages?.[order.messages.length - 1]

  const copyPhone = async () => {
    if (!order.phone_number) return
    await navigator.clipboard.writeText(order.phone_number)
    toast.success('Phone number copied')
  }

  return (
    <Card className="rounded-[1.5rem] border-0 bg-white shadow-card dark:bg-card">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn('rounded-full px-3 py-1 capitalize hover:bg-current/10', statusClass(order.status))}>
                {order.status}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 uppercase">
                {order.order_type}
              </Badge>
            </div>
            <h3 className="mt-3 text-lg font-black tracking-tight">{order.service_name}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">{order.reference}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black">{formatNaira(order.price_ngn)}</p>
            <p className="text-xs text-slate-500 dark:text-muted-foreground">{formatDate(order.created_at)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-100 p-4 dark:bg-muted">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
              Phone
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="truncate text-lg font-black">{order.phone_number || 'Not assigned'}</p>
              {order.phone_number && (
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-xl" onClick={copyPhone}>
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-100 p-4 dark:bg-muted">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
              Last SMS
            </p>
            <p className="mt-2 min-h-7 text-sm font-semibold">
              {lastMessage?.code || lastMessage?.content || 'No message yet'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {order.order_type === 'otp' && !isTerminalStatus(order.status) && (
            <>
              <Button type="button" className="rounded-2xl" disabled={busy} onClick={() => onCheck(order)}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Check SMS
              </Button>
              <Button type="button" variant="outline" className="rounded-2xl" disabled={busy} onClick={() => onCancel(order)}>
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            </>
          )}

          {order.order_type === 'rental' && !isTerminalStatus(order.status) && (
            <>
              <Button type="button" className="rounded-2xl" disabled={busy} onClick={() => onLatest(order)}>
                <MessageSquareText className="h-4 w-4" />
                Latest SMS
              </Button>
              <Button type="button" variant="outline" className="rounded-2xl" disabled={busy} onClick={() => onHistory(order)}>
                <Inbox className="h-4 w-4" />
                History
              </Button>
              <Button type="button" variant="outline" className="rounded-2xl" disabled={busy} onClick={() => onRenew(order)}>
                <RefreshCw className="h-4 w-4" />
                Renew
              </Button>
              <Button type="button" variant="outline" className="rounded-2xl" disabled={busy} onClick={() => onCancel(order)}>
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
        </div>

        {order.order_type === 'rental' && (
          <div className="mt-4 grid gap-2 text-xs text-slate-500 dark:text-muted-foreground sm:grid-cols-2">
            <p>Expires: {formatDate(order.expires_at)}</p>
            <p>Renew before: {formatDate(order.keep_at)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SmsAdminTestingSurface() {
  const [activeTab, setActiveTab] = useState<SmsTab>('otp')
  const [health, setHealth] = useState<SmsApiResponse<never> | null>(null)
  const [services, setServices] = useState<SmsService[]>([])
  const [areas, setAreas] = useState<SmsRentalArea[]>([])
  const [orders, setOrders] = useState<SmsOrder[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedAreaCode, setSelectedAreaCode] = useState('US')
  const [rentalMonths, setRentalMonths] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const configured = health?.configured === true
  const providerReady = configured && health?.valid !== false
  const selectedService = services.find((service) => service.service_id === selectedServiceId)
  const selectedArea = areas.find((area) => area.area_code === selectedAreaCode)
  const activeOrders = useMemo(
    () => orders.filter((order) => !isTerminalStatus(order.status)),
    [orders],
  )

  const loadConsole = useCallback(async () => {
    setLoading(true)
    try {
      const [healthResult, orderResult] = await Promise.all([
        invokeSms<never>('health'),
        invokeSms<SmsOrder[]>('orders'),
      ])

      setHealth(healthResult)
      setOrders(orderResult.data || [])

      if (healthResult.configured && healthResult.valid !== false) {
        const [serviceResult, areaResult] = await Promise.all([
          invokeSms<SmsService[]>('services', { country_code: 'us' }),
          invokeSms<SmsRentalArea[]>('rental_areas'),
        ])

        setServices(serviceResult.data || [])
        setAreas(areaResult.data || [])

        if (serviceResult.data?.[0]) {
          setSelectedServiceId((current) => current || serviceResult.data?.[0]?.service_id || '')
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load SMS console')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConsole()
  }, [loadConsole])

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusyAction(label)
    try {
      await action()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'SMS action failed')
    } finally {
      setBusyAction(null)
    }
  }

  const refreshOrders = async () => {
    const result = await invokeSms<SmsOrder[]>('orders')
    setOrders(result.data || [])
  }

  const buyOtp = () => runAction('buy-otp', async () => {
    if (!selectedService) throw new Error('Select an OTP service first')

    const result = await invokeSms<SmsOrder>('create_otp', {
      country_id: selectedService.country_id,
      project_id: selectedService.project_id,
      idempotency_key: `sms-otp-${selectedService.project_id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    })

    toast.success('OTP number purchased')
    if (typeof result.new_balance === 'number') {
      window.dispatchEvent(new Event('transactionAdded'))
    }
    await refreshOrders()
    setActiveTab('orders')
  })

  const rentNumber = () => runAction('rent-number', async () => {
    if (!selectedArea) throw new Error('Select a rental area first')

    const result = await invokeSms<SmsOrder>('rent_number', {
      area_code: selectedArea.area_code,
      months: rentalMonths,
      idempotency_key: `sms-rental-${selectedArea.area_code}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    })

    toast.success('Rental number purchased')
    if (typeof result.new_balance === 'number') {
      window.dispatchEvent(new Event('transactionAdded'))
    }
    await refreshOrders()
    setActiveTab('orders')
  })

  const checkOtp = (order: SmsOrder) => runAction(`check-${order.id}`, async () => {
    const result = await invokeSms<SmsOrder>('check_otp', { order_id: order.id })
    toast.success(result.waiting ? 'Still waiting for SMS' : 'SMS status updated')
    await refreshOrders()
  })

  const cancelOrder = (order: SmsOrder) => runAction(`cancel-${order.id}`, async () => {
    await invokeSms<SmsOrder>(order.order_type === 'otp' ? 'cancel_otp' : 'cancel_rental', { order_id: order.id })
    toast.success('Order cancelled')
    window.dispatchEvent(new Event('transactionAdded'))
    await refreshOrders()
  })

  const loadRentalSms = (order: SmsOrder, mode: 'latest' | 'history') => runAction(`${mode}-${order.id}`, async () => {
    await invokeSms<SmsOrder>('rental_sms', { order_id: order.id, mode })
    toast.success(mode === 'latest' ? 'Latest SMS checked' : 'SMS history loaded')
    await refreshOrders()
  })

  const renewRental = (order: SmsOrder) => runAction(`renew-${order.id}`, async () => {
    const result = await invokeSms<SmsOrder>('renew_rental', { order_id: order.id, months: 1 })
    toast.success('Rental renewed for one month')
    if (typeof result.new_balance === 'number') {
      window.dispatchEvent(new Event('transactionAdded'))
    }
    await refreshOrders()
  })

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <Card className="overflow-hidden rounded-[2rem] border-0 bg-[linear-gradient(145deg,#5637aa,#111827)] text-white shadow-[0_28px_80px_rgba(88,64,179,0.28)]">
        <CardContent className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-3xl bg-white/10">
                <ReactCountryFlag countryCode="US" svg className="text-3xl" aria-label="United States" />
              </span>
              <div>
                <Badge className="rounded-full bg-cyan-300/15 px-4 py-2 text-cyan-100 hover:bg-cyan-300/15">
                  Admin test mode
                </Badge>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">SMS US Numbers</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="h-11 rounded-2xl bg-white px-5 text-[#5637aa] hover:bg-cyan-50" onClick={loadConsole}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
              <Button asChild className="h-11 rounded-2xl bg-white/10 px-5 text-white hover:bg-white/15 hover:text-white">
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-white/8 p-5">
              <KeyRound className="h-6 w-6 text-cyan-200" />
              <p className="mt-4 text-sm font-semibold text-slate-300">API secret</p>
              <p className="mt-1 text-xl font-black">
                {!configured ? 'Missing' : health?.valid === false ? 'Invalid' : 'Configured'}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/8 p-5">
              <Wallet className="h-6 w-6 text-cyan-200" />
              <p className="mt-4 text-sm font-semibold text-slate-300">Provider balance</p>
              <p className="mt-1 text-xl font-black">
                {health?.balance ? `$${Number(health.balance.balance || 0).toFixed(2)}` : 'Unavailable'}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/8 p-5">
              <PhoneCall className="h-6 w-6 text-cyan-200" />
              <p className="mt-4 text-sm font-semibold text-slate-300">US OTP services</p>
              <p className="mt-1 text-xl font-black">{services.length.toLocaleString()}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/8 p-5">
              <Inbox className="h-6 w-6 text-cyan-200" />
              <p className="mt-4 text-sm font-semibold text-slate-300">Active orders</p>
              <p className="mt-1 text-xl font-black">{activeOrders.length.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {(!configured || health?.valid === false) && (
        <Card className="rounded-[1.75rem] border border-amber-200 bg-amber-50 shadow-card dark:border-amber-500/20 dark:bg-amber-500/10">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {!configured ? 'SMSBus API key is not configured' : 'SMSBus API key was rejected'}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-muted-foreground">
                {!configured
                  ? 'Add the `SMSBUS_API_KEY` Supabase secret to enable live provider calls.'
                  : `SMSBus returned ${health.provider_message || health.provider_status || 'an authentication error'}. Paste the full API token and redeploy before buying numbers.`}
              </p>
            </div>
            <Badge className="w-fit rounded-full bg-amber-200 px-4 py-2 text-amber-900 hover:bg-amber-200">
              {!configured ? 'Backend ready' : 'Needs valid token'}
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'otp' as const, label: 'OTP numbers' },
          { id: 'rental' as const, label: 'Rental numbers' },
          { id: 'orders' as const, label: 'Orders' },
        ].map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant={activeTab === tab.id ? 'default' : 'outline'}
            className="rounded-2xl"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'otp' && (
        <Card className="rounded-[1.75rem] border-0 bg-white shadow-card dark:bg-card">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Buy OTP Number</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                  Backend re-fetches live SMSBus price and stock before every purchase.
                </p>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                United States
              </Badge>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                  Service
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(event) => setSelectedServiceId(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-background"
                  disabled={!providerReady || services.length === 0}
                >
                  {services.length === 0 ? (
                    <option value="">No services loaded</option>
                  ) : services.map((service) => (
                    <option key={service.service_id} value={service.service_id}>
                      {service.service_name} - {formatNaira(service.price_ngn)} - {service.available_count} available
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-3xl bg-slate-100 p-4 dark:bg-muted">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                  Backend price
                </p>
                <p className="mt-2 text-2xl font-black">{selectedService ? formatNaira(selectedService.price_ngn) : 'Not loaded'}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                  {selectedService ? `${selectedService.available_count} numbers available` : 'Live provider data required'}
                </p>
              </div>
            </div>

            <Button
              type="button"
              className="mt-6 h-12 rounded-2xl px-6"
              disabled={!providerReady || !selectedService || busyAction === 'buy-otp'}
              onClick={buyOtp}
            >
              {busyAction === 'buy-otp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
              Buy OTP Number
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'rental' && (
        <Card className="rounded-[1.75rem] border-0 bg-white shadow-card dark:bg-card">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Rent US Number</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                  Rental numbers include reusable inbox, expiry tracking, renewal, and provider cancel handling.
                </p>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Admin only
              </Badge>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_280px]">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                  Area
                </label>
                <select
                  value={selectedAreaCode}
                  onChange={(event) => setSelectedAreaCode(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-background"
                  disabled={!providerReady || areas.length === 0}
                >
                  {areas.length === 0 ? (
                    <option value="US">No areas loaded</option>
                  ) : areas.map((area) => (
                    <option key={area.area_code} value={area.area_code}>
                      {area.area_title} - {formatNaira(area.price_ngn_monthly)}/mo - {area.total} available
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                  Months
                </label>
                <Input
                  type="number"
                  min={selectedArea?.min_month || 1}
                  max={12}
                  value={rentalMonths}
                  onChange={(event) => setRentalMonths(Number(event.target.value || 1))}
                  className="mt-2 h-12 rounded-2xl"
                />
              </div>

              <div className="rounded-3xl bg-slate-100 p-4 dark:bg-muted">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                  Estimated price
                </p>
                <p className="mt-2 text-2xl font-black">
                  {selectedArea ? formatNaira(selectedArea.price_ngn_monthly * rentalMonths) : 'Not loaded'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                  Backend confirms final price before debit.
                </p>
              </div>
            </div>

            <Button
              type="button"
              className="mt-6 h-12 rounded-2xl px-6"
              disabled={!providerReady || !selectedArea || busyAction === 'rent-number'}
              onClick={rentNumber}
            >
              {busyAction === 'rent-number' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
              Rent Number
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <EmptyState title="No SMS orders yet" body="Buy an OTP or rental number in admin test mode to see it here." />
          ) : orders.map((order) => (
            <SmsOrderCard
              key={order.id}
              order={order}
              busy={busyAction?.endsWith(order.id) === true}
              onCheck={checkOtp}
              onCancel={cancelOrder}
              onLatest={(item) => loadRentalSms(item, 'latest')}
              onHistory={(item) => loadRentalSms(item, 'history')}
              onRenew={renewRental}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SmsNumbersPage() {
  const { user } = useAuth()
  const canAccessSmsTesting = user?.email?.toLowerCase() === SMS_TEST_ADMIN_EMAIL

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#f6f7fb] text-slate-950 dark:bg-background dark:text-foreground">
      <NavbarAuth />

      <main className="container mx-auto max-w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:py-10">
        <div className="mx-auto mb-6 flex w-full max-w-7xl items-center gap-3 text-sm font-semibold text-slate-500 dark:text-muted-foreground">
          <Sparkles className="h-4 w-4 text-violet-500" />
          TallyStore SMS
        </div>

        {canAccessSmsTesting ? <SmsAdminTestingSurface /> : <SmsComingSoonBlocker />}
      </main>
    </div>
  )
}
