import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, XCircle, ArrowLeft, Wallet } from 'lucide-react';
import { verifyPayment } from '@/services/ercaspay';
import { useAuth } from '@/contexts/SimpleAuth';
import { useToast } from '@/hooks/use-toast';
import { updateUserWalletBalance } from '@/lib/supabase';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshWalletBalance } = useAuth();
  const { toast } = useToast();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    status: string;
    amount: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    const verifyPaymentStatus = async () => {
      // Try to get transaction reference from URL params
      const transactionRef = searchParams.get('transactionReference') || 
                            searchParams.get('tx_ref') || 
                            searchParams.get('reference');
      
      // Also check localStorage for pending transaction
      const pendingTopup = localStorage.getItem('pending_topup');
      let storedTransaction = null;
      
      if (pendingTopup) {
        try {
          storedTransaction = JSON.parse(pendingTopup);
        } catch (e) {
          console.error('Error parsing stored transaction:', e);
        }
      }

      const transactionReference = transactionRef || storedTransaction?.transactionReference;

      if (!transactionReference) {
        setVerificationResult({
          success: false,
          status: 'error',
          amount: 0,
          message: 'No transaction reference found. Please contact support if you made a payment.'
        });
        setIsVerifying(false);
        return;
      }

      try {
        console.log('🔍 Verifying payment:', transactionReference);
        const verification = await verifyPayment(transactionReference);
        
        console.log('📥 Verification result:', verification);

        if (verification.success && verification.status === 'success') {
          // Payment successful - update wallet balance
          if (user?.id) {
            try {
              await updateUserWalletBalance(user.id, verification.amount);
              await refreshWalletBalance();
              
              // Clear pending transaction
              localStorage.removeItem('pending_topup');
              
              setVerificationResult({
                success: true,
                status: 'success',
                amount: verification.amount,
                message: `Payment successful! ₦${verification.amount.toLocaleString()} has been added to your wallet.`
              });

              toast({
                title: "Payment Successful!",
                description: `₦${verification.amount.toLocaleString()} has been added to your wallet.`,
              });

            } catch (updateError) {
              console.error('❌ Error updating wallet:', updateError);
              setVerificationResult({
                success: false,
                status: 'error',
                amount: verification.amount,
                message: 'Payment was successful but there was an error updating your wallet. Please contact support.'
              });
            }
          }
        } else {
          // Payment failed or pending
          setVerificationResult({
            success: false,
            status: verification.status,
            amount: verification.amount || storedTransaction?.amount || 0,
            message: verification.error || `Payment ${verification.status}. Please try again or contact support.`
          });
        }

      } catch (error: any) {
        console.error('❌ Payment verification error:', error);
        setVerificationResult({
          success: false,
          status: 'error',
          amount: storedTransaction?.amount || 0,
          message: 'Error verifying payment. Please contact support if you made a payment.'
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPaymentStatus();
  }, [searchParams, user, refreshWalletBalance, toast]);

  const handleBackToWallet = () => {
    navigate('/wallet');
  };

  const handleRetryPayment = () => {
    navigate('/wallet');
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
            <p className="text-muted-foreground text-center">
              Please wait while we confirm your payment...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {verificationResult?.success ? (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {verificationResult?.success ? 'Payment Successful!' : 'Payment Failed'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <Badge 
              variant={verificationResult?.success ? "default" : "destructive"}
              className="mb-3"
            >
              {verificationResult?.status?.toUpperCase()}
            </Badge>
            
            {verificationResult?.amount > 0 && (
              <div className="text-3xl font-bold mb-2">
                ₦{verificationResult.amount.toLocaleString()}
              </div>
            )}
            
            <p className="text-muted-foreground">
              {verificationResult?.message}
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleBackToWallet}
              className="w-full"
              size="lg"
            >
              <Wallet className="mr-2 h-4 w-4" />
              {verificationResult?.success ? 'View Wallet' : 'Back to Wallet'}
            </Button>
            
            {!verificationResult?.success && (
              <Button 
                onClick={handleRetryPayment}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Need help? Contact us at tallystoreorg@gmail.com
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
