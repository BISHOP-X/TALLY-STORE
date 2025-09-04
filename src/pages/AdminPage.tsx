import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Settings, 
  Plus, 
  Upload, 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  Edit, 
  Trash2,
  Eye,
  DollarSign,
  Loader2
} from 'lucide-react'
import Navbar from '@/components/NavbarAuth'
import Footer from '@/components/Footer'
import { 
  getCategories, 
  getAllProductGroups, 
  getIndividualAccounts,
  createCategory, 
  updateCategory, 
  deleteCategory,
  createProductGroup,
  updateProductGroup,
  deleteProductGroup,
  bulkCreateIndividualAccounts,
  parseCSV,
  type Category, 
  type ProductGroup,
  type IndividualAccount
} from '@/lib/supabase'

// Mock admin stats
const mockStats = {
  totalUsers: 1247,
  totalProducts: 89,
  totalSales: 45,
  revenue: 285000,
  pendingOrders: 3,
  lowStock: 12
}

// Mock products for admin management
const mockAdminProducts = [
  {
    id: 1,
    title: '@lifestyle_influencer',
    category: 'Instagram',
    price: 15000,
    status: 'available',
    dateAdded: '2024-01-10',
    views: 24
  },
  {
    id: 2,
    title: '@tech_channel',
    category: 'YouTube',
    price: 35000,
    status: 'sold',
    dateAdded: '2024-01-08',
    views: 18
  },
  {
    id: 3,
    title: '@fashion_daily',
    category: 'Instagram',
    price: 8500,
    status: 'available',
    dateAdded: '2024-01-05',
    views: 31
  }
]

// Mock categories
const mockCategories = [
  { id: 1, name: 'Instagram Accounts', productCount: 45 },
  { id: 2, name: 'YouTube Channels', productCount: 18 },
  { id: 3, name: 'TikTok Accounts', productCount: 26 }
]

