import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Star, Users, Eye, Calendar, ShoppingCart, ArrowLeft, Loader2 } from 'lucide-react'
import Navbar from '@/components/NavbarAuth'
import Footer from '@/components/Footer'
import { BackToCategories } from '@/components/ui/back-button'
import { 
  getCategories, 
  getProductGroupsByCategory, 
  getIndividualAccountsByProductGroup,
  type Category, 
  type ProductGroup, 
  type IndividualAccount 
} from '@/lib/supabase'

export default function CategoryPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  
  // State for real Supabase data
  const [category, setCategory] = useState<Category | null>(null)
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([])
  const [individualAccounts, setIndividualAccounts] = useState<IndividualAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('price-low')
  const [priceRange, setPriceRange] = useState('all')

  // Check if user is logged in
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'

  // Load real data from Supabase
  useEffect(() => {
    const loadData = async () => {
      if (!categoryId) return
      
      try {
        setLoading(true)
        console.log('🔄 Loading category data for:', categoryId)
        
        // Load all categories first to find the right one
        const categories = await getCategories()
        const foundCategory = categories.find(cat => 
          cat.id === categoryId || 
          cat.name.toLowerCase() === categoryId.toLowerCase() ||
          cat.display_name.toLowerCase() === categoryId.toLowerCase()
        )
        
        if (!foundCategory) {
          throw new Error('Category not found')
        }
        
        setCategory(foundCategory)
        
        // Load product groups for this category
        const productGroupsData = await getProductGroupsByCategory(foundCategory.id)
        setProductGroups(productGroupsData)
        
        // Load individual accounts for each product group
        const allAccounts: IndividualAccount[] = []
        for (const group of productGroupsData) {
          const accounts = await getIndividualAccountsByProductGroup(group.id)
          allAccounts.push(...accounts)
        }
        setIndividualAccounts(allAccounts)
        
        console.log('✅ Category data loaded:', { 
          category: foundCategory.display_name,
          productGroups: productGroupsData.length,
          accounts: allAccounts.length
        })
        
      } catch (err) {
        console.error('❌ Error loading category data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load category data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [categoryId])

  const handleAddToCart = (accountId: string) => {
    if (!isLoggedIn) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/category/${categoryId}`)
      return
    }
    
    // For now, redirect to product detail page
    navigate(`/product/${accountId}`)
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Navbar />
        <div className="container mx-auto px-6 py-32">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span className="text-lg">Loading category...</span>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Show error state
  if (error || !category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Navbar />
        <div className="container mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <BackToCategories />
        </div>
        <Footer />
      </div>
    )
  }

  // Filter accounts based on search
  let filteredAccounts = individualAccounts.filter(account => {
    // Get the product group for this account to access platform info
    const productGroup = productGroups.find(pg => pg.id === account.product_group_id)
    
    return account.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (productGroup && productGroup.platform.toLowerCase().includes(searchTerm.toLowerCase()))
  })

  // Price filtering
  if (priceRange !== 'all') {
    const [min, max] = priceRange.split('-').map(Number)
    filteredAccounts = filteredAccounts.filter(account => {
      const productGroup = productGroups.find(pg => pg.id === account.product_group_id)
      if (!productGroup) return false
      const price = productGroup.price_per_unit
      if (max) {
        return price >= min && price <= max
      } else {
        return price >= min
      }
    })
  }

  // Sorting
  filteredAccounts.sort((a, b) => {
    const aGroup = productGroups.find(pg => pg.id === a.product_group_id)
    const bGroup = productGroups.find(pg => pg.id === b.product_group_id)
    
    if (!aGroup || !bGroup) return 0
    
    switch (sortBy) {
      case 'price-low':
        return aGroup.price_per_unit - bGroup.price_per_unit
      case 'price-high':
        return bGroup.price_per_unit - aGroup.price_per_unit
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      default:
        return 0
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navbar />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="mb-4">
            <BackToCategories />
          </div>
          
          <h1 className="text-3xl font-bold mb-2">{category.display_name}</h1>
          <p className="text-white/90 mb-6">{category.description}</p>
          
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {filteredAccounts.length} accounts available
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {productGroups.length} product types
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
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
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

        {/* Individual Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAccounts.map((account) => {
            const productGroup = productGroups.find(pg => pg.id === account.product_group_id)
            if (!productGroup) return null
            
            return (
              <Card key={account.id} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        @{account.username}
                        <Badge variant="secondary" className="text-xs">
                          {productGroup.platform}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {productGroup.country || 'Global'} • {productGroup.age_range || 'Aged Account'}
                      </p>
                    </div>
                    <Badge 
                      variant="default"
                      className="ml-2"
                    >
                      Available
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Account Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{productGroup.platform}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>{account.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{productGroup.age_range || 'Aged'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      <span>In Stock</span>
                    </div>
                  </div>

                  {/* Price and Buttons */}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-bold text-primary">
                        ₦{productGroup.price_per_unit.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Link to={`/product/${account.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          View Details
                        </Button>
                      </Link>
                      <Button 
                        className="flex-1 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        onClick={() => handleAddToCart(account.id)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {isLoggedIn ? 'Purchase' : 'Sign In to Buy'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* No Results */}
        {filteredAccounts.length === 0 && (
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
