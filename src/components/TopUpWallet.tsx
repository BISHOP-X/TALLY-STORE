import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/SimpleAuth';
import { initiatePayment, type PaymentData } from '@/services/ercaspay';
import { initiatePocketFiPayment } from '@/services/pocketfi';
import { useToast } from '@/hooks/use-toast';
import { useExchangeRate } from '@/hooks/useExchangeRate';

interface TopUpWalletProps {
  onSuccess?: () => void;
}

type Gateway = 'ercaspay' | 'pocketfi';

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

export function TopUpWallet({ onSuccess }: TopUpWalletProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gateway, setGateway] = useState<Gateway>('ercaspay');
  const { user } = useAuth();
  const { toast } = useToast();
  const { ngnToUsd } = useExchangeRate();

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const handleTopUp = async () => {
    if (!user?.email) {
      toast({
        title: "Authentication Required",
        description: "Please log in to top up your wallet.",
        variant: "destructive",
      });
      return;
    }

    const topUpAmount = parseInt(amount);
    if (!topUpAmount || topUpAmount < 100) {
      toast({
        title: "Invalid Amount",
        description: "Please enter an amount of at least ₦100.",
        variant: "destructive",
      });
      return;
    }

    if (topUpAmount > 1000000) {
      toast({
        title: "Amount Too Large",
        description: "Maximum top-up amount is ₦1,000,000.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // SOLUTION: Open popup window IMMEDIATELY before async call to bypass Safari/iOS popup blockers
    // Using empty URL ('') instead of 'about:blank' prevents browser from creating separate contexts
    // This ensures location.href properly replaces the window instead of opening a second window
    const width = 800;
    const height = 900;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const paymentWindow = window.open(
      '', 
      'ErcasPayCheckout',
      `width=${width},height=${height},left=${left},top=${top},popup=1,resizable=1,scrollbars=1`
    );
    
    // Show loading state in the new window if possible
    if (paymentWindow) {
      paymentWindow.document.write(`
        <html>
          <head>
            <title>Processing Payment...</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .loader {
                text-align: center;
              }
              .spinner {
                border: 4px solid rgba(255,255,255,0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="loader">
              <div class="spinner"></div>
              <h2>Processing your payment...</h2>
              <p>Please wait while we redirect you to Ercas Pay</p>
            </div>
          </body>
        </html>
      `);
    }

    try {
      const paymentData: PaymentData = {
        amount: topUpAmount,
        customerName: 'Tally Store Customer', // Use a clean, simple name
        customerEmail: user.email,
        redirectUrl: `${window.location.origin}/wallet`, // Redirect back to wallet after payment
        description: `Wallet top-up of ₦${topUpAmount.toLocaleString()}`,
        metadata: {
          user_id: user.id, // Use user_id to match webhook payload structure
          userId: user.id,  // Keep userId for backward compatibility
          type: 'wallet_topup',
          originalAmount: topUpAmount
        }
      };

      console.log(`🚀 Initiating wallet top-up via ${gateway}...`, paymentData);

      const response = gateway === 'pocketfi'
        ? await initiatePocketFiPayment(paymentData)
        : await initiatePayment(paymentData);

      if (response.success && response.data?.checkoutUrl) {
        // Validate checkout URL for security
        const checkoutUrl = response.data.checkoutUrl;
        
        if (!checkoutUrl || !/^https?:\/\//.test(checkoutUrl)) {
          // Close the payment window if URL is invalid
          paymentWindow?.close();
          
          toast({
            variant: "destructive",
            title: "Invalid Payment URL",
            description: "Payment link is missing or malformed. Please try again.",
          });
          setIsLoading(false);
          return;
        }

        // Store transaction reference for verification later
        localStorage.setItem('pending_topup', JSON.stringify({
          transactionReference: response.data.transactionReference,
          amount: topUpAmount,
          timestamp: Date.now(),
          gateway
        }));

        // Check if payment window is still open and not blocked
        if (paymentWindow && !paymentWindow.closed) {
          // SUCCESS: Redirect the already-open window to payment gateway
          console.log('✅ Redirecting payment window to:', checkoutUrl);
          paymentWindow.location.href = checkoutUrl;
          
          // Close the modal and show success message
          setIsOpen(false);
          toast({
            title: "Payment Window Opened",
            description: "Complete your payment in the new tab. Your wallet will update automatically when payment is successful.",
          });
        } else {
          // FALLBACK: Window was blocked or closed - use same-window redirect
          console.log('⚠️ Popup blocked - using same-window redirect');
          toast({
            title: "Redirecting to Payment",
            description: "Opening payment gateway...",
          });
          
          // Small delay to show the toast
          setTimeout(() => {
            window.location.href = checkoutUrl;
          }, 500);
        }
      } else {
        // Close the payment window on error
        paymentWindow?.close();
        throw new Error(response.error || 'Failed to initiate payment');
      }

    } catch (error: any) {
      console.error('❌ Top-up error:', error);
      
      // Close the payment window on error
      paymentWindow?.close();
      
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Top Up Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Top Up Wallet
          </DialogTitle>
          <DialogDescription>
            Add money to your wallet to purchase social media accounts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Gateway Selection */}
          <div className="space-y-3">
            <Label>Payment Gateway</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={gateway === 'ercaspay' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGateway('ercaspay')}
              >
                Ercas Pay
              </Button>
              <Button
                type="button"
                variant={gateway === 'pocketfi' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGateway('pocketfi')}
              >
                PocketFi
              </Button>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="space-y-3">
            <Label>Quick Amounts</Label>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  variant={amount === quickAmount.toString() ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickAmount(quickAmount)}
                  className="text-xs"
                >
                  {formatCurrency(quickAmount)}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Custom Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="100"
              max="1000000"
            />
            <p className="text-xs text-muted-foreground">
              Minimum: ₦100, Maximum: ₦1,000,000
            </p>
          </div>

          {/* Payment Summary */}
          {amount && parseInt(amount) >= 100 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-medium">{formatCurrency(parseInt(amount))}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>USD Equivalent:</span>
                    <span>≈ ${ngnToUsd(parseInt(amount)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Gateway:</span>
                    <span>{gateway === 'pocketfi' ? 'PocketFi' : 'Ercas Pay'}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Payment Methods:</span>
                    <span>Card, Bank Transfer, USSD</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTopUp}
              disabled={!amount || parseInt(amount) < 100 || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Proceed to Payment'
              )}
            </Button>
          </div>

          {/* Security Note */}
          <div className="text-xs text-muted-foreground text-center">
            🔒 Secure payment powered by {gateway === 'pocketfi' ? 'PocketFi' : 'Ercas Pay'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
