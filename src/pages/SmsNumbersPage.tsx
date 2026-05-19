import ReactCountryFlag from 'react-country-flag'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import NavbarAuth from '@/components/NavbarAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/SimpleAuth'

const SMS_TEST_ADMIN_EMAIL = 'wisdomthedev@gmail.com'

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

function SmsAdminTestingSurface() {
  return (
    <div className="mx-auto w-full max-w-6xl">
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
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">SMSBus US Numbers</h1>
              </div>
            </div>
            <Button asChild className="h-11 rounded-2xl bg-white px-5 text-[#5637aa] hover:bg-cyan-50">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: PhoneCall, title: 'Browse', body: 'Load US number stock and SMSBus pricing.' },
              { icon: Wallet, title: 'Purchase', body: 'Charge wallet after backend price confirmation.' },
              { icon: MessageSquareText, title: 'Receive', body: 'Poll SMSBus and show received messages.' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="rounded-3xl border border-white/10 bg-white/8 p-5">
                  <Icon className="h-6 w-6 text-cyan-200" />
                  <p className="mt-4 text-lg font-black">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 rounded-[1.75rem] border-0 bg-white shadow-card dark:bg-card">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black tracking-tight">Ready for implementation</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-muted-foreground">
                This admin-only surface is intentionally open for the test account while public users stay
                blocked behind the launch screen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
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
        <div className="mx-auto mb-6 flex w-full max-w-6xl items-center gap-3 text-sm font-semibold text-slate-500 dark:text-muted-foreground">
          <Sparkles className="h-4 w-4 text-violet-500" />
          TallyStore SMS
        </div>

        {canAccessSmsTesting ? <SmsAdminTestingSurface /> : <SmsComingSoonBlocker />}
      </main>
    </div>
  )
}
