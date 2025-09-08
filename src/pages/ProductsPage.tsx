import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Grid, List, Star, Shield, TrendingUp, Loader2, ShoppingCart } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '@/components/NavbarAuth'
import Footer from '@/components/Footer'
import ProductTemplateCard from '@/components/ProductTemplateCard'
import WalletBalanceWidget from '@/components/WalletBalanceWidget'
import { getCategories, getAllProductGroups, testConnection, type Category, type ProductGroup } from '@/lib/supabase'

export default function ProductsPage() {
  const navigate = useNavigate()
  
  // State for real Supabase data
  const [categories, setCategories] = useState<Category[]>([])
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Existing UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Handle adding to cart (navigate to checkout with quantity)
  const handleAddToCart = (productGroupId: string, quantity: number) => {
    const productGroup = productGroups.find(pg => pg.id === productGroupId)
    const category = categories.find(cat => cat.id === productGroup?.category_id)
    
    if (productGroup && category) {
      navigate('/checkout', {
        state: {
          productGroup,
          category,
          quantity,
          isBulkPurchase: quantity > 1
        }
      })
    }
  }

  // Load real data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        // Test connection first
        const connectionOk = await testConnection()
        if (!connectionOk) {
          throw new Error('Failed to connect to database')
        }

        // Load categories and product groups
        const [categoriesData, productGroupsData] = await Promise.all([
          getCategories(),
          getAllProductGroups()
        ])

        setCategories(categoriesData)
        setProductGroups(productGroupsData)
        setError(null)
        
      } catch (err) {
        console.error('❌ Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Refresh data when user returns to page (after purchase)
  useEffect(() => {
    const handleFocus = () => {
      // Reload product groups to get updated stock counts
      getAllProductGroups().then(productGroupsData => {
        setProductGroups(productGroupsData)
      }).catch(err => {
        console.error('Error refreshing product groups:', err)
      })
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Refresh data when user returns to page (for stock updates after purchases)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !loading) {
        const refreshData = async () => {
          try {
            const [categoriesData, productGroupsData] = await Promise.all([
              getCategories(),
              getAllProductGroups()
            ])
            setCategories(categoriesData)
            setProductGroups(productGroupsData)
          } catch (err) {
            console.error('Error refreshing data:', err)
          }
        }
        refreshData()
      }
    }

    const handleFocus = () => {
      if (!loading) {
        const refreshData = async () => {
          try {
            const [categoriesData, productGroupsData] = await Promise.all([
              getCategories(),
              getAllProductGroups()
            ])
            setCategories(categoriesData)
            setProductGroups(productGroupsData)
          } catch (err) {
            console.error('Error refreshing data:', err)
          }
        }
        refreshData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loading])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Navbar />
        <div className="container mx-auto px-6 py-32">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span className="text-lg">Loading products from database...</span>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Navbar />
        <div className="container mx-auto px-6 py-32">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Database Connection Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Filter categories based on search AND available products
  const filteredCategories = categories.filter(category => {
    // Check if category matches search
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    // Check if category has available products
    const hasAvailableProducts = productGroups.some(pg => 
      pg.category_id === category.id && 
      pg.is_active && 
      pg.stock_count > 0
    )
    
    return matchesSearch && hasAvailableProducts
  })

  // Filter product groups for direct product template display
  const filteredProductGroups = productGroups.filter(productGroup => {
    const category = categories.find(cat => cat.id === productGroup.category_id)
    const matchesSearch = productGroup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         productGroup.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || productGroup.category_id === selectedCategory
    
    return matchesSearch && matchesCategory && productGroup.is_active
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navbar />
      
      {/* Wallet Balance Widget */}
      <div className="container mx-auto px-6 pt-24 pb-4">
        <WalletBalanceWidget showRefresh={true} />
      </div>
      
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
            <h2 className="text-2xl font-semibold">Available Products</h2>
            <Badge variant="secondary">{filteredProductGroups.length} products</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setLoading(true)
                try {
                  const [categoriesData, productGroupsData] = await Promise.all([
                    getCategories(),
                    getAllProductGroups()
                  ])
                  setCategories(categoriesData)
                  setProductGroups(productGroupsData)
                } catch (err) {
                  console.error('Error manually refreshing data:', err)
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '🔄 Refresh Stock'}
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            
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
        </div>

        {/* Product Templates Grid */}
        <div className={`grid gap-6 mb-12 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1 max-w-4xl mx-auto'
        }`}>
          {filteredProductGroups.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Products Available</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms' : 'Check back later for new products'}
              </p>
            </div>
          ) : (
            filteredProductGroups.map((productGroup) => {
              const category = categories.find(cat => cat.id === productGroup.category_id)
              return category ? (
                <ProductTemplateCard
                  key={productGroup.id}
                  productGroup={productGroup}
                  category={category}
                  onAddToCart={handleAddToCart}
                />
              ) : null
            })
          )}
        </div>

        {/* Categories Overview */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Browse by Category</h3>
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
              <Card key={category.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/20">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="group-hover:text-primary transition-colors">
                          {category.name}
                        </CardTitle>
                        {/* Show popular badge if category has product groups */}
                        {productGroups.filter(pg => pg.category_id === category.id).length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Available
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {category.description || 'Premium social media accounts'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {productGroups.filter(pg => pg.category_id === category.id).length} product types
                    </span>
                    <span className="font-semibold text-primary">
                      {productGroups
                        .filter(pg => pg.category_id === category.id)
                        .map(pg => `₦${pg.price}`)
                        .slice(0, 1)[0] || 'From ₦25'}+
                    </span>
                  </div>
                  
                  <Button 
                    className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={() => navigate(`/category/${category.id}`)}
                  >
                    Browse Accounts
                  </Button>
                </CardContent>
              </Card>
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
