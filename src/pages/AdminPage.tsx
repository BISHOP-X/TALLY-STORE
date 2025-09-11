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
  archiveProductGroup,
  restoreProductGroup,
  createIndividualAccount,
  deleteIndividualAccount,
  updateIndividualAccount,
  getUserCount,
  getAdminSalesStats,
  bulkCreateIndividualAccounts,
  parseCSV,
  createProductTemplate,
  processBulkAccountUpload,
  type Category, 
  type ProductGroup,
  type IndividualAccount,
  type ProductTemplate
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

export default function AdminPage() {
  // Real data state
  const [categories, setCategories] = useState<Category[]>([])
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([])
  const [individualAccounts, setIndividualAccounts] = useState<IndividualAccount[]>([])
  const [userCount, setUserCount] = useState<number>(0)
  const [salesStats, setSalesStats] = useState({ totalSales: 0, totalRevenue: 0 })
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
    description: ''
  })
  const [newTemplate, setNewTemplate] = useState({
    productName: '',
    description: '',
    price: '',
    categoryId: ''
  })
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [viewingAccount, setViewingAccount] = useState<IndividualAccount | null>(null)
  const [editingAccount, setEditingAccount] = useState<IndividualAccount | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null)

  // Load real data
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [categoriesData, productGroupsData, accountsData, userCountData, salesStatsData] = await Promise.all([
        getCategories(),
        getAllProductGroups(),
        getIndividualAccounts(),
        getUserCount(),
        getAdminSalesStats()
      ])

      setCategories(categoriesData)
      setProductGroups(productGroupsData)
      setIndividualAccounts(accountsData)
      setUserCount(userCountData)
      setSalesStats(salesStatsData)

      console.log('✅ Admin data loaded:', {
        categories: categoriesData.length,
        productGroups: productGroupsData.length,
        accounts: accountsData.length,
        users: userCountData,
        sales: salesStatsData.totalSales,
        revenue: salesStatsData.totalRevenue
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
    if (!newCategory.name) {
      alert('Please fill in category name')
      return
    }

    try {
      const category = await createCategory(
        newCategory.name.toLowerCase().replace(/\s+/g, '-'),
        newCategory.name,
        newCategory.description
      )

      if (category) {
        setCategories(prev => [...prev, category])
        setNewCategory({ name: '', description: '' })
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

  // Edit category
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
  }

  // Update category
  const handleUpdateCategory = async (updatedCategory: Category) => {
    try {
      const success = await updateCategory(updatedCategory.id, {
        name: updatedCategory.name,
        description: updatedCategory.description
      })
      
      if (success) {
        setCategories(prev => 
          prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat)
        )
        setEditingCategory(null)
        alert('Category updated successfully!')
      } else {
        alert('Failed to update category')
      }
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Failed to update category')
    }
  }

  // View account details
  const handleViewAccount = (account: IndividualAccount) => {
    setViewingAccount(account)
  }

  // Edit account
  const handleEditAccount = (account: IndividualAccount) => {
    setEditingAccount(account)
  }

  // Delete account
  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) return

    try {
      const success = await deleteIndividualAccount(accountId)
      if (success) {
        setIndividualAccounts(prev => prev.filter(acc => acc.id !== accountId))
        // Reload product groups to update stock counts
        const updatedProductGroups = await getAllProductGroups()
        setProductGroups(updatedProductGroups)
        alert('Account deleted successfully!')
      } else {
        alert('Failed to delete account')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account')
    }
  }

  // Update account
  const handleUpdateAccount = async (updatedAccount: IndividualAccount) => {
    try {
      const result = await updateIndividualAccount(updatedAccount.id, {
        username: updatedAccount.username,
        password: updatedAccount.password,
        email: updatedAccount.email,
        email_password: updatedAccount.email_password,
        two_fa_code: updatedAccount.two_fa_code,
        status: updatedAccount.status,
        additional_info: updatedAccount.additional_info
      })

      if (result) {
        // Update local state with the updated account
        setIndividualAccounts(prev => 
          prev.map(acc => acc.id === result.id ? result : acc)
        )
        setEditingAccount(null)
        alert('Account updated successfully!')
      } else {
        alert('Failed to update account')
      }
    } catch (error) {
      console.error('Error updating account:', error)
      alert('Failed to update account')
    }
  }

  // Edit template
  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template)
  }

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this product template? This action cannot be undone.')) return

    try {
      const success = await deleteProductGroup(templateId)
      if (success) {
        setProductGroups(prev => prev.filter(pg => pg.id !== templateId))
        alert('Product template deleted successfully!')
      } else {
        alert('Failed to delete product template. This template may have existing orders or accounts associated with it.')
      }
    } catch (error: any) {
      console.error('Error deleting product template:', error)
      const errorMessage = error?.message || 'Failed to delete product template'
      alert(errorMessage)
    }
  }

  // Archive template
  const handleArchiveTemplate = async (templateId: string) => {
    if (!confirm('Archive this product template? It will be hidden from customers but preserved for existing orders.')) return

    try {
      const success = await archiveProductGroup(templateId)
      if (success) {
        // Refresh the data to reflect the change
        const updatedGroups = await getAllProductGroups()
        setProductGroups(updatedGroups)
        alert('Product template archived successfully!')
      } else {
        alert('Failed to archive product template')
      }
    } catch (error: any) {
      console.error('Error archiving product template:', error)
      alert('Failed to archive product template')
    }
  }

  // Restore template
  const handleRestoreTemplate = async (templateId: string) => {
    if (!confirm('Restore this product template? It will be visible to customers again.')) return

    try {
      const success = await restoreProductGroup(templateId)
      if (success) {
        // Refresh the data to reflect the change
        const updatedGroups = await getAllProductGroups()
        setProductGroups(updatedGroups)
        alert('Product template restored successfully!')
      } else {
        alert('Failed to restore product template')
      }
    } catch (error: any) {
      console.error('Error restoring product template:', error)
      alert('Failed to restore product template')
    }
  }

  // Update template
  const handleUpdateTemplate = async (updatedTemplate: any) => {
    try {
      const result = await updateProductGroup(updatedTemplate.id, {
        name: updatedTemplate.name,
        description: updatedTemplate.description,
        price: updatedTemplate.price,
        category_id: updatedTemplate.category_id
      })

      if (result) {
        // Update local state with the updated template
        setProductGroups(prev => 
          prev.map(pg => pg.id === result.id ? result : pg)
        )
        setEditingTemplate(null)
        alert('Product template updated successfully!')
      } else {
        alert('Failed to update product template')
      }
    } catch (error) {
      console.error('Error updating product template:', error)
      alert('Failed to update product template')
    }
  }

  // Handle CSV upload
  const handleCsvUpload = async () => {
    if (!csvFile) {
      alert('Please select a CSV file')
      return
    }

    if (!selectedTemplate) {
      alert('Please select a product template')
      return
    }

    try {
      const text = await csvFile.text()
      const csvData = parseCSV(text)

      if (csvData.length === 0) {
        alert('CSV file is empty or invalid')
        return
      }

      console.log('Processing CSV upload for template:', selectedTemplate)
      console.log('CSV data sample:', csvData[0])

      // Use the new bulk account upload function
      const result = await processBulkAccountUpload(csvData, selectedTemplate)

      if (result.success) {
        alert(`Successfully uploaded ${result.accountsCreated} accounts!`)
        
        // Reload data to show updated accounts and stock counts
        await loadAllData()
        
        // Reset form
        setCsvFile(null)
        setSelectedTemplate('')
      } else {
        alert(`Upload failed: ${result.error}`)
      }

    } catch (error) {
      console.error('Error processing CSV:', error)
      alert('Failed to process CSV file')
    }
  }

  // Handle creating a new product template
  const handleCreateTemplate = async () => {
    if (!newTemplate.productName || !newTemplate.categoryId || !newTemplate.price) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const template: ProductTemplate = {
        productName: newTemplate.productName,
        description: newTemplate.description,
        price: parseFloat(newTemplate.price),
        categoryId: newTemplate.categoryId
      }

      const productGroup = await createProductTemplate(template)
      
      if (productGroup) {
        setProductGroups(prev => [...prev, productGroup])
        setNewTemplate({
          productName: '',
          description: '',
          price: '',
          categoryId: ''
        })
        alert('Product template created successfully!')
      } else {
        alert('Failed to create product template')
      }
    } catch (error) {
      console.error('Error creating product template:', error)
      alert('Failed to create product template')
    }
  }

  // Calculate stats from real data
  const stats = {
    totalUsers: userCount,
    totalProducts: individualAccounts.length,
    totalSales: salesStats.totalSales,
    revenue: salesStats.totalRevenue,
    pendingOrders: 0, // Add order tracking later
    lowStock: productGroups.filter(pg => pg.stock_count < 5).length
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

  const handleAddProduct = async () => {
    if (!newProduct.title || !newProduct.category || !newProduct.price || !newProduct.username || !newProduct.password) {
      alert('Please fill in all required fields (title, category, price, username, password)')
      return
    }

    try {
      // Find the selected category by ID
      const category = categories.find(cat => cat.id === newProduct.category)

      if (!category) {
        alert('Selected category not found')
        return
      }

      // Find or create the product group
      let productGroup = productGroups.find(pg => 
        pg.category_id === category.id
      )

      if (!productGroup) {
        productGroup = await createProductGroup({
          category_id: category.id,
          name: `${category.name} - General`,
          description: newProduct.description || `${category.name} social media accounts`,
          price: parseFloat(newProduct.price),
          features: [],
          stock_count: 0,
          is_active: true
        })
        if (productGroup) {
          setProductGroups(prev => [...prev, productGroup])
        }
      }

      if (!productGroup) {
        alert('Failed to create or find product group')
        return
      }

      // Create the individual account
      const accountData = {
        product_group_id: productGroup.id,
        username: newProduct.username,
        password: newProduct.password,
        email: newProduct.email || '',
        email_password: '',
        two_fa_code: '',
        additional_info: null,
        status: 'available' as const
      }

      const createdAccount = await createIndividualAccount(accountData)
      
      if (createdAccount) {
        setIndividualAccounts(prev => [...prev, createdAccount])
        
        // Reload product groups to get updated stock counts
        const updatedProductGroups = await getAllProductGroups()
        setProductGroups(updatedProductGroups)
        
        // Reset form
        setNewProduct({
          title: '',
          category: '',
          price: '',
          username: '',
          password: '',
          email: '',
          description: ''
        })
        
        alert('Product added successfully!')
      } else {
        alert('Failed to create product')
      }
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Failed to add product')
    }
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

          {/* View Account Modal */}
          {viewingAccount && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-bold mb-4">Account Details</h2>
                <div className="space-y-3">
                  <div><strong>Username:</strong> @{viewingAccount.username}</div>
                  <div><strong>Password:</strong> {viewingAccount.password}</div>
                  {viewingAccount.email && <div><strong>Email:</strong> {viewingAccount.email}</div>}
                  {viewingAccount.email_password && <div><strong>Email Password:</strong> {viewingAccount.email_password}</div>}
                  {viewingAccount.two_fa_code && <div><strong>2FA Code:</strong> {viewingAccount.two_fa_code}</div>}
                  <div><strong>Status:</strong> <Badge variant={viewingAccount.status === 'available' ? 'default' : 'secondary'}>{viewingAccount.status}</Badge></div>
                  <div><strong>Created:</strong> {new Date(viewingAccount.created_at).toLocaleString()}</div>
                  {viewingAccount.additional_info && (
                    <div><strong>Additional Info:</strong> <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1">{JSON.stringify(viewingAccount.additional_info, null, 2)}</pre></div>
                  )}
                </div>
                <div className="flex gap-2 mt-6">
                  <Button onClick={() => setViewingAccount(null)} variant="outline" className="flex-1">
                    Close
                  </Button>
                  <Button onClick={() => {
                    setViewingAccount(null)
                    setEditingAccount(viewingAccount)
                  }} className="flex-1">
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Category Modal */}
          {editingCategory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-bold mb-4">Edit Category</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Category Name</label>
                    <Input
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Description</label>
                    <Input
                      value={editingCategory.description || ''}
                      onChange={(e) => setEditingCategory({...editingCategory, description: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Status</label>
                    <Select 
                      value={editingCategory.is_active ? 'active' : 'inactive'} 
                      onValueChange={(value) => 
                        setEditingCategory({...editingCategory, is_active: value === 'active'})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button onClick={() => setEditingCategory(null)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={() => handleUpdateCategory(editingCategory)} className="flex-1">
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
          {editingAccount && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-bold mb-4">Edit Account</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Username</label>
                    <Input
                      value={editingAccount.username}
                      onChange={(e) => setEditingAccount({...editingAccount, username: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Password</label>
                    <Input
                      value={editingAccount.password}
                      onChange={(e) => setEditingAccount({...editingAccount, password: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Email</label>
                    <Input
                      value={editingAccount.email || ''}
                      onChange={(e) => setEditingAccount({...editingAccount, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Email Password</label>
                    <Input
                      value={editingAccount.email_password || ''}
                      onChange={(e) => setEditingAccount({...editingAccount, email_password: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">2FA Code</label>
                    <Input
                      value={editingAccount.two_fa_code || ''}
                      onChange={(e) => setEditingAccount({...editingAccount, two_fa_code: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Status</label>
                    <Select 
                      value={editingAccount.status} 
                      onValueChange={(value: 'available' | 'sold' | 'reserved') => 
                        setEditingAccount({...editingAccount, status: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button onClick={() => setEditingAccount(null)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={() => handleUpdateAccount(editingAccount)} className="flex-1">
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
          {editingTemplate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-bold mb-4">Edit Product Template</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Product Name</label>
                    <Input
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Description</label>
                    <Textarea
                      value={editingTemplate.description}
                      onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Price (₦)</label>
                    <Input
                      type="number"
                      value={editingTemplate.price}
                      onChange={(e) => setEditingTemplate({...editingTemplate, price: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Category</label>
                    <Select 
                      value={editingTemplate.category_id} 
                      onValueChange={(value) => 
                        setEditingTemplate({...editingTemplate, category_id: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button onClick={() => setEditingTemplate(null)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={() => handleUpdateTemplate(editingTemplate)} className="flex-1">
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}

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
          <Tabs defaultValue="templates" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="add-product">Add Product</TabsTrigger>
              <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>

            {/* Product Templates Management */}
            <TabsContent value="templates" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Templates</CardTitle>
                  <p className="text-muted-foreground">
                    Create and manage product templates for bulk account uploads
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Create New Template */}
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Create New Product Template</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Product Name</label>
                        <Input
                          placeholder="e.g., Instagram Premium Accounts"
                          value={newTemplate.productName}
                          onChange={(e) => setNewTemplate({ ...newTemplate, productName: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Category</label>
                        <Select 
                          value={newTemplate.categoryId} 
                          onValueChange={(value) => setNewTemplate({ ...newTemplate, categoryId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Price (₦)</label>
                        <Input
                          type="number"
                          placeholder="2500"
                          value={newTemplate.price}
                          onChange={(e) => setNewTemplate({ ...newTemplate, price: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Description</label>
                        <Textarea
                          placeholder="Describe this product template..."
                          value={newTemplate.description}
                          onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>

                    <Button onClick={handleCreateTemplate} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  </div>

                  {/* Existing Templates */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Existing Product Templates</h3>
                    <div className="space-y-3">
                      {productGroups.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No product templates found. Create one above.</p>
                        </div>
                      ) : (
                        productGroups.map((template) => {
                          const category = categories.find(cat => cat.id === template.category_id)
                          const isArchived = template.is_active === false
                          return (
                            <div
                              key={template.id}
                              className={`flex items-center justify-between p-4 border rounded-lg ${isArchived ? 'bg-gray-50 dark:bg-gray-800/50 opacity-75' : ''}`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className={`font-medium ${isArchived ? 'text-gray-500' : ''}`}>
                                    {template.name}
                                  </h4>
                                  <Badge variant="outline">{category?.name || 'Unknown'}</Badge>
                                  {isArchived && (
                                    <Badge variant="secondary">Archived</Badge>
                                  )}
                                  <Badge variant={template.stock_count > 0 ? 'default' : 'secondary'}>
                                    {template.stock_count} in stock
                                  </Badge>
                                </div>
                                <p className={`text-sm text-muted-foreground ${isArchived ? 'text-gray-400' : ''}`}>
                                  {template.description} • ₦{template.price.toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditTemplate(template)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {isArchived ? (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleRestoreTemplate(template.id)}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    Restore
                                  </Button>
                                ) : (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleArchiveTemplate(template.id)}
                                      className="text-orange-600 hover:text-orange-700"
                                    >
                                      Archive
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleDeleteTemplate(template.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Management */}
            <TabsContent value="products" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Management</CardTitle>
                  <p className="text-muted-foreground">
                    View and manage all products in your inventory ({individualAccounts.length} total accounts)
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {individualAccounts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No products found. Add some products using the tabs above.</p>
                      </div>
                    ) : (
                      individualAccounts.map((account) => {
                        const productGroup = productGroups.find(pg => pg.id === account.product_group_id)
                        const category = categories.find(cat => cat.id === productGroup?.category_id)
                        
                        return (
                          <div
                            key={account.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-medium">@{account.username}</h3>
                                <Badge variant={account.status === 'available' ? 'default' : account.status === 'sold' ? 'secondary' : 'destructive'}>
                                  {account.status}
                                </Badge>
                                {account.additional_info?.followers && (
                                  <Badge variant="outline">{parseInt(account.additional_info.followers).toLocaleString()} followers</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground space-x-4">
                                <span>Category: {category?.name || 'Unknown'}</span>
                                <span>Price: ₦{productGroup?.price?.toLocaleString() || '0'}</span>
                                <span>Added: {new Date(account.created_at).toLocaleDateString()}</span>
                                {account.email && <span>Email: {account.email}</span>}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewAccount(account)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditAccount(account)}
                                title="Edit account"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteAccount(account.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Delete account"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })
                    )}
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
                            {categories.length === 0 ? (
                              <SelectItem value="" disabled>No categories available</SelectItem>
                            ) : (
                              categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))
                            )}
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
                    Bulk Account Upload
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Upload CSV files with account credentials to an existing product template
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Template Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select Product Template</label>
                    <Select 
                      value={selectedTemplate} 
                      onValueChange={setSelectedTemplate}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a product template" />
                      </SelectTrigger>
                      <SelectContent>
                        {productGroups.map((template) => {
                          const category = categories.find(cat => cat.id === template.category_id)
                          return (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name} ({category?.name}) - ₦{template.price.toLocaleString()}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {selectedTemplate && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Accounts will be added to: {productGroups.find(pg => pg.id === selectedTemplate)?.name}
                      </p>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
                    <p className="text-muted-foreground mb-4">
                      Choose a CSV file with account credentials
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
                        <li><strong>password</strong> - Account password (required)</li>
                        <li><strong>email</strong> OR <strong>username</strong> - Account identifier (at least one required)</li>
                      </ul>
                      <p className="font-medium mb-2 mt-4">Optional columns:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li><strong>email_password</strong> - Email account password</li>
                        <li><strong>two_fa</strong> or <strong>two_fa_code</strong> - Two-factor authentication code</li>
                        <li><strong>username</strong> - Account username (if email is primary identifier)</li>
                      </ul>
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          💡 Sample CSV format:
                        </p>
                        <code className="text-xs text-blue-700 dark:text-blue-300 block mt-1">
                          username,password,email,email_password,two_fa<br/>
                          john_doe,pass123,john@email.com,emailpass123,123456<br/>
                          jane_smith,mypass,jane@email.com,,
                        </code>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleCsvUpload} 
                    disabled={!csvFile || !selectedTemplate}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Accounts to Template
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
                          <h3 className="font-medium">{category.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {category.description} • {productGroups.filter(pg => pg.category_id === category.id).length} product groups
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditCategory(category)}
                            title="Edit category"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete category"
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
                            placeholder="e.g., Instagram Accounts"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
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
