import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Star, Users, Eye, Calendar, ShoppingCart, ArrowLeft } from 'lucide-react'
import Navbar from '@/components/NavbarAuth'
import Footer from '@/components/Footer'

// Mock Categories
const mockCategories = {
  1: { name: 'Instagram Accounts', description: 'High-quality Instagram accounts with real followers' },
  2: { name: 'Twitter Accounts', description: 'Verified and aged Twitter accounts' },
  3: { name: 'YouTube Channels', description: 'Monetized YouTube channels with subscribers' },
  4: { name: 'TikTok Accounts', description: 'Trending TikTok accounts with high engagement' },
  5: { name: 'Facebook Pages', description: 'Business Facebook pages with likes and engagement' },
  6: { name: 'LinkedIn Profiles', description: 'Professional LinkedIn profiles with connections' }
}

// Mock Products Data
const mockProducts = [
  {
    id: 1,
    categoryId: 1,
    title: '@lifestyle_influencer',
    followers: '125K',
    engagement: '4.2%',
    age: '2 years',
    price: 15000,
    isVerified: true,
    description: 'Lifestyle influencer account with high engagement rate and authentic followers.',
    stats: {
      posts: 1250,
      following: 890,
      avgLikes: 5200
    }
  },
  {
    id: 2,
    categoryId: 1,
    title: '@fitness_motivation',
    followers: '89K',
    engagement: '3.8%',
    age: '1.5 years',
    price: 12000,
    isVerified: false,
    description: 'Fitness and motivation account with engaged community.',
    stats: {
      posts: 980,
      following: 450,
      avgLikes: 3400
    }
  },
  {
    id: 3,
    categoryId: 1,
    title: '@food_adventures',
    followers: '200K',
    engagement: '5.1%',
    age: '3 years',
    price: 25000,
    isVerified: true,
    description: 'Food and travel account with premium engagement.',
    stats: {
      posts: 1800,
      following: 1200,
      avgLikes: 10200
    }
  },
  {
    id: 4,
    categoryId: 1,
    title: '@fashion_daily',
    followers: '67K',
    engagement: '3.2%',
    age: '1 year',
    price: 8500,
    isVerified: false,
    description: 'Fashion-focused account with young, engaged audience.',
    stats: {
      posts: 650,
      following: 320,
      avgLikes: 2100
    }
  },
  {
    id: 5,
    categoryId: 1,
    title: '@tech_reviews',
    followers: '156K',
    engagement: '4.7%',
    age: '2.5 years',
    price: 18500,
    isVerified: true,
    description: 'Technology review account with tech-savvy audience.',
    stats: {
      posts: 1100,
      following: 680,
      avgLikes: 7300
    }
  },
  {
    id: 6,
    categoryId: 1,
    title: '@nature_photography',
    followers: '93K',
    engagement: '4.0%',
    age: '2 years',
    price: 11000,
    isVerified: false,
    description: 'Nature and landscape photography account.',
    stats: {
      posts: 890,
      following: 420,
      avgLikes: 3700
    }
  }
]

export default function CategoryPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('price-low')
  const [priceRange, setPriceRange] = useState('all')

  // Check if user is logged in
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'

  const handleAddToCart = (productId: number) => {
    if (!isLoggedIn) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/category/${categoryId}`)
      return
    }
    
    // For now, redirect to product detail page
    navigate(`/product/${productId}`)
  }

  const category = mockCategories[Number(categoryId) as keyof typeof mockCategories]
  const categoryProducts = mockProducts.filter(product => product.categoryId === Number(categoryId))

  // Filter and sort products
  let filteredProducts = categoryProducts.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Price filtering
  if (priceRange !== 'all') {
    const [min, max] = priceRange.split('-').map(Number)
    filteredProducts = filteredProducts.filter(product => 
      product.price >= min && product.price <= max
    )
  }

  // Sorting
  filteredProducts.sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price
      case 'price-high':
        return b.price - a.price
      case 'followers-high':
        return parseInt(b.followers.replace('K', '000')) - parseInt(a.followers.replace('K', '000'))
      case 'engagement-high':
        return parseFloat(b.engagement) - parseFloat(a.engagement)
      default:
        return 0
    }
  })

  if (!category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Navbar />
        <div className="container mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <Link to="/products">
            <Button>Back to Categories</Button>
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navbar />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white">
        <div className="container mx-auto px-6 py-12">
          <Link to="/products" className="inline-flex items-center text-white/80 hover:text-white mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Categories
          </Link>
          
          <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
          <p className="text-white/90 mb-6">{category.description}</p>
          
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {filteredProducts.length} accounts available
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="followers-high">Most Followers</SelectItem>
                <SelectItem value="engagement-high">Best Engagement</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="0-10000">Under ₦10,000</SelectItem>
                <SelectItem value="10000-20000">₦10,000 - ₦20,000</SelectItem>
                <SelectItem value="20000-50000">₦20,000+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {product.title}
                      {product.isVerified && (
                        <Badge variant="default" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {product.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{product.followers} followers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span>{product.engagement} engagement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span>{product.stats.avgLikes.toLocaleString()} avg likes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{product.age} old</span>
                  </div>
                </div>

                {/* Price and Buttons */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-primary">
                      ₦{product.price.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link to={`/product/${product.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Button 
                      className="flex-1 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      onClick={() => handleAddToCart(product.id)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {isLoggedIn ? 'Add to Cart' : 'Sign In to Buy'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No accounts found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filter criteria
            </p>
            <Button variant="outline" onClick={() => {
              setSearchTerm('')
              setPriceRange('all')
            }}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
