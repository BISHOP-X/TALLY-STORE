import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, CreditCard, Wallet, ArrowLeft, Shield, Clock } from 'lucide-react'
import NavbarAuth from '@/components/NavbarAuth'
import Footer from '@/components/Footer'

// Mock product data
const mockProducts = [
  {
    id: '1',
    name: 'Instagram Premium Account',
    price: 2500,
    category: 'Instagram',
    followers: '10K-50K',
    engagement: 'High',
    features: ['Email access included', 'Phone verified', 'Active followers', 'High engagement']
  },
  {
    id: '2',
    name: 'TikTok Creator Account', 
    price: 1800,
    category: 'TikTok',
    followers: '5K-25K',
    engagement: 'Very High',
    features: ['Email access included', 'High viral potential', 'Active community', 'Creator fund eligible']
  }
]

export default function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const productId = searchParams.get('product')
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [walletBalance] = useState(25000) // Mock wallet balance
  const [paymentMethod, setPaymentMethod] = useState('wallet')

  useEffect(() => {
    if (productId) {
      const foundProduct = mockProducts.find(p => p.id === productId)
      setProduct(foundProduct)
    }
  }, [productId])

  const handlePurchase = async () => {
    if (!product) return

    setLoading(true)
    
    try {
      // Simulate purchase process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Redirect to success page or orders
      navigate('/orders?purchase=success')
    } catch (error) {
      console.error('Purchase failed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <NavbarAuth />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">The product you're trying to purchase doesn't exist.</p>
            <Link to="/products">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const canAfford = walletBalance >= product.price
  const tax = Math.round(product.price * 0.075) // 7.5% VAT
  const total = product.price + tax

  return (
    <div className="min-h-screen bg-background">
      <NavbarAuth />
      
      <div className="container mx-auto px-6 pt-24 pb-12 max-w-4xl">
        <div className="mb-6">
          <Link to={`/product/${productId}`} className="text-muted-foreground hover:text-primary flex items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Product
          </Link>
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="text-muted-foreground">Complete your purchase</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Details */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.category} Account</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{product.followers} followers</Badge>
                      <Badge variant="outline">{product.engagement} engagement</Badge>
                    </div>
                  </div>
                  <span className="font-semibold">₦{product.price.toLocaleString()}</span>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₦{product.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT (7.5%):</span>
                    <span>₦{tax.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total:</span>
                    <span>₦{total.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What's Included */}
            <Card>
              <CardHeader>
                <CardTitle>What's Included</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {product.features.map((feature: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Instant delivery via email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Secure transaction</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Section */}
          <div className="space-y-6">
            {/* Wallet Balance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Wallet Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary mb-2">
                  ₦{walletBalance.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Available for purchases
                </p>
                
                {!canAfford && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                      Insufficient balance. You need ₦{(total - walletBalance).toLocaleString()} more.
                    </AlertDescription>
                  </Alert>
                )}

                {canAfford && (
                  <Alert className="border-green-200 bg-green-50 text-green-800 mb-4">
                    <AlertDescription>
                      You have sufficient balance for this purchase.
                    </AlertDescription>
                  </Alert>
                )}

                <Link to="/wallet">
                  <Button variant="outline" className="w-full">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Top Up Wallet
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Purchase Button */}
            <Card>
              <CardHeader>
                <CardTitle>Complete Purchase</CardTitle>
                <CardDescription>
                  Your account credentials will be delivered instantly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Total Amount:</span>
                    <span className="text-xl font-bold">₦{total.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Payment will be deducted from your wallet
                  </p>
                </div>

                <Button
                  onClick={handlePurchase}
                  disabled={!canAfford || loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {canAfford ? 'Complete Purchase' : 'Insufficient Balance'}
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By completing this purchase, you agree to our Terms of Service and Privacy Policy.
                </p>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">
                    Secure checkout protected by 256-bit SSL encryption
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
