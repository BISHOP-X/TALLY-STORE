import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Grid, List, Star, Shield, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import Navbar from '@/components/NavbarAuth'
import Footer from '@/components/Footer'

// Mock Categories Data
const mockCategories = [
  {
    id: 1,
    name: 'Instagram Accounts',
    description: 'High-quality Instagram accounts with real followers',
    productCount: 45,
    priceRange: '₦2,500 - ₦25,000',
    image: '/placeholder.svg',
    isPopular: true
  },
  {
    id: 2,
    name: 'Twitter Accounts',
    description: 'Verified and aged Twitter accounts',
    productCount: 32,
    priceRange: '₦1,500 - ₦15,000',
    image: '/placeholder.svg',
    isPopular: false
  },
  {
    id: 3,
    name: 'YouTube Channels',
    description: 'Monetized YouTube channels with subscribers',
    productCount: 18,
    priceRange: '₦5,000 - ₦50,000',
    image: '/placeholder.svg',
    isPopular: true
  },
  {
    id: 4,
    name: 'TikTok Accounts',
    description: 'Trending TikTok accounts with high engagement',
    productCount: 28,
    priceRange: '₦2,000 - ₦20,000',
    image: '/placeholder.svg',
    isPopular: false
  },
  {
    id: 5,
    name: 'Facebook Pages',
    description: 'Business Facebook pages with likes and engagement',
    productCount: 22,
    priceRange: '₦3,000 - ₦30,000',
    image: '/placeholder.svg',
    isPopular: false
  },
  {
    id: 6,
    name: 'LinkedIn Profiles',
    description: 'Professional LinkedIn profiles with connections',
    productCount: 15,
    priceRange: '₦4,000 - ₦40,000',
    image: '/placeholder.svg',
    isPopular: true
  }
]

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const filteredCategories = mockCategories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold mb-4">
              Premium Social Media Accounts
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Discover high-quality, authentic social media accounts across all major platforms. 
              Each account is carefully verified and comes with full credentials.
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold">Browse Categories</h2>
            <Badge variant="secondary">{filteredCategories.length} categories</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Verified Accounts</h3>
              <p className="text-sm text-muted-foreground">
                All accounts are thoroughly verified before listing
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <Star className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Premium Quality</h3>
              <p className="text-sm text-muted-foreground">
                High-engagement accounts with real followers
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Instant Delivery</h3>
              <p className="text-sm text-muted-foreground">
                Receive account credentials immediately after purchase
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Categories Grid */}
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {filteredCategories.map((category) => (
            <Link key={category.id} to={`/category/${category.id}`}>
              <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/20">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="group-hover:text-primary transition-colors">
                          {category.name}
                        </CardTitle>
                        {category.isPopular && (
                          <Badge variant="secondary" className="text-xs">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {category.productCount} accounts
                    </span>
                    <span className="font-semibold text-primary">
                      {category.priceRange}
                    </span>
                  </div>
                  
                  <Button className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    Browse Accounts
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* No Results */}
        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No categories found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search terms
            </p>
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Clear Search
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
