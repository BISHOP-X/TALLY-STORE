import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactCountryFlag from 'react-country-flag'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronRight,
  Clock3,
  Copy,
  Inbox,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  Minus,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
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
const SERVICE_BATCH_SIZE = 12

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
type ServiceSort = 'recommended' | 'price_low' | 'stock'

const SERVICE_SORT_LABELS: Record<ServiceSort, string> = {
  recommended: 'Recommended',
  price_low: 'Lowest price',
  stock: 'Most available',
}

const QUICK_SERVICE_TERMS = ['WhatsApp', 'Google', 'Telegram', 'Instagram', 'Facebook', 'Amazon']

const RENTAL_AREA_META: Record<string, { countryCode: string; name: string; dialCode?: string }> = {
  US: { countryCode: 'US', name: 'United States', dialCode: '+1' },
  CA: { countryCode: 'CA', name: 'Canada', dialCode: '+1' },
  GB: { countryCode: 'GB', name: 'United Kingdom', dialCode: '+44' },
  UK: { countryCode: 'GB', name: 'United Kingdom', dialCode: '+44' },
}

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

function normalize(value?: string | number | null) {
  return String(value || '').toLowerCase().trim()
}

function getAreaMeta(area?: Pick<SmsRentalArea, 'area_code' | 'area_title'> | null) {
  const code = String(area?.area_code || '').trim().toUpperCase()
  return RENTAL_AREA_META[code] || {
    countryCode: code || 'US',
    name: area?.area_title || code || 'United States',
  }
}

