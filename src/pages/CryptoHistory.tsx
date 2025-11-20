import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bitcoin, 
  DollarSign, 
  ArrowDownCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Copy,
  ExternalLink,
  Loader2,
  History,
  TrendingDown,
  Banknote
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import QRCode from "react-qr-code";

interface CryptoTransaction {
  id: string;
  crypto_type: 'BTC' | 'USDT' | 'USDC';
  crypto_amount: number;
  naira_amount: number;
  exchange_rate: number;
  deposit_address: string;
  chain: string;
  status: 'pending' | 'confirmed' | 'completed' | 'expired' | 'failed';
  confirmations: number;
  tx_hash: string | null;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
}

interface CryptoWithdrawal {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'pending_approval';
  payment_reference: string | null;
  created_at: string;
  processed_at: string | null;
}

export default function CryptoHistory() {
  const [transactions, setTransactions] = useState<CryptoTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<CryptoWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<CryptoTransaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
    
    // Auto-refresh every 30 seconds for pending transactions
    const interval = setInterval(() => {
      fetchHistory();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Fetch crypto transactions
      const { data: txData, error: txError } = await supabase
        .from('crypto_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (txError) throw txError;
      setTransactions(txData || []);

      // Fetch withdrawals
      const { data: wdData, error: wdError } = await supabase
        .from('crypto_withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (wdError) throw wdError;
      setWithdrawals(wdData || []);

    } catch (error: any) {
      console.error('Error fetching history:', error);
      toast({
        title: "Error",
        description: "Failed to load transaction history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { 
        variant: "secondary", 
        icon: Clock, 
        label: "Pending Payment" 
      },
      confirmed: { 
        variant: "default", 
        icon: AlertCircle, 
        label: "Confirming" 
      },
      completed: { 
        variant: "default", 
        icon: CheckCircle2, 
        label: "Completed" 
      },
      expired: { 
        variant: "destructive", 
        icon: XCircle, 
        label: "Expired" 
      },
      failed: { 
        variant: "destructive", 
        icon: XCircle, 
        label: "Failed" 
      },
      processing: { 
        variant: "default", 
        icon: Loader2, 
        label: "Processing" 
      },
      pending_approval: { 
        variant: "secondary", 
        icon: AlertCircle, 
        label: "Pending Approval" 
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  const getCryptoIcon = (crypto: string) => {
    switch (crypto) {
      case 'BTC':
        return <Bitcoin className="w-4 h-4 text-orange-500" />;
      case 'USDT':
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case 'USDC':
        return <DollarSign className="w-4 h-4 text-blue-500" />;
      default:
        return <Bitcoin className="w-4 h-4" />;
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied! ✅",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const getExplorerUrl = (chain: string, hash: string): string => {
    const explorers: Record<string, string> = {
      btc: `https://mempool.space/tx/${hash}`,
      tron: `https://tronscan.org/#/transaction/${hash}`,
      ethereum: `https://etherscan.io/tx/${hash}`,
      polygon: `https://polygonscan.com/tx/${hash}`,
      bsc: `https://bscscan.com/tx/${hash}`,
    };
    return explorers[chain] || '#';
  };

  const getNetworkName = (chain: string): string => {
    const names: Record<string, string> = {
      btc: "Bitcoin Lightning",
      tron: "TRON (TRC20)",
      ethereum: "Ethereum (ERC20)",
      polygon: "Polygon",
      bsc: "BSC (BEP20)",
    };
    return names[chain] || chain.toUpperCase();
  };

  const getTimeRemaining = (expiresAt: string): string => {
    const now = new Date().getTime();
    const expires = new Date(expiresAt).getTime();
    const remaining = Math.max(0, Math.floor((expires - now) / 1000));
    
    if (remaining === 0) return "Expired";
    
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const viewTransactionDetails = (tx: CryptoTransaction) => {
    setSelectedTransaction(tx);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading transaction history...</p>
        </div>
      </div>
    );
  }

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
            <History className="w-7 h-7 text-white" />
            <h1 className="text-2xl font-bold text-white">Crypto History</h1>
          </div>
          <div className="w-40" /> {/* Spacer */}
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Button
            onClick={() => navigate('/crypto-exchange')}
            className="h-16 text-lg gap-3"
            size="lg"
          >
            <TrendingDown className="w-6 h-6" />
            Sell More Crypto
          </Button>
          <Button
            onClick={() => navigate('/crypto-withdrawal')}
            variant="outline"
            className="h-16 text-lg gap-3"
            size="lg"
          >
            <Banknote className="w-6 h-6" />
            Withdraw to Bank
          </Button>
        </div>

        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="transactions" className="text-base gap-2">
              <ArrowDownCircle className="w-4 h-4" />
              Crypto Sales ({transactions.length})
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="text-base gap-2">
              <Banknote className="w-4 h-4" />
              Withdrawals ({withdrawals.length})
            </TabsTrigger>
          </TabsList>

          {/* Crypto Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            {transactions.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Bitcoin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">No crypto transactions yet</p>
                  <p className="text-muted-foreground mb-6">
                    Start selling your crypto to get Naira instantly
                  </p>
                  <Button onClick={() => navigate('/crypto-exchange')}>
                    Sell Crypto Now
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Crypto Sale Transactions</CardTitle>
                  <CardDescription>
                    Track your crypto-to-Naira conversions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Crypto</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Naira Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(tx.created_at).toLocaleDateString()}
                                <br />
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getCryptoIcon(tx.crypto_type)}
                                <span className="font-medium">{tx.crypto_type}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              {tx.crypto_amount} {tx.crypto_type}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              ₦{tx.naira_amount.toLocaleString()}
                            </TableCell>
                            <TableCell>{getStatusBadge(tx.status)}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewTransactionDetails(tx)}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-4">
            {withdrawals.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Banknote className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">No withdrawals yet</p>
                  <p className="text-muted-foreground mb-6">
                    Withdraw your crypto balance to your bank account
                  </p>
                  <Button onClick={() => navigate('/crypto-withdrawal')}>
                    Withdraw Now
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Bank Withdrawals</CardTitle>
                  <CardDescription>
                    Track your bank withdrawal requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Bank Account</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Fee</TableHead>
                          <TableHead>Net Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawals.map((wd) => (
                          <TableRow key={wd.id}>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(wd.created_at).toLocaleDateString()}
                                <br />
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(wd.created_at), { addSuffix: true })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">{wd.account_name}</div>
                                <div className="text-muted-foreground">
                                  {wd.bank_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {wd.account_number}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              ₦{wd.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-red-600 font-mono">
                              -₦{wd.fee.toLocaleString()}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              ₦{wd.net_amount.toLocaleString()}
                            </TableCell>
                            <TableCell>{getStatusBadge(wd.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Transaction Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTransaction && getCryptoIcon(selectedTransaction.crypto_type)}
              Transaction Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this transaction
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4 py-4">
              {/* Status Banner */}
              <div className={`p-4 rounded-lg border-2 ${
                selectedTransaction.status === 'completed' 
                  ? 'bg-green-50 border-green-300' 
                  : selectedTransaction.status === 'pending'
                  ? 'bg-yellow-50 border-yellow-300'
                  : selectedTransaction.status === 'confirmed'
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  {getStatusBadge(selectedTransaction.status)}
                </div>
                {selectedTransaction.status === 'pending' && (
                  <p className="text-xs mt-2 text-muted-foreground">
                    ⏳ Time remaining: {getTimeRemaining(selectedTransaction.expires_at)}
                  </p>
                )}
                {selectedTransaction.status === 'confirmed' && (
                  <p className="text-xs mt-2 text-blue-700">
                    🔄 Confirmations: {selectedTransaction.confirmations}/3
                  </p>
                )}
              </div>

              {/* QR Code (for pending transactions) */}
              {selectedTransaction.status === 'pending' && (
                <div className="flex justify-center p-4 bg-white rounded-lg border-2 border-dashed">
                  <QRCode 
                    value={selectedTransaction.deposit_address} 
                    size={180}
                    level="M"
                  />
                </div>
              )}

              {/* Transaction Info */}
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono text-sm">{selectedTransaction.id.slice(0, 8)}...</span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Cryptocurrency:</span>
                  <span className="font-medium">{selectedTransaction.crypto_amount} {selectedTransaction.crypto_type}</span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Naira Value:</span>
                  <span className="font-semibold text-green-600">₦{selectedTransaction.naira_amount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Exchange Rate:</span>
                  <span className="font-mono">₦{selectedTransaction.exchange_rate.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Network:</span>
                  <span className="font-medium">{getNetworkName(selectedTransaction.chain)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Deposit Address:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">
                      {selectedTransaction.deposit_address.slice(0, 12)}...
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(selectedTransaction.deposit_address, 'Address')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {selectedTransaction.tx_hash && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Transaction Hash:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {selectedTransaction.tx_hash.slice(0, 12)}...
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(getExplorerUrl(selectedTransaction.chain, selectedTransaction.tx_hash!), '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="text-sm">
                    {new Date(selectedTransaction.created_at).toLocaleString()}
                  </span>
                </div>

                {selectedTransaction.completed_at && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="text-sm">
                      {new Date(selectedTransaction.completed_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4">
                <Button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
