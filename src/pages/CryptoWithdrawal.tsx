import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wallet, TrendingDown, Loader2, AlertCircle, CheckCircle2, Building2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

interface BankAccount {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName?: string;
}

const NIGERIAN_BANKS = [
  { code: "058", name: "GTBank" },
  { code: "033", name: "United Bank for Africa" },
  { code: "044", name: "Access Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "057", name: "Zenith Bank" },
  { code: "214", name: "First City Monument Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "215", name: "Unity Bank" },
  { code: "032", name: "Union Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "309", name: "Globus Bank" },
  { code: "102", name: "Titan Trust Bank" },
];

export default function CryptoWithdrawal() {
  const [cryptoBalance, setCryptoBalance] = useState<number>(0);
  const [amount, setAmount] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [validatingAccount, setValidatingAccount] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch crypto balance
  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoadingBalance(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('crypto_balance')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setCryptoBalance(profile?.crypto_balance || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast({
        title: "Error",
        description: "Failed to load crypto balance",
        variant: "destructive",
      });
    } finally {
      setLoadingBalance(false);
    }
  };

  // Auto-validate account when bank + account number are complete
  useEffect(() => {
    if (bankCode && accountNumber.length === 10) {
      validateAccount();
    } else {
      setAccountName("");
    }
  }, [bankCode, accountNumber]);

  const validateAccount = async () => {
    setValidatingAccount(true);
    setAccountName("");

    try {
      // In production, this would call SageCloud API to resolve account
      // For now, simulate validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock account name (in production, this comes from API)
      const mockName = "JOHN DOE EXAMPLE";
      setAccountName(mockName);
      
      toast({
        title: "Account Verified ✓",
        description: `${mockName}`,
      });
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: "Could not verify account details",
        variant: "destructive",
      });
    } finally {
      setValidatingAccount(false);
    }
  };

  const withdrawAmount = parseFloat(amount) || 0;
  const feePercentage = 2;
  const feeAmount = (withdrawAmount * feePercentage) / 100;
  const netAmount = withdrawAmount - feeAmount;
  const requiresApproval = withdrawAmount >= 500000;

  const handleWithdraw = async () => {
    // Validation
    if (!withdrawAmount || withdrawAmount < 1000) {
      toast({
        title: "Invalid Amount",
        description: "Minimum withdrawal is ₦1,000",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > 2000000) {
      toast({
        title: "Amount Too High",
        description: "Maximum withdrawal is ₦2,000,000 per transaction",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > cryptoBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ₦${cryptoBalance.toLocaleString()} available`,
        variant: "destructive",
      });
      return;
    }

    if (!bankCode || !accountNumber || !accountName) {
      toast({
        title: "Incomplete Details",
        description: "Please fill in all bank details",
        variant: "destructive",
      });
      return;
    }

    if (accountNumber.length !== 10) {
      toast({
        title: "Invalid Account Number",
        description: "Account number must be 10 digits",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const bankName = NIGERIAN_BANKS.find(b => b.code === bankCode)?.name || "";

      // Call Edge Function to create withdrawal request
      const { data, error } = await supabase.functions.invoke('create-withdrawal-request', {
        body: {
          amount: withdrawAmount,
          bankCode: bankCode,
          accountNumber: accountNumber,
          accountName: accountName,
          bankName: bankName,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to create withdrawal request');
      }

      // Show success message
      if (requiresApproval) {
        toast({
          title: "Withdrawal Pending Approval 📋",
          description: `Your withdrawal of ₦${withdrawAmount.toLocaleString()} requires admin approval. You'll be notified once approved.`,
        });
      } else {
        toast({
          title: "Withdrawal Initiated! 🚀",
          description: `₦${netAmount.toLocaleString()} will be sent to your account shortly.`,
        });
      }

      // Clear form
      setAmount("");
      setAccountNumber("");
      setAccountName("");
      setBankCode("");
      
      // Refresh balance
      await fetchBalance();

      // Navigate to orders page after 2 seconds
      setTimeout(() => {
        navigate('/orders');
      }, 2000);

    } catch (error: any) {
      console.error('Error creating withdrawal:', error);
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMaxAmount = () => {
    // Set to max withdrawable (balance or 2M limit, whichever is lower)
    const maxWithdrawable = Math.min(cryptoBalance, 2000000);
    setAmount(maxWithdrawable.toString());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b bg-gradient-to-r from-primary to-primary/90 shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="gap-2 text-white hover:bg-white/20 hover:text-white font-medium"
          >
            ← Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <Wallet className="w-7 h-7 text-white" />
            <h1 className="text-2xl font-bold text-white">Withdraw to Bank</h1>
          </div>
          <div className="w-40" /> {/* Spacer for centering */}
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto p-6 max-w-2xl">
        {/* Hero Section */}
        <div className="text-center mb-8 pt-4">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Cash Out to Your Bank
          </h2>
          <p className="text-muted-foreground">
            Transfer your crypto balance directly to your Nigerian bank account
          </p>
        </div>

        {/* Balance Display Card */}
        <Card className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-green-700 mb-1">Available Crypto Balance</p>
              {loadingBalance ? (
                <div className="text-2xl font-bold text-green-900">Loading...</div>
              ) : (
                <div className="text-4xl font-bold text-green-900">
                  ₦{cryptoBalance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              {cryptoBalance === 0 && (
                <p className="text-xs text-green-700 mt-2">
                  Sell crypto to receive balance first
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Form */}
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Building2 className="w-7 h-7 text-primary" />
              Bank Withdrawal
            </CardTitle>
            <CardDescription>
              Enter your bank details to receive funds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount-input" className="text-base font-medium">
                Withdrawal Amount
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    ₦
                  </span>
                  <Input
                    id="amount-input"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-14 text-lg pl-7"
                    min="1000"
                    max="2000000"
                    step="100"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleMaxAmount}
                  disabled={loadingBalance || cryptoBalance === 0}
                  className="h-14 px-6"
                >
                  Max
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Min: ₦1,000 | Max: ₦2,000,000 per transaction
              </p>
            </div>

            {/* Bank Selection */}
            <div className="space-y-2">
              <Label htmlFor="bank-select" className="text-base font-medium">
                Select Bank
              </Label>
              <Select value={bankCode} onValueChange={setBankCode}>
                <SelectTrigger id="bank-select" className="h-12">
                  <SelectValue placeholder="Choose your bank..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {NIGERIAN_BANKS.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="account-input" className="text-base font-medium">
                Account Number
              </Label>
              <Input
                id="account-input"
                type="text"
                placeholder="0123456789"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="h-12 text-lg"
                maxLength={10}
              />
              {validatingAccount && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying account...
                </div>
              )}
              {accountName && (
                <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  {accountName}
                </div>
              )}
            </div>

            {/* Fee Preview Card */}
            {withdrawAmount >= 1000 && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Withdrawal Amount:</span>
                      <span className="font-semibold">₦{withdrawAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Processing Fee (2%):</span>
                      <span className="font-semibold text-red-600">-₦{feeAmount.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-blue-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-base">You'll Receive:</span>
                        <span className="text-3xl font-bold text-green-700">
                          ₦{netAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Approval Warning */}
            {requiresApproval && (
              <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-900 text-sm">Admin Approval Required</p>
                    <p className="text-xs text-yellow-800 mt-1">
                      Withdrawals of ₦500,000 and above require admin approval for security. 
                      You'll receive a notification once approved (usually within 24 hours).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Withdraw Button */}
            <Button
              onClick={handleWithdraw}
              className="w-full h-14 text-lg"
              size="lg"
              disabled={
                loading ||
                loadingBalance ||
                !withdrawAmount ||
                withdrawAmount < 1000 ||
                withdrawAmount > cryptoBalance ||
                !bankCode ||
                !accountName ||
                accountNumber.length !== 10
              }
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <TrendingDown className="w-5 h-5 mr-2" />
                  Request Withdrawal
                </>
              )}
            </Button>

            {/* Info Footer */}
            <div className="pt-4 border-t space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Processing time: 5-30 minutes for approved withdrawals
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Secure bank transfer via SageCloud payment gateway
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
