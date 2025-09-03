import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Wallet, 
  CreditCard, 
  History, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import Navbar from '@/components/NavbarAuth'
import Footer from '@/components/Footer'

// Mock wallet data
const mockWalletData = {
  balance: 25000,
  totalSpent: 150000,
  totalTopups: 175000,
  lastTopup: '2024-01-15'
}

// Mock transaction history
const mockTransactions = [
  {
    id: 1,
    type: 'topup',
    amount: 10000,
    status: 'completed',
    date: '2024-01-15',
    reference: 'TOP_001234',
    description: 'Wallet top-up via Ercas Pay'
  },
  {
    id: 2,
    type: 'purchase',
    amount: -15000,
    status: 'completed',
    date: '2024-01-14',
    reference: 'PUR_005678',
    description: 'Instagram account @lifestyle_influencer'
  },
  {
    id: 3,
    type: 'topup',
    amount: 25000,
    status: 'completed',
    date: '2024-01-10',
    reference: 'TOP_001235',
    description: 'Wallet top-up via Ercas Pay'
  },
  {
    id: 4,
    type: 'purchase',
    amount: -12000,
    status: 'completed',
    date: '2024-01-09',
    reference: 'PUR_005679',
    description: 'YouTube channel @tech_reviews'
  },
  {
    id: 5,
    type: 'topup',
    amount: 50000,
    status: 'pending',
    date: '2024-01-08',
    reference: 'TOP_001236',
    description: 'Wallet top-up via Ercas Pay (Processing)'
  }
]

export default function WalletPage() {
  const [topupAmount, setTopupAmount] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('ercas')

  const handleTopup = () => {
    const amount = parseFloat(topupAmount)
    if (amount < 1000) {
      alert('Minimum top-up amount is ₦1,000')
      return
    }
    
    // Mock payment processing
    alert(`Processing ₦${amount.toLocaleString()} top-up via Ercas Pay...`)
    setTopupAmount('')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navbar />
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Wallet Management</h1>
            <p className="text-muted-foreground">
              Manage your wallet balance and view transaction history
            </p>
          </div>

          {/* Wallet Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span>Current Balance</span>
                  <Wallet className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">
                  ₦{mockWalletData.balance.toLocaleString()}
                </div>
                <p className="text-white/80 text-sm">
                  Available for purchases
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-green-600">
                  <span>Total Top-ups</span>
                  <ArrowUpRight className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">
                  ₦{mockWalletData.totalTopups.toLocaleString()}
                </div>
                <p className="text-muted-foreground text-sm">
                  Lifetime deposits
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-blue-600">
                  <span>Total Spent</span>
                  <ArrowDownRight className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">
                  ₦{mockWalletData.totalSpent.toLocaleString()}
                </div>
                <p className="text-muted-foreground text-sm">
                  On purchases
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="topup" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="topup">Top Up Wallet</TabsTrigger>
              <TabsTrigger value="history">Transaction History</TabsTrigger>
            </TabsList>

            {/* Top-up Tab */}
            <TabsContent value="topup" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add Money to Wallet
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Minimum top-up amount is ₦1,000. Payments are processed securely via Ercas Pay.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Quick Amount Buttons */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Quick Amounts
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[1000, 5000, 10000, 25000].map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          onClick={() => setTopupAmount(amount.toString())}
                          className="h-12"
                        >
                          ₦{amount.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Amount */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Custom Amount
                    </label>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="Enter amount (min ₦1,000)"
                          value={topupAmount}
                          onChange={(e) => setTopupAmount(e.target.value)}
                          min="1000"
                          step="100"
                        />
                      </div>
                      <Button 
                        onClick={handleTopup}
                        disabled={!topupAmount || parseFloat(topupAmount) < 1000}
                        className="px-8"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay Now
                      </Button>
                    </div>
                    {topupAmount && parseFloat(topupAmount) < 1000 && (
                      <p className="text-sm text-red-500 mt-1">
                        Minimum amount is ₦1,000
                      </p>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Payment Method
                    </label>
                    <Card className="border-2 border-primary/20">
                      <CardContent className="flex items-center gap-3 pt-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">Ercas Pay</h3>
                          <p className="text-sm text-muted-foreground">
                            Secure payment gateway supporting all major cards and bank transfers
                          </p>
                        </div>
                        <Badge variant="default">
                          Recommended
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Transaction History
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Complete history of all wallet transactions
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {transaction.type === 'topup' ? (
                              <ArrowUpRight className="h-5 w-5 text-green-600" />
                            ) : (
                              <ArrowDownRight className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {transaction.type === 'topup' ? 'Wallet Top-up' : 'Purchase'}
                              </span>
                              {getStatusIcon(transaction.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {transaction.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {transaction.date}
                              </span>
                              <span>Ref: {transaction.reference}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`text-lg font-semibold ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}₦{Math.abs(transaction.amount).toLocaleString()}
                          </div>
                          <Badge 
                            variant={
                              transaction.status === 'completed' ? 'default' :
                              transaction.status === 'pending' ? 'secondary' : 'destructive'
                            }
                            className="text-xs"
                          >
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  )
}
