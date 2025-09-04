import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Wallet, ShoppingBag, Download, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/SimpleAuth'

export default function Dashboard() {
  const { user, walletBalance, signOut } = useAuth()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">TallyStore</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user?.email?.split('@')[0] || 'User'}!
            </p>
          </div>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Wallet Balance Card */}
        <Card className="mb-8 bg-gradient-primary text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              ₦{walletBalance?.toLocaleString() || '0.00'}
            </div>
            <Link to="/wallet">
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white">
                Top Up Wallet
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link to="/products">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Browse Products</h3>
                <p className="text-sm text-muted-foreground">
                  Explore our premium social media accounts
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/orders">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Download className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Order History</h3>
                <p className="text-sm text-muted-foreground">
                  View and re-download your purchases
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/profile">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Settings className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Account Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your profile and preferences
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity. Start by topping up your wallet!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
