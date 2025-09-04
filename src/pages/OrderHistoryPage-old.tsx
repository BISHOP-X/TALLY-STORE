import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, Search, Filter, Package, Clock, CheckCircle, XCircle, RefreshCw, Eye, Loader2 } from 'lucide-react'
import NavbarAuth from '@/components/NavbarAuth'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/SimpleAuth'
import { getUserOrders } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

const statusColors = {
  completed: 'default',
  processing: 'secondary', 
  failed: 'destructive',
  pending: 'outline'
} as const

const statusIcons = {
  completed: CheckCircle,
  processing: RefreshCw,
  failed: XCircle,
  pending: Clock
}

export default function OrderHistoryPage() {
  const location = useLocation()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [orders, setOrders] = useState<any[]>([])
  const [filteredOrders, setFilteredOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Check for purchase success message
  useEffect(() => {
    if (location.state?.purchaseSuccess) {
      toast({
        title: "Purchase Successful! 🎉",
        description: `Account @${location.state.accountUsername} has been added to your orders`,
      })
    }
  }, [location.state, toast])

  // Load real orders from Supabase
  useEffect(() => {
    const loadOrders = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        console.log('🔄 Loading orders for user:', user.id)
        
        const ordersData = await getUserOrders(user.id)
        console.log('✅ Orders loaded:', ordersData)
        
        setOrders(ordersData)
        setFilteredOrders(ordersData)
        setLoading(false)
      } catch (error) {
        console.error('Error loading orders:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load order history"
        })
        setLoading(false)
      }
    }

    loadOrders()
  }, [user, toast])

  useEffect(() => {
    // Filter orders based on search and filters
    let filtered = orders

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.account_details?.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.account_details?.username?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(order => order.account_details?.category === categoryFilter)
    }

    setFilteredOrders(filtered)
  }, [orders, searchTerm, statusFilter, categoryFilter])

  const handleDownload = (order: any) => {
    const credentials = {
      orderId: order.id,
      productName: order.account_details?.product_name || 'Unknown Product',
      category: order.account_details?.category || 'Unknown Category',
      purchaseDate: order.created_at,
      amount: order.amount,
      username: order.account_details?.username,
      password: order.account_details?.password,
      email: order.account_details?.email,
      email_password: order.account_details?.email_password,
      two_fa_code: order.account_details?.two_fa_code,
      additional_info: order.account_details?.additional_info
    }

    const blob = new Blob([JSON.stringify(credentials, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${order.id}-credentials.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const getTotalSpent = () => {
    return orders
      .filter(order => order.status === 'delivered')
      .reduce((total, order) => total + order.amount, 0)
  }

  const getOrderStats = () => {
    const total = orders.length
    const delivered = orders.filter(o => o.status === 'delivered').length
    const processing = orders.filter(o => o.status === 'processing').length
    const failed = orders.filter(o => o.status === 'failed').length

    return { total, delivered, processing, failed }
  }

  const stats = getOrderStats()

  return (
    <div className="min-h-screen bg-background">
      <NavbarAuth />
      
      <div className="container mx-auto px-6 pt-24 pb-12 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Order History</h1>
          <p className="text-muted-foreground">
            Track your purchases and download your account credentials
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Delivered</p>
                  <p className="text-2xl font-bold">{stats.delivered}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold">{stats.processing}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold">₦</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold">₦{getTotalSpent().toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders by product name or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                  <SelectItem value="Twitter">Twitter</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="YouTube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : "You haven't made any purchases yet"
                }
              </p>
              {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
                <Link to="/products">
                  <Button>
                    <Package className="mr-2 h-4 w-4" />
                    Browse Products
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const StatusIcon = statusIcons[order.status as keyof typeof statusIcons]
              const { date, time } = formatDate(order.purchaseDate)
              
              return (
                <Card key={order.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{order.productName}</h3>
                          <Badge variant={statusColors[order.status as keyof typeof statusColors]}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                          <Badge variant="outline">{order.category}</Badge>
                        </div>
                        
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Order ID:</span> {order.id}
                          </div>
                          <div>
                            <span className="font-medium">Amount:</span> ₦{order.amount.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {date}
                          </div>
                          <div>
                            <span className="font-medium">Time:</span> {time}
                          </div>
                        </div>

                        {order.credentials && (
                          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">Account Details:</h4>
                            <div className="grid md:grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Followers:</span> {order.followers}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Engagement:</span> {order.engagement}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Link to={`/product/${order.productId}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            View Product
                          </Button>
                        </Link>
                        
                        {order.status === 'delivered' && order.credentials && (
                          <Button onClick={() => handleDownload(order)} size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        )}
                        
                        {order.status === 'failed' && (
                          <Button variant="destructive" size="sm">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
            <CardDescription>
              Having issues with your orders or downloads?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Alert className="flex-1">
                <AlertDescription>
                  If you're having trouble downloading your credentials or accessing your purchased accounts,
                  please contact our support team for assistance.
                </AlertDescription>
              </Alert>
              <Button variant="outline">
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  )
}
