import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, ShoppingCart, Shield, Clock, Star, Check, AlertTriangle } from 'lucide-react'
import NavbarAuth from '@/components/NavbarAuth'
import Footer from '@/components/Footer'

// Mock product data - will be replaced with real data later
const mockProducts = [
  {
    id: '1',
    name: 'Instagram Premium Account',
    description: 'High-quality Instagram account with active followers and engagement. Perfect for personal branding or business marketing.',
    price: 2500,
    originalPrice: 3500,
    category: 'Instagram',
    followers: '10K-50K',
    engagement: 'High',
    age: '6+ months',
    verification: 'Phone Verified',
    features: [
      'Email access included',
      'Phone number verified', 
      'Active followers',
      'High engagement rate',
      'No violations or warnings',
      'Complete profile setup'
    ],
    images: ['/placeholder.svg'],
    inStock: true,
    soldCount: 234,
    rating: 4.8,
    reviews: 89
  },
  {
    id: '2', 
    name: 'TikTok Creator Account',
    description: 'Established TikTok account with viral potential. Great for content creators and marketers.',
    price: 1800,
    originalPrice: 2200,
    category: 'TikTok',
    followers: '5K-25K',
    engagement: 'Very High',
    age: '4+ months',
    verification: 'Email Verified',
    features: [
      'Email access included',
      'High viral potential',
      'Active community',
      'Creator fund eligible',
      'No copyright strikes',
      'Mobile verified'
    ],
    images: ['/placeholder.svg'],
    inStock: true,
    soldCount: 156,
    rating: 4.9,
    reviews: 67
  }
]

export default function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  
  // Check if user is logged in
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'

  useEffect(() => {
    // Simulate loading product data
    const loadProduct = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const foundProduct = mockProducts.find(p => p.id === productId)
      setProduct(foundProduct)
      setLoading(false)
    }

    loadProduct()
  }, [productId])

  const handlePurchase = () => {
    if (!isLoggedIn) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/product/${productId}`)
      return
    }
    
    // Proceed to checkout
    navigate(`/checkout?product=${productId}`)
  }

  const handleAddToWallet = () => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    navigate('/wallet')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <NavbarAuth />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist.</p>
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

  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)

  return (
    <div className="min-h-screen bg-background">
      <NavbarAuth />
      
      <div className="container mx-auto px-6 pt-24 pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-primary">Products</Link>
          <span>/</span>
          <Link to={`/category/${product.category.toLowerCase()}`} className="hover:text-primary">
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
              <img 
                src={product.images[selectedImage]} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square w-20 bg-muted rounded-lg overflow-hidden border-2 ${
                      selectedImage === index ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{product.category}</Badge>
                {product.inStock && <Badge variant="outline" className="text-green-600">In Stock</Badge>}
              </div>
              
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{product.rating}</span>
                  <span className="text-muted-foreground">({product.reviews} reviews)</span>
                </div>
                <span className="text-muted-foreground">• {product.soldCount} sold</span>
              </div>

              <p className="text-muted-foreground">{product.description}</p>
            </div>

            {/* Price */}
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-primary">₦{product.price.toLocaleString()}</span>
              {product.originalPrice > product.price && (
                <>
                  <span className="text-xl text-muted-foreground line-through">
                    ₦{product.originalPrice.toLocaleString()}
                  </span>
                  <Badge variant="destructive">{discount}% OFF</Badge>
                </>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium">Verification</p>
                      <p className="text-sm text-muted-foreground">{product.verification}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">Account Age</p>
                      <p className="text-sm text-muted-foreground">{product.age}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {!isLoggedIn && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please sign in or register to purchase this account. You'll also need sufficient wallet balance.
                  </AlertDescription>
                </Alert>
              )}

              {isLoggedIn && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <AlertDescription>
                    Ready to purchase! Click below to proceed with your order.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                onClick={handlePurchase}
                className="w-full" 
                size="lg"
                disabled={!product.inStock}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {isLoggedIn ? 'Purchase Now' : 'Sign In to Purchase'}
              </Button>
              
              {!isLoggedIn && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/register')}
                  className="w-full"
                >
                  New Customer? Register Now
                </Button>
              )}
              
              {isLoggedIn && (
                <Button 
                  variant="outline" 
                  onClick={handleAddToWallet}
                  className="w-full"
                >
                  Add Money to Wallet
                </Button>
              )}
            </div>

            <Separator />

            {/* Features */}
            <div>
              <h3 className="font-semibold mb-3">What's Included:</h3>
              <div className="space-y-2">
                {product.features.map((feature: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Followers:</span>
                  <span className="font-medium">{product.followers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Engagement:</span>
                  <span className="font-medium">{product.engagement}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform:</span>
                  <span className="font-medium">{product.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery:</span>
                  <span className="font-medium">Instant</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-12">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  )
}
