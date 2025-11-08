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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bitcoin, DollarSign, TrendingDown, Copy, ExternalLink, Loader2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";

type CryptoType = "BTC" | "USDT" | "USDC";
type ChainType = "btc" | "tron" | "ethereum" | "polygon" | "bsc";

interface ExchangeRates {
  BTC: number;
  USDT: number;
  USDC: number;
}

interface DepositInfo {
  transactionId: string;
  cryptoType: CryptoType;
  cryptoAmount: number;
  nairaAmount: number;
  depositAddress: string;
  expiresAt: string;
  chain: ChainType;
}

export default function CryptoExchange() {
  const [crypto, setCrypto] = useState<CryptoType>("BTC"); // Default to BTC (only working option)
  const [amount, setAmount] = useState("");
  const [rates, setRates] = useState<ExchangeRates>({ BTC: 0, USDT: 0, USDC: 0 });
  const [loading, setLoading] = useState(false);
  const [loadingRates, setLoadingRates] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [dailyLimit, setDailyLimit] = useState({ used: 0, remaining: 1000000 });
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch exchange rates
  useEffect(() => {
    fetchRates();
  }, []);

  // Countdown timer for deposit expiry
  useEffect(() => {
    if (!depositInfo) return;

    const interval = setInterval(() => {
      const expiresAt = new Date(depositInfo.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        handleExpiry();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [depositInfo]);

  const fetchRates = async () => {
    try {
      const { data, error } = await supabase
        .from('crypto_exchange_rates')
        .select('crypto_type, market_rate, manual_rate, use_manual, markup_percentage');

      if (error) throw error;

      const ratesMap: ExchangeRates = { BTC: 0, USDT: 0, USDC: 0 };
      
      data?.forEach((rate: any) => {
        const baseRate = rate.use_manual ? rate.manual_rate : rate.market_rate;
        const markup = rate.markup_percentage / 100;
        ratesMap[rate.crypto_type as CryptoType] = baseRate * (1 + markup);
      });

      setRates(ratesMap);
    } catch (error) {
      console.error('Error fetching rates:', error);
      toast({
        title: "Error",
        description: "Failed to load exchange rates",
        variant: "destructive",
      });
    } finally {
      setLoadingRates(false);
    }
  };

  // Fetch daily limit
  useEffect(() => {
    // TESTING: Temporarily disabled
    // fetchDailyLimit();
  }, []);

  const fetchDailyLimit = async () => {
    // TESTING: Temporarily disabled
    return;
    /*
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('user_daily_limits')
        .select('total_sold_today')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const used = data?.total_sold_today || 0;
      setDailyLimit({ used, remaining: 1000000 - used });
    } catch (error) {
      console.error('Error fetching daily limit:', error);
    }
    */
  };

  const ngnAmount = amount && rates[crypto] 
    ? (parseFloat(amount) * rates[crypto]).toFixed(2) 
    : "0.00";

  const handleSell = async () => {
    const cryptoAmount = parseFloat(amount);

    // Validation
    if (!cryptoAmount || cryptoAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    // Check daily limit
    const ngnValue = parseFloat(ngnAmount);
    if (ngnValue > dailyLimit.remaining) {
      toast({
        title: "Daily Limit Exceeded",
        description: `You can only sell ₦${dailyLimit.remaining.toLocaleString()} more today. Limit resets at midnight.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Determine chain based on crypto type
      const chain: ChainType = crypto === "BTC" 
        ? "btc" 
        : "tron"; // Default to TRON for stablecoins (cheapest)

      // Use service role key to bypass JWT verification
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      const headers: Record<string, string> = {};
      if (serviceRoleKey) {
        headers['Authorization'] = `Bearer ${serviceRoleKey}`;
      }

      // Call Edge Function to create sell order
      const { data, error } = await supabase.functions.invoke('create-crypto-sell-order', {
        headers,
        body: {
          cryptoType: crypto,
          cryptoAmount: cryptoAmount,
          chain: chain,
          userId: user.id, // Pass user ID since we're bypassing JWT
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to create sell order');
      }

      // Set deposit info and open modal
      setDepositInfo({
        transactionId: data.transaction.id,
        cryptoType: crypto,
        cryptoAmount: cryptoAmount,
        nairaAmount: parseFloat(ngnAmount),
        depositAddress: data.transaction.depositAddress,
        expiresAt: data.transaction.expiresAt,
        chain: chain,
      });

      // Calculate initial time remaining
      const expiresAt = new Date(data.transaction.expiresAt).getTime();
      const now = Date.now();
      setTimeRemaining(Math.max(0, Math.floor((expiresAt - now) / 1000)));

      setShowDepositModal(true);
      setAmount(""); // Clear input

      toast({
        title: "Order Created! 📋",
        description: "Send crypto to the address shown to complete your sale",
      });
    } catch (error: any) {
      console.error('Error creating sell order:', error);
      toast({
        title: "Failed to Create Order",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExpiry = () => {
    toast({
      title: "Order Expired ⏱️",
      description: "This deposit address is no longer valid. Create a new order to continue.",
      variant: "destructive",
    });
    setShowDepositModal(false);
    setDepositInfo(null);
  };

  const copyAddress = async () => {
    if (!depositInfo) return;

    try {
      await navigator.clipboard.writeText(depositInfo.depositAddress);
      setCopied(true);
      toast({
        title: "Copied! ✅",
        description: "Deposit address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy the address manually",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getExplorerUrl = (chain: ChainType, hash: string): string => {
    const explorers: Record<ChainType, string> = {
      btc: `https://mempool.space/tx/${hash}`,
      tron: `https://tronscan.org/#/transaction/${hash}`,
      ethereum: `https://etherscan.io/tx/${hash}`,
      polygon: `https://polygonscan.com/tx/${hash}`,
      bsc: `https://bscscan.com/tx/${hash}`,
    };
    return explorers[chain];
  };

  const getNetworkName = (chain: ChainType): string => {
    const names: Record<ChainType, string> = {
      btc: "Bitcoin",
      tron: "TRON (TRC20)",
      ethereum: "Ethereum (ERC20)",
      polygon: "Polygon",
      bsc: "BSC (BEP20)",
    };
    return names[chain];
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
            <Bitcoin className="w-7 h-7 text-white" />
            <h1 className="text-2xl font-bold text-white">Sell Cryptocurrency</h1>
          </div>
          <div className="w-40" /> {/* Spacer for centering */}
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto p-6 max-w-2xl">
        {/* Hero Section */}
        <div className="text-center mb-8 pt-4">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Convert Crypto to Cash
          </h2>
          <p className="text-muted-foreground">
            Send us your Bitcoin, USDT, or USDC and receive Naira instantly
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Bitcoin className="w-7 h-7 text-primary" />
              Sell Cryptocurrency
            </CardTitle>
            <CardDescription>
              Convert your crypto to Naira and receive it in your crypto balance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Crypto Selection */}
            <div className="space-y-2">
              <Label htmlFor="crypto-select" className="text-base font-medium">
                Select Cryptocurrency
              </Label>
              <Select value={crypto} onValueChange={(v) => setCrypto(v as CryptoType)}>
                <SelectTrigger id="crypto-select" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC" className="cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <Bitcoin className="w-5 h-5 text-orange-500" />
                      <div>
                        <div className="font-medium">Bitcoin (BTC)</div>
                        <div className="text-xs text-muted-foreground">Lightning Network</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="USDT" disabled className="cursor-not-allowed opacity-50">
                    <div className="flex items-center gap-3 py-1">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          Tether (USDT)
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Coming Soon</span>
                        </div>
                        <div className="text-xs text-muted-foreground">TRC20 - Waiting on API clarification</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="USDC" disabled className="cursor-not-allowed opacity-50">
                    <div className="flex items-center gap-3 py-1">
                      <DollarSign className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          USD Coin (USDC)
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Coming Soon</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Multiple networks - Waiting on API clarification</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Stablecoin Notice */}
              {(crypto === 'USDT' || crypto === 'USDC') && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    ℹ️ <strong>USDT/USDC support is temporarily disabled</strong> while we clarify the correct API integration with Bitnob. 
                    Bitcoin (Lightning) is fully operational and ready to use.
                  </p>
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount-input" className="text-base font-medium">
                Amount to Sell
              </Label>
              <div className="relative">
                <Input
                  id="amount-input"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step={crypto === "BTC" ? "0.00000001" : "0.01"}
                  min="0"
                  className="h-14 text-lg pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  {crypto}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {crypto === "BTC" ? "Minimum: 0.0001 BTC" : "Minimum: 1 USDT/USDC"}
              </p>
            </div>

            {/* Rate Preview Card */}
            {loadingRates ? (
              <Card className="bg-muted">
                <CardContent className="pt-6 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-muted-foreground">Loading rates...</span>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Exchange Rate:</span>
                      <span className="font-semibold text-lg">
                        1 {crypto} = ₦{rates[crypto]?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Markup:</span>
                      <span className="text-sm text-green-700 font-medium">5% included ✓</span>
                    </div>
                    <div className="border-t border-green-200 pt-3 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-base">You'll Receive:</span>
                        <span className="text-3xl font-bold text-green-700">
                          ₦{parseFloat(ngnAmount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Daily Limit Info */}
            {dailyLimit.used > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-blue-900">Daily Limit</p>
                    <p className="text-blue-700 mt-1">
                      Used: ₦{dailyLimit.used.toLocaleString()} / ₦1,000,000
                      <br />
                      Remaining: ₦{dailyLimit.remaining.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sell Button */}
            <Button
              onClick={handleSell}
              className="w-full h-14 text-lg"
              size="lg"
              disabled={loading || loadingRates || !amount || parseFloat(amount) <= 0 || crypto !== 'BTC'}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Order...
                </>
              ) : crypto !== 'BTC' ? (
                <>
                  <AlertCircle className="w-5 h-5 mr-2" />
                  {crypto} Temporarily Unavailable
                </>
              ) : (
                <>
                  <TrendingDown className="w-5 h-5 mr-2" />
                  Sell {crypto}
                </>
              )}
            </Button>

            {/* Info Footer */}
            <div className="pt-4 border-t space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Transaction time: 5-15 minutes after blockchain confirmation
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Funds added to your crypto balance automatically
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deposit Instructions Modal */}
      <Dialog open={showDepositModal} onOpenChange={setShowDepositModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Send {depositInfo?.cryptoType} to Complete Sale
            </DialogTitle>
            <DialogDescription>
              Send exactly <strong>{depositInfo?.cryptoAmount} {depositInfo?.cryptoType}</strong> to the address below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* QR Code */}
            <div className="flex justify-center p-4 bg-white rounded-lg border-2 border-dashed">
              {depositInfo && (
                <QRCode 
                  value={depositInfo.depositAddress} 
                  size={200}
                  level="M"
                />
              )}
            </div>

            {/* Deposit Address */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Deposit Address</Label>
              
              {/* Network Warning - PROMINENT */}
              <div className="p-3 bg-red-50 border-2 border-red-400 rounded-lg mb-3">
                <p className="text-sm font-bold text-red-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  CRITICAL: Use {depositInfo && getNetworkName(depositInfo.chain)} Network ONLY!
                </p>
                <p className="text-xs text-red-800 mt-2">
                  {depositInfo?.chain === 'tron' 
                    ? '⚠️ Do NOT send from Bitcoin, Ethereum, or other networks. This is a TRON address (starts with T). Sending from wrong network = PERMANENT LOSS.'
                    : depositInfo?.chain === 'btc'
                    ? '⚠️ Do NOT send from TRON, Ethereum, or other networks. This is a Bitcoin Lightning address. Sending from wrong network = PERMANENT LOSS.'
                    : '⚠️ Use the correct network only. Wrong network = PERMANENT LOSS of funds.'
                  }
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  value={depositInfo?.depositAddress || ""}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyAddress}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Network: {depositInfo && getNetworkName(depositInfo.chain)}
              </p>
            </div>

            {/* Countdown Timer */}
            <div className={`p-4 rounded-lg border-2 ${
              timeRemaining < 300 ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`font-medium text-sm ${
                  timeRemaining < 300 ? 'text-red-900' : 'text-yellow-900'
                }`}>Time Remaining:</span>
                <span className={`text-2xl font-bold tabular-nums ${
                  timeRemaining < 300 ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              {timeRemaining < 300 && (
                <p className="text-xs text-red-700 mt-2">
                  ⚠️ Order expires soon! Complete payment now.
                </p>
              )}
            </div>

            {/* Important Warnings */}
            <div className="space-y-2 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm font-semibold text-orange-900">⚠️ Important Instructions:</p>
              <ul className="text-xs text-orange-800 space-y-1 list-disc list-inside">
                <li>Send <strong>exactly {depositInfo?.cryptoAmount} {depositInfo?.cryptoType}</strong> (not more, not less)</li>
                <li>Use <strong>{depositInfo && getNetworkName(depositInfo.chain)}</strong> network in your wallet app</li>
                <li>
                  {depositInfo?.chain === 'tron' && (
                    <>Your wallet MUST show "<strong>TRC-20</strong>" or "<strong>TRON</strong>" when selecting network</>
                  )}
                  {depositInfo?.chain === 'btc' && (
                    <>Your wallet MUST show "<strong>Bitcoin</strong>" or "<strong>BTC Lightning</strong>" when selecting network</>
                  )}
                  {depositInfo?.chain !== 'tron' && depositInfo?.chain !== 'btc' && (
                    <>Select the correct network in your wallet</>
                  )}
                </li>
                <li>Funds will be credited after 3 blockchain confirmations (~5-15 minutes)</li>
                <li>Wrong network = <strong className="text-red-700">PERMANENT LOSS</strong> of your crypto</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDepositModal(false);
                  navigate('/crypto-history');
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Status
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={() => {
                  toast({
                    title: "Great! 👍",
                    description: "Redirecting to transaction history...",
                  });
                  setTimeout(() => {
                    setShowDepositModal(false);
                    navigate('/crypto-history');
                  }, 1000);
                }}
              >
                I've Sent Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
