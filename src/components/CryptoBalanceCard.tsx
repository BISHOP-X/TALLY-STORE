import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bitcoin, TrendingUp, ArrowRightLeft, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/SimpleAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CryptoBalanceCardProps {
  onWithdrawClick?: () => void;
}

export function CryptoBalanceCard({ onWithdrawClick }: CryptoBalanceCardProps) {
  const { isAdmin } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [tallyStoreBalance, setTallyStoreBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  // 🔒 BETA: Only show crypto features to admins during testing phase
  if (!isAdmin) {
    return null;
  }

  // Fetch user balances
  useEffect(() => {
    fetchBalances();

    // Subscribe to balance changes
    const channel = supabase
      .channel('crypto_balance_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          fetchBalances();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBalances = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('crypto_balance, wallet_balance')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setBalance(profile?.crypto_balance || 0);
      setTallyStoreBalance(profile?.wallet_balance || 0);
    } catch (error) {
      console.error('Error fetching balances:', error);
      toast({
        title: "Error",
        description: "Failed to load crypto balance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransferClick = () => {
    if (balance === 0) {
      toast({
        title: "No Balance",
        description: "You don't have any crypto balance to transfer",
        variant: "destructive",
      });
      return;
    }
    setShowTransferModal(true);
  };

  const handleTransferAll = () => {
    setTransferAmount(balance.toString());
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);

    // Validation
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > balance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ₦${balance.toLocaleString()} available`,
        variant: "destructive",
      });
      return;
    }

    setTransferring(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Not authenticated");

      // Call the transfer function
      const { data, error } = await supabase.rpc('transfer_crypto_to_wallet', {
        p_user_id: user.id,
        p_amount: amount,
      });

      if (error) throw error;

      // Create balance transfer record
      await supabase.from('balance_transfers').insert({
        user_id: user.id,
        amount: amount,
        from_balance: 'crypto',
        to_balance: 'tallystore',
      });

      // Refresh balances
      await fetchBalances();

      toast({
        title: "Transfer Successful! ✅",
        description: `₦${amount.toLocaleString()} transferred to your TallyStore balance`,
      });

      // Close modal and reset
      setShowTransferModal(false);
      setTransferAmount("");
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to transfer funds. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  const handleWithdrawClick = () => {
    // Always navigate to crypto exchange page to sell crypto
    navigate('/crypto-exchange');
  };

  // Calculate percentage of max balance (for visual feedback)
  const balancePercentage = Math.min((balance / 100000) * 100, 100);

  return (
    <>
      <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-2">
              <Bitcoin className="w-6 h-6" />
              <span>Crypto Balance</span>
            </div>
            {loading && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balance Display */}
          <div>
            <div className="text-4xl font-bold tracking-tight mb-1">
              {loading ? (
                <span className="text-3xl">Loading...</span>
              ) : (
                <>₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
              )}
            </div>
            <p className="text-sm text-orange-100">
              {balance === 0 
                ? "Sell crypto to get started" 
                : "Earned from selling crypto"}
            </p>
          </div>

          {/* Visual Balance Bar */}
          {balance > 0 && (
            <div className="w-full h-1 bg-orange-400/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${balancePercentage}%` }}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {balance === 0 ? (
              // When no balance - show Sell Crypto button
              <Button 
                onClick={() => navigate('/crypto-exchange')}
                className="w-full bg-white hover:bg-gray-100 text-orange-600 font-semibold shadow-sm"
                disabled={loading}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Sell Crypto
              </Button>
            ) : (
              // When has balance - show Transfer and Withdraw buttons
              <>
                <Button 
                  onClick={handleTransferClick}
                  variant="secondary"
                  className="flex-1 bg-white hover:bg-gray-100 text-orange-600 font-semibold shadow-sm"
                  disabled={loading}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Transfer
                </Button>
                <Button 
                  onClick={() => navigate('/crypto-withdrawal')}
                  variant="outline"
                  className="flex-1 border-2 border-white text-white hover:bg-white/20 hover:text-white font-semibold"
                  disabled={loading}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
              </>
            )}
          </div>

          {/* Info Footer */}
          {balance > 0 && (
            <div className="pt-2 border-t border-orange-400/30">
              <p className="text-xs text-orange-100">
                💡 Transfer to TallyStore to buy products, or withdraw to your bank account
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Modal */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-orange-600" />
              Transfer to TallyStore Balance
            </DialogTitle>
            <DialogDescription>
              Move funds from your crypto balance to your main TallyStore balance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Balances */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Crypto Balance</p>
                <p className="text-lg font-bold text-orange-600">
                  ₦{balance.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">TallyStore Balance</p>
                <p className="text-lg font-bold text-green-600">
                  ₦{tallyStoreBalance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="transfer-amount">Amount to Transfer</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ₦
                  </span>
                  <Input
                    id="transfer-amount"
                    type="number"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="pl-7"
                    min="0"
                    max={balance}
                    step="0.01"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTransferAll}
                  disabled={balance === 0}
                >
                  Max
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Available: ₦{balance.toLocaleString()}
              </p>
            </div>

            {/* Preview */}
            {parseFloat(transferAmount) > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">
                      Transfer Preview
                    </p>
                    <div className="mt-2 space-y-1 text-sm text-green-800">
                      <div className="flex justify-between">
                        <span>Crypto Balance:</span>
                        <span className="font-medium">
                          -₦{parseFloat(transferAmount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>TallyStore Balance:</span>
                        <span className="font-medium text-green-600">
                          +₦{parseFloat(transferAmount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800">
                <strong>One-way transfer:</strong> Funds transferred to TallyStore balance cannot be moved back to crypto balance. You can use them to buy products or withdraw to your bank.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTransferModal(false);
                setTransferAmount("");
              }}
              disabled={transferring}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleTransfer}
              disabled={
                transferring ||
                !transferAmount ||
                parseFloat(transferAmount) <= 0 ||
                parseFloat(transferAmount) > balance
              }
              className="bg-orange-600 hover:bg-orange-700"
            >
              {transferring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Confirm Transfer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
