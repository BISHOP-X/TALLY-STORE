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

  const getStats = () => {
    const completed = orders.filter(o => o.status === 'completed').length
    const processing = orders.filter(o => o.status === 'processing').length
    const failed = orders.filter(o => o.status === 'failed').length
    const totalSpent = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.amount || 0), 0)
    
    return { completed, processing, failed, totalSpent }
  }

  const stats = getStats()

  return (
    <div className="min-h-screen bg-background">
      <NavbarAuth />
      
      <div className="container mx-auto px-6 pt-24 pb-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Order History</h1>
          <p className="text-muted-foreground">View and download your purchased accounts</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-yellow-600" />
                </div>
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
                  <p className="text-2xl font-bold">₦{stats.totalSpent.toLocaleString()}</p>
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
                    placeholder="Search orders by product name, username, or order ID..."
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
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading your orders...</p>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
              <p className="text-muted-foreground mb-4">
                {orders.length === 0 
                  ? "You haven't made any purchases yet." 
                  : "No orders match your current filters."}
              </p>
              <Link to="/products">
                <Button>Browse Products</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const StatusIcon = statusIcons[order.status as keyof typeof statusIcons]
              const { date, time } = formatDate(order.created_at)
              
              return (
                <Card key={order.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            @{order.account_details?.username || 'Account'}
                          </h3>
                          <Badge variant={statusColors[order.status as keyof typeof statusColors]}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                          <Badge variant="outline">{order.account_details?.category || 'Social Media'}</Badge>
                        </div>
                        
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Order ID:</span> {order.id.slice(0, 8)}...
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

                        {order.account_details && (
                          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">Account Details:</h4>
                            <div className="grid md:grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Product:</span> {order.account_details.product_name}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Category:</span> {order.account_details.category}
                              </div>
                              {order.account_details.username && (
                                <div>
                                  <span className="text-muted-foreground">Username:</span> @{order.account_details.username}
                                </div>
                              )}
                              {order.account_details.email && (
                                <div>
                                  <span className="text-muted-foreground">Email:</span> {order.account_details.email}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(order)}
                          disabled={order.status !== 'completed'}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