export default function AdminPage() {
  // Real data state
  const [categories, setCategories] = useState<Category[]>([])
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([])
  const [individualAccounts, setIndividualAccounts] = useState<IndividualAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [newProduct, setNewProduct] = useState({
    title: '',
    category: '',
    price: '',
    username: '',
    password: '',
    email: '',
    description: ''
  })
  const [newCategory, setNewCategory] = useState({
    name: '',
    displayName: '',
    description: ''
  })

  // Load real data
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [categoriesData, productGroupsData, accountsData] = await Promise.all([
        getCategories(),
        getAllProductGroups(),
        getIndividualAccounts()
      ])

      setCategories(categoriesData)
      setProductGroups(productGroupsData)
      setIndividualAccounts(accountsData)

      console.log('✅ Admin data loaded:', {
        categories: categoriesData.length,
        productGroups: productGroupsData.length,
        accounts: accountsData.length
      })

    } catch (err) {
      console.error('❌ Error loading admin data:', err)
      setError('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategory.name || !newCategory.displayName) {
      alert('Please fill in category name and display name')
      return
    }

    try {
      const category = await createCategory(
        newCategory.name,
        newCategory.displayName,
        newCategory.description
      )

      if (category) {
        setCategories(prev => [...prev, category])
        setNewCategory({ name: '', displayName: '', description: '' })
        alert('Category created successfully!')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      alert(`Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Delete category
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const success = await deleteCategory(categoryId)
      if (success) {
        setCategories(prev => prev.filter(cat => cat.id !== categoryId))
        alert('Category deleted successfully!')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Failed to delete category')
    }
  }

  // Handle CSV upload
  const handleCsvUpload = async () => {
    if (!csvFile) {
      alert('Please select a CSV file')
      return
    }

    try {
      const text = await csvFile.text()
      const csvData = parseCSV(text)

      if (csvData.length === 0) {
        alert('CSV file is empty or invalid')
        return
      }

      // Validate required fields
      const requiredFields = ['username', 'password', 'category', 'price']
      const firstRow = csvData[0]
      const missingFields = requiredFields.filter(field => !(field in firstRow))

      if (missingFields.length > 0) {
        alert(`Missing required fields: ${missingFields.join(', ')}`)
        return
      }

      // Process each row
      const accountsToCreate: Omit<IndividualAccount, 'id' | 'created_at'>[] = []

      for (const row of csvData) {
        // Find or create category
        let category = categories.find(cat => 
          cat.name.toLowerCase() === row.category.toLowerCase()
        )

        if (!category) {
          category = await createCategory(
            row.category.toLowerCase(),
            row.category,
            `${row.category} accounts`
          )
          if (category) {
            setCategories(prev => [...prev, category])
          }
        }

        if (!category) continue

        // Find or create product group
        let productGroup = productGroups.find(pg => 
          pg.category_id === category!.id && 
          pg.name.toLowerCase().includes(row.category.toLowerCase())
        )

        if (!productGroup) {
          const groupName = `${row.category} ${row.age_range || 'General'}, ${row.country || 'Global'}`
          productGroup = await createProductGroup({
            category_id: category.id,
            name: groupName,
            platform: row.category.toLowerCase(),
            age_range: row.age_range || null,
            country: row.country || null,
            price_per_unit: parseFloat(row.price) || 0,
            available_stock: 0,
            is_active: true
          })
          if (productGroup) {
            setProductGroups(prev => [...prev, productGroup])
          }
        }

        if (!productGroup) continue

        // Add account to creation list
        accountsToCreate.push({
          product_group_id: productGroup.id,
          username: row.username,
          email: row.email || '',
          password: row.password,
          followers_count: parseInt(row.followers) || 0,
          status: 'available'
        })
      }

      // Bulk create accounts
      if (accountsToCreate.length > 0) {
        const createdAccounts = await bulkCreateIndividualAccounts(accountsToCreate)
        setIndividualAccounts(prev => [...prev, ...createdAccounts])
        
        // Reload product groups to get updated stock counts
        const updatedProductGroups = await getAllProductGroups()
        setProductGroups(updatedProductGroups)

        alert(`Successfully uploaded ${createdAccounts.length} accounts!`)
        setCsvFile(null)
      }

    } catch (error) {
      console.error('Error processing CSV:', error)
      alert('Failed to process CSV file')
    }
  }

  // Calculate stats from real data
  const stats = {
    totalUsers: 0, // You can add user count later
    totalProducts: individualAccounts.length,
    totalSales: individualAccounts.filter(acc => acc.status === 'sold').length,
    revenue: individualAccounts
      .filter(acc => acc.status === 'sold')
      .reduce((sum, acc) => {
        const productGroup = productGroups.find(pg => pg.id === acc.product_group_id)
        return sum + (productGroup?.price_per_unit || 0)
      }, 0),
    pendingOrders: 0, // Add order tracking later
    lowStock: productGroups.filter(pg => pg.available_stock < 5).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Navbar />
        <div className="container mx-auto px-6 py-32">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span className="text-lg">Loading admin dashboard...</span>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Navbar />
        <div className="container mx-auto px-6 py-32">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Admin Data</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadAllData}>Retry</Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setCsvFile(file || null)
  }

  const handleAddProduct = () => {
    // Mock product addition
    console.log('Adding product:', newProduct)
    alert('Product added successfully!')
    setNewProduct({
      title: '',
      category: '',
      price: '',
      username: '',
      password: '',
      email: '',
      description: ''
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navbar />
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage products, categories, and view analytics
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Products</p>
                    <p className="text-2xl font-bold">{stats.totalProducts}</p>
                  </div>
                  <ShoppingBag className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sales</p>
                    <p className="text-2xl font-bold">{stats.totalSales}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold">₦{stats.revenue.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="products" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="add-product">Add Product</TabsTrigger>
              <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>

            {/* Products Management */}
            <TabsContent value="products" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Management</CardTitle>
                  <p className="text-muted-foreground">
                    View and manage all products in your inventory
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockAdminProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium">{product.title}</h3>
                            <Badge variant={product.status === 'available' ? 'default' : 'secondary'}>
                              {product.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-x-4">
                            <span>Category: {product.category}</span>
                            <span>Price: ₦{product.price.toLocaleString()}</span>
                            <span>Added: {product.dateAdded}</span>
                            <span>{product.views} views</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Add Single Product */}
            <TabsContent value="add-product" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add New Product
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Add a single product manually to your inventory
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Product Title</label>
                        <Input
                          placeholder="e.g., @lifestyle_influencer"
                          value={newProduct.title}
                          onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Category</label>
                        <Select 
                          value={newProduct.category} 
                          onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="instagram">Instagram Accounts</SelectItem>
                            <SelectItem value="youtube">YouTube Channels</SelectItem>
                            <SelectItem value="tiktok">TikTok Accounts</SelectItem>
                            <SelectItem value="twitter">Twitter Accounts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Price (₦)</label>
                        <Input
                          type="number"
                          placeholder="Enter price"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Username</label>
                        <Input
                          placeholder="Account username"
                          value={newProduct.username}
                          onChange={(e) => setNewProduct({ ...newProduct, username: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Password</label>
                        <Input
                          type="password"
                          placeholder="Account password"
                          value={newProduct.password}
                          onChange={(e) => setNewProduct({ ...newProduct, password: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Email (Optional)</label>
                        <Input
                          type="email"
                          placeholder="Associated email"
                          value={newProduct.email}
                          onChange={(e) => setNewProduct({ ...newProduct, email: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                      placeholder="Product description..."
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <Button onClick={handleAddProduct} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bulk CSV Upload */}
            <TabsContent value="bulk-upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Bulk CSV Upload
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Upload multiple products at once using a CSV file
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
                    <p className="text-muted-foreground mb-4">
                      Choose a CSV file with product data to upload in bulk
                    </p>
                    
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      className="mb-4"
                    />
                    
                    {csvFile && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Selected: {csvFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Size: {(csvFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">CSV Format Requirements:</h4>
                    <div className="bg-muted p-4 rounded-lg text-sm">
                      <p className="font-medium mb-2">Required columns:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>title - Product title</li>
                        <li>category - Product category</li>
                        <li>price - Price in Naira</li>
                        <li>username - Account username</li>
                        <li>password - Account password</li>
                        <li>email - Associated email (optional)</li>
                        <li>description - Product description (optional)</li>
                      </ul>
                    </div>
                  </div>

                  <Button 
                    onClick={handleCsvUpload} 
                    disabled={!csvFile}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV File
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories Management */}
            <TabsContent value="categories" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Category Management</CardTitle>
                  <p className="text-muted-foreground">
                    Manage product categories and organization
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <h3 className="font-medium">{category.display_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {category.description} • {productGroups.filter(pg => pg.category_id === category.id).length} product groups
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add new category form */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mt-4">
                      <h3 className="font-medium mb-4">Add New Category</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Category Name</label>
                          <Input
                            placeholder="e.g., instagram"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Display Name</label>
                          <Input
                            placeholder="e.g., Instagram Accounts"
                            value={newCategory.displayName}
                            onChange={(e) => setNewCategory({...newCategory, displayName: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Description</label>
                          <Input
                            placeholder="e.g., High-quality Instagram accounts"
                            value={newCategory.description}
                            onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                          />
                        </div>
                        <Button onClick={handleAddCategory} className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Category
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Category
                    </Button>
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
