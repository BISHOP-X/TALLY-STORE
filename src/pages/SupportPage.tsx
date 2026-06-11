import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MessageCircle, Clock, HelpCircle, ShieldCheck, ReceiptText } from 'lucide-react'
import NavbarAuth from '@/components/NavbarAuth'
import Footer from '@/components/Footer'
import WalletBalanceWidget from '@/components/WalletBalanceWidget'
import { SUPPORT_WHATSAPP_NUMBER, SUPPORT_WHATSAPP_URL } from '@/lib/support'

const faqItems = [
  {
    question: 'How quickly will I receive my account credentials?',
    answer: 'Account credentials are available in your dashboard immediately after successful payment. Open Order History and download your credentials from the completed order.'
  },
  {
    question: 'What should I send when I need help?',
    answer: 'Send your account email, order ID, payment reference, and a clear description of the issue on WhatsApp so support can trace it quickly.'
  },
  {
    question: 'What if my payment succeeded but wallet was not credited?',
    answer: 'Use the payment recovery option on your dashboard first. If it still does not credit, send the payment reference and receipt to WhatsApp support.'
  },
  {
    question: 'Can I get a refund if I am not satisfied?',
    answer: 'Refunds are reviewed case by case for genuine account or delivery issues. Contact WhatsApp support within 24 hours with your order details.'
  },
  {
    question: 'How do I secure a purchased account?',
    answer: 'Download the credentials from Order History, sign in, change the password, and update any recovery information included with the account.'
  }
]

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavbarAuth />

      <div className="container mx-auto max-w-6xl px-6 pb-4 pt-24">
        <WalletBalanceWidget showRefresh={true} />
      </div>

      <main className="container mx-auto max-w-6xl px-6 pb-12">
        <div className="mb-10 text-center">
          <h1 className="mb-4 text-4xl font-bold">Support Center</h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            WhatsApp is the only active support channel for TallyStore right now.
          </p>
        </div>

        <Card className="mb-10 overflow-hidden border-emerald-200">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
            <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 text-white md:p-10">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <MessageCircle className="h-7 w-7" />
              </div>
              <h2 className="mb-3 text-3xl font-bold">Message support on WhatsApp</h2>
              <p className="mb-8 max-w-xl text-emerald-50">
                Sorry for the delay. Relay all account, wallet, payment, and order problems to
                our WhatsApp handle so we can respond from one place.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50">
                  <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    Chat on WhatsApp
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                  <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    {SUPPORT_WHATSAPP_NUMBER}
                  </a>
                </Button>
              </div>
            </div>

            <CardContent className="space-y-5 p-8 md:p-10">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Include useful details</h3>
                  <p className="text-sm text-muted-foreground">
                    Send your account email, order ID, payment reference, receipt, and a short issue summary.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Response window</h3>
                  <p className="text-sm text-muted-foreground">
                    We prioritize wallet, payment, and completed-order access issues first.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Account safety</h3>
                  <p className="text-sm text-muted-foreground">
                    Never share your TallyStore password. Support will only ask for order and payment details.
                  </p>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Before messaging</CardTitle>
              <CardDescription>These dashboard actions solve the most common support requests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <Alert>
                <AlertDescription>
                  If a payment was successful but delayed, run payment recovery from your dashboard before contacting support.
                </AlertDescription>
              </Alert>
              <p>For purchased accounts, go to Order History and use Download Credentials on the completed order.</p>
              <p>For failed purchases, include the product, order ID if available, and a screenshot of the error.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>Quick answers to common questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqItems.map((item) => (
                <div key={item.question} className="border-l-2 border-primary/20 pl-4">
                  <h4 className="mb-2 text-sm font-semibold">{item.question}</h4>
                  <p className="text-sm text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