function FlagMark({
  countryCode,
  name,
  className,
}: {
  countryCode: string
  name: string
  className?: string
}) {
  const code = countryCode.toUpperCase()
  const baseClass = cn(
    'relative block h-6 w-8 overflow-hidden rounded shadow-sm ring-1 ring-slate-200/70',
    className,
  )

  if (code === 'US') {
    return (
      <span
        role="img"
        aria-label={`${name} flag`}
        className={baseClass}
        style={{ background: 'repeating-linear-gradient(to bottom,#b91c1c 0 7.7%,#ffffff 7.7% 15.4%)' }}
      >
        <span className="absolute left-0 top-0 h-[54%] w-[45%] bg-[#1e3a8a]" />
      </span>
    )
  }

  if (code === 'GB') {
    return (
      <span
        role="img"
        aria-label={`${name} flag`}
        className={baseClass}
        style={{
          background:
            'linear-gradient(27deg,transparent 43%,#fff 43%,#fff 57%,transparent 57%),linear-gradient(-27deg,transparent 43%,#fff 43%,#fff 57%,transparent 57%),linear-gradient(27deg,transparent 47%,#c8102e 47%,#c8102e 53%,transparent 53%),linear-gradient(-27deg,transparent 47%,#c8102e 47%,#c8102e 53%,transparent 53%),linear-gradient(90deg,transparent 42%,#fff 42%,#fff 58%,transparent 58%),linear-gradient(0deg,transparent 36%,#fff 36%,#fff 64%,transparent 64%),linear-gradient(90deg,transparent 46%,#c8102e 46%,#c8102e 54%,transparent 54%),linear-gradient(0deg,transparent 43%,#c8102e 43%,#c8102e 57%,transparent 57%),#012169',
        }}
      />
    )
  }

  if (code === 'CA') {
    return (
      <span
        role="img"
        aria-label={`${name} flag`}
        className={baseClass}
        style={{ background: 'linear-gradient(90deg,#e11d48 0 25%,#fff 25% 75%,#e11d48 75% 100%)' }}
      >
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#e11d48]" />
      </span>
    )
  }

  return (
    <span
      role="img"
      aria-label={`${name} flag`}
      className={baseClass}
      style={{ background: 'linear-gradient(135deg,#e2e8f0,#94a3b8)' }}
    />
  )
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

function safeSmsError(error: unknown, fallback = 'SMS request failed') {
  const message = error instanceof Error ? error.message : fallback
  if (/smsbus|provider|api key|token|secret|backend/i.test(message)) {
    return 'SMS numbers are temporarily unavailable. Please try again later.'
  }
  return message || fallback
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
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
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
              US SMS numbers are coming soon.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Buy verification numbers, receive codes, and manage reusable rentals directly from your
              TallyStore wallet when the feature opens.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Search, label: 'Search services' },
                { icon: MessageSquareText, label: 'Receive codes' },
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
            <h2 className="mt-5 text-xl font-black tracking-tight">Early access is limited</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-muted-foreground">
              Your dashboard will show the full buy flow as soon as public access is available.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-0 bg-white shadow-card dark:bg-card">
          <CardContent className="space-y-4 p-6">
            {[
              { icon: Clock3, text: 'Live number availability' },
              { icon: Bell, text: 'SMS arrival updates' },
              { icon: ShieldCheck, text: 'Wallet-safe cancellation' },
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
            <h3 className="mt-3 break-words text-lg font-black tracking-tight">{order.service_name}</h3>
            <p className="mt-1 break-all text-sm text-slate-500 dark:text-muted-foreground">{order.reference}</p>
          </div>
          <div className="text-left sm:text-right">
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
              <p className="min-w-0 truncate text-lg font-black">{order.phone_number || 'Not assigned'}</p>
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
            <p className="mt-2 min-h-7 break-words text-sm font-semibold">
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

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-2xl border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold shadow-none dark:border-white/10 dark:bg-background"
      />
    </div>
  )
}

function SmsNumbersSurface() {
  const [activeTab, setActiveTab] = useState<SmsTab>('otp')
  const [health, setHealth] = useState<SmsApiResponse<never> | null>(null)
  const [services, setServices] = useState<SmsService[]>([])
  const [areas, setAreas] = useState<SmsRentalArea[]>([])
  const [orders, setOrders] = useState<SmsOrder[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedAreaCode, setSelectedAreaCode] = useState('US')
  const [rentalMonths, setRentalMonths] = useState(1)
  const [serviceQuery, setServiceQuery] = useState('')
  const [serviceSort, setServiceSort] = useState<ServiceSort>('recommended')
  const [visibleServiceCount, setVisibleServiceCount] = useState(SERVICE_BATCH_SIZE)
  const [rentalQuery, setRentalQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const configured = health?.configured === true
  const numbersReady = configured && health?.valid !== false
  const selectedService = services.find((service) => service.service_id === selectedServiceId)
  const selectedArea = areas.find((area) => area.area_code === selectedAreaCode)
  const activeOrders = useMemo(
    () => orders.filter((order) => !isTerminalStatus(order.status)),
    [orders],
  )

  const serviceStats = useMemo(() => {
    const priced = services.filter((service) => Number(service.price_ngn) > 0)
    const lowest = priced.length ? Math.min(...priced.map((service) => service.price_ngn)) : 0
    const stock = services.reduce((total, service) => total + Number(service.available_count || 0), 0)
    return { lowest, stock }
  }, [services])

  const filteredServices = useMemo(() => {
    const query = normalize(serviceQuery)
    const matches = services.filter((service) => {
      if (!query) return true
      return [
        service.service_name,
        service.service_code,
        service.project_id,
        service.available_count,
        service.price_ngn,
      ].some((value) => normalize(value).includes(query))
    })

    return [...matches].sort((a, b) => {
      if (serviceSort === 'price_low') return a.price_ngn - b.price_ngn
      if (serviceSort === 'stock') return b.available_count - a.available_count
      return b.available_count - a.available_count || a.price_ngn - b.price_ngn
    })
  }, [services, serviceQuery, serviceSort])

  const visibleServices = filteredServices.slice(0, visibleServiceCount)

  const filteredAreas = useMemo(() => {
    const query = normalize(rentalQuery)
    return areas
      .filter((area) => {
        if (!query) return true
        const meta = getAreaMeta(area)
        return [area.area_code, area.area_title, meta.name, meta.dialCode].some((value) => normalize(value).includes(query))
      })
      .sort((a, b) => b.total - a.total || a.price_ngn_monthly - b.price_ngn_monthly)
  }, [areas, rentalQuery])

  useEffect(() => {
    setVisibleServiceCount(SERVICE_BATCH_SIZE)
  }, [serviceQuery, serviceSort])

  useEffect(() => {
    if (!selectedServiceId && services[0]) {
      setSelectedServiceId(services[0].service_id)
    }
  }, [selectedServiceId, services])

  useEffect(() => {
    if (areas.length > 0 && !areas.some((area) => area.area_code === selectedAreaCode)) {
      setSelectedAreaCode(areas[0].area_code)
    }
  }, [areas, selectedAreaCode])

  useEffect(() => {
    if (!selectedArea) return
    setRentalMonths((current) => Math.min(12, Math.max(selectedArea.min_month || 1, current || 1)))
  }, [selectedArea])

  const loadSmsNumbers = useCallback(async () => {
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
      } else {
        setServices([])
        setAreas([])
      }
    } catch (error) {
      toast.error(safeSmsError(error, 'Failed to load SMS numbers'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSmsNumbers()
  }, [loadSmsNumbers])

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusyAction(label)
    try {
      await action()
    } catch (error) {
      toast.error(safeSmsError(error, 'SMS action failed'))
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
    if (!selectedArea) throw new Error('Select a rental country first')

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

  const unavailable = !loading && (!configured || health?.valid === false)
  const selectedAreaMeta = getAreaMeta(selectedArea)
  const rentalTotal = selectedArea ? selectedArea.price_ngn_monthly * rentalMonths : 0

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <Card className="overflow-hidden rounded-[2rem] border-0 bg-[linear-gradient(145deg,#5b37b7,#121728_72%)] text-white shadow-[0_28px_80px_rgba(88,64,179,0.28)]">
        <CardContent className="relative p-6 sm:p-8 lg:p-10">
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.08))]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-white/10">
                  <ReactCountryFlag countryCode="US" svg className="text-3xl" aria-label="United States" />
                </span>
                <Badge className="rounded-full bg-cyan-300/15 px-4 py-2 text-cyan-100 hover:bg-cyan-300/15">
                  US numbers
                </Badge>
              </div>
              <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">SMS Numbers</h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-200">
                Search OTP services, choose a rental country, and manage every number from one wallet-ready workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" className="h-11 rounded-2xl bg-white px-5 text-[#5637aa] hover:bg-cyan-50" onClick={loadSmsNumbers}>
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

          <div className="relative mt-10 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { icon: Wallet, label: 'Checkout', value: numbersReady ? 'Wallet' : 'Paused' },
              { icon: PhoneCall, label: 'OTP services', value: loading ? '...' : services.length.toLocaleString() },
              { icon: CalendarDays, label: 'Rental countries', value: loading ? '...' : areas.length.toLocaleString() },
              { icon: Inbox, label: 'My numbers', value: activeOrders.length.toLocaleString() },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/8 p-4 sm:p-5">
                  <Icon className="h-6 w-6 text-cyan-200" />
                  <p className="mt-4 text-xs font-semibold text-slate-300 sm:text-sm">{item.label}</p>
                  <p className="mt-1 text-xl font-black sm:text-2xl">{item.value}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {unavailable && (
        <Card className="rounded-[1.75rem] border border-amber-200 bg-amber-50 shadow-card dark:border-amber-500/20 dark:bg-amber-500/10">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight">SMS numbers are temporarily unavailable</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-muted-foreground">
                Live stock could not be loaded right now. Your wallet and existing orders are unaffected.
              </p>
            </div>
            <Badge className="w-fit rounded-full bg-amber-200 px-4 py-2 text-amber-900 hover:bg-amber-200">
              Please try again later
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2 rounded-3xl bg-white p-2 shadow-card dark:bg-card sm:inline-grid sm:grid-cols-3">
        {[
          { id: 'otp' as const, label: 'OTP numbers', icon: PhoneCall },
          { id: 'rental' as const, label: 'Rentals', icon: CalendarDays },
          { id: 'orders' as const, label: 'My numbers', icon: Inbox },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              key={tab.id}
              type="button"
              variant="ghost"
              className={cn(
                'h-11 justify-start rounded-2xl sm:justify-center',
                activeTab === tab.id
                  ? 'bg-slate-950 text-white shadow-sm hover:bg-slate-900 hover:text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100'
                  : 'text-slate-700 hover:bg-violet-50 hover:text-slate-950 dark:text-muted-foreground dark:hover:bg-white/10 dark:hover:text-foreground',
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Button>
          )
        })}
      </div>

      {activeTab === 'otp' && (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="min-w-0 rounded-[1.75rem] border-0 bg-white shadow-card dark:bg-card">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Choose a service</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                    {loading ? 'Loading available services...' : `${filteredServices.length.toLocaleString()} matches from ${services.length.toLocaleString()} services`}
                  </p>
                </div>
                <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                  United States
                </Badge>
              </div>

              <div className="mt-6 flex min-w-0 flex-col gap-3 lg:flex-row">
                <SearchField value={serviceQuery} onChange={setServiceQuery} placeholder="Search WhatsApp, Google, Telegram..." />
                <div className="relative lg:w-56">
                  <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={serviceSort}
                    onChange={(event) => setServiceSort(event.target.value as ServiceSort)}
                    className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-8 text-sm font-semibold outline-none focus:border-violet-400 dark:border-white/10 dark:bg-background"
                  >
                    {(Object.keys(SERVICE_SORT_LABELS) as ServiceSort[]).map((key) => (
                      <option key={key} value={key}>{SERVICE_SORT_LABELS[key]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {QUICK_SERVICE_TERMS.map((term) => (
                  <Button
                    key={term}
                    type="button"
                    variant={serviceQuery === term ? 'default' : 'outline'}
                    className="h-9 shrink-0 rounded-full px-4 text-xs"
                    onClick={() => setServiceQuery(serviceQuery === term ? '' : term)}
                  >
                    {term}
                  </Button>
                ))}
              </div>

              <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {loading && services.length === 0 ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-36 animate-pulse rounded-3xl bg-slate-100 dark:bg-muted" />
                  ))
                ) : visibleServices.length === 0 ? (
                  <div className="md:col-span-2 xl:col-span-3">
                    <EmptyState title="No service found" body="Try another app name or clear the search." />
                  </div>
                ) : visibleServices.map((service) => {
                  const selected = selectedServiceId === service.service_id
                  return (
                    <button
                      key={service.service_id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedServiceId(service.service_id)}
                      className={cn(
                        'min-w-0 rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card',
                        selected
                          ? 'border-violet-400 bg-violet-50 shadow-[0_16px_40px_rgba(91,55,183,0.14)] dark:bg-violet-500/10'
                          : 'border-slate-100 bg-slate-50 dark:border-white/10 dark:bg-background',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-black tracking-tight">{service.service_name}</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                            {service.service_code || `ID ${service.project_id}`}
                          </p>
                        </div>
                        <ChevronRight className={cn('h-5 w-5 shrink-0', selected ? 'text-violet-600' : 'text-slate-300')} />
                      </div>
                      <div className="mt-5 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xl font-black">{formatNaira(service.price_ngn)}</p>
                          <p className="text-xs text-slate-500 dark:text-muted-foreground">per number</p>
                        </div>
                        <Badge variant="outline" className="rounded-full bg-white/70 px-3 py-1 dark:bg-white/5">
                          {service.available_count.toLocaleString()} left
                        </Badge>
                      </div>
                    </button>
                  )
                })}
              </div>

              {filteredServices.length > visibleServiceCount && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 h-11 w-full rounded-2xl"
                  onClick={() => setVisibleServiceCount((count) => count + SERVICE_BATCH_SIZE)}
                >
                  Show more services
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="h-fit rounded-[1.75rem] border-0 bg-white shadow-card dark:bg-card">
            <CardContent className="p-5 sm:p-6">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">
                <PhoneCall className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-black tracking-tight">Selected number</h3>

              <div className="mt-5 rounded-3xl bg-slate-100 p-4 dark:bg-muted">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                  Service
                </p>
                <p className="mt-2 break-words text-lg font-black">
                  {selectedService ? selectedService.service_name : 'Choose a service'}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-3xl bg-slate-100 p-4 dark:bg-muted">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                    Price
                  </p>
                  <p className="mt-2 text-xl font-black">{selectedService ? formatNaira(selectedService.price_ngn) : '-'}</p>
                </div>
                <div className="rounded-3xl bg-slate-100 p-4 dark:bg-muted">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                    Stock
                  </p>
                  <p className="mt-2 text-xl font-black">{selectedService ? selectedService.available_count.toLocaleString() : '-'}</p>
                </div>
              </div>

              <Button
                type="button"
                className="mt-5 h-12 w-full rounded-2xl px-6"
                disabled={!numbersReady || !selectedService || busyAction === 'buy-otp'}
                onClick={buyOtp}
              >
                {busyAction === 'buy-otp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
                Buy OTP Number
              </Button>

              <div className="mt-5 grid gap-3 text-sm text-slate-600 dark:text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Lowest price</span>
                  <strong className="text-slate-950 dark:text-foreground">{serviceStats.lowest ? formatNaira(serviceStats.lowest) : '-'}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Total stock</span>
                  <strong className="text-slate-950 dark:text-foreground">{serviceStats.stock.toLocaleString()}</strong>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'rental' && (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="min-w-0 rounded-[1.75rem] border-0 bg-white shadow-card dark:bg-card">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Choose a rental country</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                    {loading ? 'Loading rental countries...' : `${filteredAreas.length.toLocaleString()} countries available`}
                  </p>
                </div>
                <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                  Monthly rentals
                </Badge>
              </div>

              <div className="mt-6">
                <SearchField value={rentalQuery} onChange={setRentalQuery} placeholder="Search country or dial code..." />
              </div>

              <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {loading && areas.length === 0 ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-40 animate-pulse rounded-3xl bg-slate-100 dark:bg-muted" />
                  ))
                ) : filteredAreas.length === 0 ? (
                  <div className="md:col-span-2 xl:col-span-3">
                    <EmptyState title="No rental country found" body="Try searching by country name or dial code." />
                  </div>
                ) : filteredAreas.map((area) => {
                  const meta = getAreaMeta(area)
                  const selected = selectedAreaCode === area.area_code
                  return (
                    <button
                      key={area.area_code}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedAreaCode(area.area_code)}
                      className={cn(
                        'min-w-0 rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card',
                        selected
                          ? 'border-cyan-400 bg-cyan-50 shadow-[0_16px_40px_rgba(14,165,233,0.14)] dark:bg-cyan-500/10'
                          : 'border-slate-100 bg-slate-50 dark:border-white/10 dark:bg-background',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm dark:bg-white/10">
                          <FlagMark countryCode={meta.countryCode} name={meta.name} />
                        </span>
                        <Badge variant="outline" className="rounded-full bg-white/70 px-3 py-1 dark:bg-white/5">
                          {meta.dialCode || area.area_code}
                        </Badge>
                      </div>
                      <p className="mt-5 truncate text-lg font-black tracking-tight">{meta.name}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">{area.total.toLocaleString()} numbers available</p>
                      <div className="mt-5 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xl font-black">{formatNaira(area.price_ngn_monthly)}</p>
                          <p className="text-xs text-slate-500 dark:text-muted-foreground">per month</p>
                        </div>
                        <ChevronRight className={cn('h-5 w-5 shrink-0', selected ? 'text-cyan-700' : 'text-slate-300')} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="h-fit rounded-[1.75rem] border-0 bg-white shadow-card dark:bg-card">
            <CardContent className="p-5 sm:p-6">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                <CalendarDays className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-black tracking-tight">Rental summary</h3>

              <div className="mt-5 rounded-3xl bg-slate-100 p-4 dark:bg-muted">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                  Country
                </p>
                <div className="mt-2 flex min-w-0 items-center gap-3">
                  <FlagMark countryCode={selectedAreaMeta.countryCode} name={selectedAreaMeta.name} />
                  <p className="min-w-0 truncate text-lg font-black">{selectedArea ? selectedAreaMeta.name : 'Choose a country'}</p>
                </div>
              </div>

              <div className="mt-3 rounded-3xl bg-slate-100 p-4 dark:bg-muted">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                  Months
                </p>
                <div className="mt-3 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-2xl"
                    disabled={!selectedArea || rentalMonths <= (selectedArea.min_month || 1)}
                    onClick={() => setRentalMonths((months) => Math.max(selectedArea?.min_month || 1, months - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={selectedArea?.min_month || 1}
                    max={12}
                    value={rentalMonths}
                    onChange={(event) => {
                      const next = Number(event.target.value || selectedArea?.min_month || 1)
                      setRentalMonths(Math.min(12, Math.max(selectedArea?.min_month || 1, next)))
                    }}
                    className="h-11 rounded-2xl text-center text-lg font-black"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-2xl"
                    disabled={!selectedArea || rentalMonths >= 12}
                    onClick={() => setRentalMonths((months) => Math.min(12, months + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-3xl bg-slate-100 p-4 dark:bg-muted">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                    Monthly
                  </p>
                  <p className="mt-2 text-xl font-black">{selectedArea ? formatNaira(selectedArea.price_ngn_monthly) : '-'}</p>
                </div>
                <div className="rounded-3xl bg-slate-100 p-4 dark:bg-muted">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                    Total
                  </p>
                  <p className="mt-2 text-xl font-black">{selectedArea ? formatNaira(rentalTotal) : '-'}</p>
                </div>
              </div>

              <Button
                type="button"
                className="mt-5 h-12 w-full rounded-2xl px-6"
                disabled={!numbersReady || !selectedArea || busyAction === 'rent-number'}
                onClick={rentNumber}
              >
                {busyAction === 'rent-number' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
                Rent Number
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">My SMS numbers</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                Active OTP and rental numbers appear here.
              </p>
            </div>
            <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={refreshOrders}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {orders.length === 0 ? (
            <EmptyState title="No SMS numbers yet" body="Your OTP and rental numbers will appear here after purchase." />
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
  const canAccessSmsNumbers = user?.email?.toLowerCase() === SMS_TEST_ADMIN_EMAIL

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#f6f7fb] text-slate-950 dark:bg-background dark:text-foreground">
      <NavbarAuth />

      <main className="container mx-auto max-w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:py-10">
        <div className="mx-auto mb-6 flex w-full max-w-7xl items-center gap-3 text-sm font-semibold text-slate-500 dark:text-muted-foreground">
          <Sparkles className="h-4 w-4 text-violet-500" />
          SMS Numbers
        </div>

        {canAccessSmsNumbers ? <SmsNumbersSurface /> : <SmsComingSoonBlocker />}
      </main>
    </div>
  )
}
