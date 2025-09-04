import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { ercasPayService } from '@/lib/ercasPay'
import { useAuth } from '@/contexts/SimpleAuth'
import Navbar from '@/components/NavbarAuth'

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'error'>('loading')
  const [paymentData, setPaymentData] = useState<any>(null)

  useEffect(() => {
    const transactionReference = searchParams.get('transactionReference') || 
                                 searchParams.get('transaction_reference') ||
                                 searchParams.get('reference') || 
                                 searchParams.get('trxref')
    
    if (!transactionReference) {
      setStatus('error')
      return
    }

    verifyPayment(transactionReference)
  }, [searchParams])

  const verifyPayment = async (transactionReference: string) => {
    try {
      const verification = await ercasPayService.verifyPayment(transactionReference)
      
      if (verification.success && verification.data) {
        if (verification.data.status === 'SUCCESSFUL') {
          setStatus('success')
          setPaymentData(verification.data)
          
          // TODO: Update user wallet balance in Supabase
          // await updateWalletBalance(user?.id, verification.data.amount)
          
        } else if (verification.data.status === 'PENDING') {
          setStatus('loading')
          // Retry verification after a delay
          setTimeout(() => verifyPayment(transactionReference), 3000)
        } else {
          setStatus('failed')
          setPaymentData(verification.data)
        }
      } else {
        setStatus('error')
      }
    } catch (error) {
      console.error('Payment verification failed:', error)
      setStatus('error')
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />
      case 'failed':
      case 'error':
        return <XCircle className="h-16 w-16 text-red-500" />
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'loading':
        return {
          title: 'Verifying Payment...',
          description: 'Please wait while we confirm your payment.'
        }
      case 'success':
        return {
          title: 'Payment Successful!',
          description: `Your wallet has been topped up with ₦${paymentData?.amount?.toLocaleString() || '0'}.`
        }
      case 'failed':
        return {
          title: 'Payment Failed',
          description: 'Your payment could not be processed. Please try again.'
        }
      case 'error':
        return {
          title: 'Verification Error',
          description: 'Unable to verify payment status. Please contact support if you were charged.'
        }
    }
  }

  const message = getStatusMessage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navbar />
      
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-md mx-auto">
          <Card className="text-center">
            <CardHeader className="pb-4">
              <div className="flex justify-center mb-4">
                {getStatusIcon()}
              </div>
              <CardTitle className="text-2xl">
                {message.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                {message.description}
              </p>

              {paymentData && status === 'success' && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Amount:</span>
                    <span className="font-medium">₦{paymentData.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Reference:</span>
                    <span className="font-mono text-xs">{paymentData.reference}</span>
                  </div>
                  {paymentData.paidAt && (
                    <div className="flex justify-between text-sm">
                      <span>Paid At:</span>
                      <span>{new Date(paymentData.paidAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {status === 'success' && (
                  <Button 
                    onClick={() => navigate('/wallet')}
                    className="w-full"
                  >
                    View Wallet
                  </Button>
                )}
                
                {status === 'failed' && (
                  <Button 
                    onClick={() => navigate('/wallet')}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                )}
                
                {status === 'error' && (
                  <Button 
                    onClick={() => navigate('/support')}
                    variant="outline"
                    className="w-full"
                  >
                    Contact Support
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  onClick={() => navigate('/dashboard')}
                  className="w-full"
                >
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
