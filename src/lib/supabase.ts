import { createClient } from '@supabase/supabase-js'
import { sendCredentialsEmail } from './email'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test database connection and setup
export async function testAuthConnection(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔍 Testing Supabase auth connection...')
    
    // Test basic connection
    const { data: { session } } = await supabase.auth.getSession()
    console.log('✅ Supabase auth connection successful')
    
    // Test if profiles table exists
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (error) {
      if (error.code === '42P01') { // Table doesn't exist
        return { 
          success: false, 
          message: 'Profiles table not found. Please run the setup SQL script in Supabase.' 
        }
      }
      throw error
    }
    
    console.log('✅ Profiles table exists and accessible')
    return { success: true, message: 'Authentication tables are ready!' }
    
  } catch (error) {
    console.error('❌ Auth connection test failed:', error)
    return { 
      success: false, 
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

// User authentication functions
export async function createUserProfile(userId: string, username: string): Promise<{ success: boolean; message: string; profile?: Profile }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          username: username,
          wallet_balance: 0,
          is_admin: false,
        }
      ])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, message: 'Username already taken' }
      }
      throw error
    }

    return { success: true, message: 'Profile created successfully', profile: data }
  } catch (error) {
    console.error('Error creating user profile:', error)
    return { 
      success: false, 
      message: `Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

// Database types
export interface Profile {
  id: string
  username: string
  wallet_balance: number
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
}

export interface ProductGroup {
  id: string
  category_id: string
  name: string
  description?: string
  price: number
  features?: any[]
  stock_count: number
  is_active: boolean
  created_at: string
  categories?: { name: string }
}

export interface Product {
  id: string
  category_id: string
  username: string
  password: string
  tfa_code: string
  email?: string
  email_password?: string
  price: number
  is_sold: boolean
  sold_to?: string
  created_at: string
  sold_at?: string
}

export interface Order {
  id: string
  user_id: string
  product_group_id: string // Changed back to product_group_id for foreign key
  amount: number
  status: string
  account_details?: any
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: 'topup' | 'purchase'
  amount: number
  status: string
  reference: string
  ercas_reference?: string
  created_at: string
}

// STEP 1B: Basic database functions
export async function getCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log('✅ Categories fetched from Supabase:', data)
    return data || []
  } catch (error) {
    console.error('❌ Error fetching categories:', error)
    return []
  }
}

export async function getAllProductGroups(): Promise<ProductGroup[]> {
  try {
    const { data, error } = await supabase
      .from('product_groups')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log('✅ Product groups fetched from Supabase:', data)
    return data || []
  } catch (error) {
    console.error('❌ Error fetching product groups:', error)
    return []
  }
}

export async function testConnection() {
  try {
    // Test basic Supabase connection without hitting RLS policies
    // Just test if we can reach Supabase at all
    const { data: { session } } = await supabase.auth.getSession()
    
    console.log('🔗 Supabase connection successful!')
    console.log('📊 Current session:', session ? 'Authenticated' : 'Anonymous')
    
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    return false
  }
}

// ====================================
// ADMIN CRUD OPERATIONS
// ====================================

// === CATEGORIES MANAGEMENT ===
export async function createCategory(name: string, displayName: string, description?: string): Promise<Category | null> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        name: displayName,
        description,
        is_active: true
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating category:', error)
      throw error
    }

    console.log('✅ Category created:', data)
    return data
  } catch (error) {
    console.error('❌ Failed to create category:', error)
    throw error
  }
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating category:', error)
      throw error
    }

    console.log('✅ Category updated:', data)
    return data
  } catch (error) {
    console.error('❌ Failed to update category:', error)
    return null
  }
}

export async function deleteCategory(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ Error deleting category:', error)
      throw error
    }

    console.log('✅ Category deleted:', id)
    return true
  } catch (error) {
    console.error('❌ Failed to delete category:', error)
    return false
  }
}

// === PRODUCT GROUPS MANAGEMENT ===
export async function createProductGroup(productGroup: Omit<ProductGroup, 'id' | 'created_at'>): Promise<ProductGroup | null> {
  try {
    const { data, error } = await supabase
      .from('product_groups')
      .insert([productGroup])
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating product group:', error)
      throw error
    }

    console.log('✅ Product group created:', data)
    return data
  } catch (error) {
    console.error('❌ Failed to create product group:', error)
    return null
  }
}

export async function updateProductGroup(id: string, updates: Partial<ProductGroup>): Promise<ProductGroup | null> {
  try {
    const { data, error } = await supabase
      .from('product_groups')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating product group:', error)
      throw error
    }

    console.log('✅ Product group updated:', data)
    return data
  } catch (error) {
    console.error('❌ Failed to update product group:', error)
    return null
  }
}

export async function deleteProductGroup(id: string): Promise<boolean> {
  try {
    // First check if there are any orders referencing this product group
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('product_group_id', id)
      .limit(1)

    if (ordersError) {
      console.error('❌ Error checking orders:', ordersError)
      throw ordersError
    }

    if (orders && orders.length > 0) {
      throw new Error('Cannot delete product group that has existing orders. Please archive it instead or contact support.')
    }

    // Check if there are any individual accounts referencing this product group
    const { data: accounts, error: accountsError } = await supabase
      .from('individual_accounts')
      .select('id')
      .eq('product_group_id', id)
      .limit(1)

    if (accountsError) {
      console.error('❌ Error checking accounts:', accountsError)
      throw accountsError
    }

    if (accounts && accounts.length > 0) {
      throw new Error('Cannot delete product group that has existing accounts. Please remove all accounts first.')
    }

    // If no dependencies, proceed with deletion
    const { error } = await supabase
      .from('product_groups')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ Error deleting product group:', error)
      throw error
    }

    console.log('✅ Product group deleted:', id)
    return true
  } catch (error) {
    console.error('❌ Failed to delete product group:', error)
    return false
  }
}

// Archive a product group (set is_active to false)
export async function archiveProductGroup(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('product_groups')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('❌ Error archiving product group:', error)
      throw error
    }

    console.log('✅ Product group archived:', id)
    return true
  } catch (error) {
    console.error('❌ Failed to archive product group:', error)
    return false
  }
}

// Restore an archived product group
export async function restoreProductGroup(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('product_groups')
      .update({ is_active: true })
      .eq('id', id)

    if (error) {
      console.error('❌ Error restoring product group:', error)
      throw error
    }

    console.log('✅ Product group restored:', id)
    return true
  } catch (error) {
    console.error('❌ Failed to restore product group:', error)
    return false
  }
}

// === INDIVIDUAL ACCOUNTS MANAGEMENT ===
export interface IndividualAccount {
  id: string
  product_group_id: string
  username: string
  password: string
  email?: string
  email_password?: string
  two_fa_code?: string
  additional_info?: any
  status: 'available' | 'sold' | 'reserved'
  created_at: string
  sold_at?: string
}

export async function createIndividualAccount(account: Omit<IndividualAccount, 'id' | 'created_at'>): Promise<IndividualAccount | null> {
  try {
    const { data, error } = await supabase
      .from('individual_accounts')
      .insert([account])
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating individual account:', error)
      throw error
    }

    // Update stock count in product group
    await updateProductGroupStock(account.product_group_id)

    console.log('✅ Individual account created:', data)
    return data
  } catch (error) {
    console.error('❌ Failed to create individual account:', error)
    return null
  }
}

export async function bulkCreateIndividualAccounts(accounts: Omit<IndividualAccount, 'id' | 'created_at'>[]): Promise<IndividualAccount[]> {
  try {
    const { data, error } = await supabase
      .from('individual_accounts')
      .insert(accounts)
      .select()

    if (error) {
      console.error('❌ Error bulk creating accounts:', error)
      throw error
    }

    // Update stock counts for all affected product groups
    const productGroupIds = [...new Set(accounts.map(acc => acc.product_group_id))]
    await Promise.all(productGroupIds.map(id => updateProductGroupStock(id)))

    console.log('✅ Bulk accounts created:', data.length)
    return data
  } catch (error) {
    console.error('❌ Failed to bulk create accounts:', error)
    return []
  }
}

export async function getIndividualAccounts(productGroupId?: string): Promise<IndividualAccount[]> {
  try {
    let query = supabase.from('individual_accounts').select('*')
    
    if (productGroupId) {
      query = query.eq('product_group_id', productGroupId)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching individual accounts:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('❌ Failed to fetch individual accounts:', error)
    return []
  }
}

export async function deleteIndividualAccount(id: string): Promise<boolean> {
  try {
    // Get the account to know which product group to update
    const { data: account } = await supabase
      .from('individual_accounts')
      .select('product_group_id')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('individual_accounts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ Error deleting individual account:', error)
      throw error
    }

    // Update stock count
    if (account) {
      await updateProductGroupStock(account.product_group_id)
    }

    console.log('✅ Individual account deleted:', id)
    return true
  } catch (error) {
    console.error('❌ Failed to delete individual account:', error)
    return false
  }
}

export async function updateIndividualAccount(id: string, updates: Partial<Omit<IndividualAccount, 'id' | 'created_at'>>): Promise<IndividualAccount | null> {
  try {
    const { data, error } = await supabase
      .from('individual_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating individual account:', error)
      throw error
    }

    console.log('✅ Individual account updated:', data)
    return data
  } catch (error) {
    console.error('❌ Failed to update individual account:', error)
    return null
  }
}

// === UTILITY FUNCTIONS ===
export async function updateProductGroupStock(productGroupId: string): Promise<void> {
  try {
    // Count available accounts
    const { count, error } = await supabase
      .from('individual_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('product_group_id', productGroupId)
      .eq('status', 'available')

    if (error) {
      console.error('❌ Error counting accounts:', error)
      return
    }

    // Update the product group stock
    const { error: updateError } = await supabase
      .from('product_groups')
      .update({ stock_count: count || 0 })
      .eq('id', productGroupId)

    if (updateError) {
      console.error('❌ Error updating stock:', updateError)
      return
    }

    console.log('✅ Stock updated for product group:', productGroupId, 'New count:', count)
  } catch (error) {
    console.error('❌ Failed to update stock:', error)
  }
}

// Get product groups by category
export async function getProductGroupsByCategory(categoryId: string): Promise<ProductGroup[]> {
  try {
    const { data, error } = await supabase
      .from('product_groups')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching product groups by category:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Database error:', error)
    throw error
  }
}

// Get individual accounts by product group
export async function getIndividualAccountsByProductGroup(productGroupId: string): Promise<IndividualAccount[]> {
  try {
    const { data, error } = await supabase
      .from('individual_accounts')
      .select('*')
      .eq('product_group_id', productGroupId)
      .eq('status', 'available')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching individual accounts by product group:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Database error:', error)
    throw error
  }
}

// === CSV PARSING UTILITY ===
export function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const rows = lines.slice(1)

  return rows.map(row => {
    const values = row.split(',').map(v => v.trim())
    const obj: any = {}
    
    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })
    
    return obj
  })
}

// === PRODUCT TEMPLATE MANAGEMENT ===
export interface ProductTemplate {
  productName: string
  description: string
  price: number
  categoryId: string
}

// Create a product group for bulk account uploads
export async function createProductTemplate(template: ProductTemplate): Promise<ProductGroup | null> {
  try {
    const productGroupData = {
      category_id: template.categoryId,
      name: template.productName,
      description: template.description,
      price: template.price,
      features: [],
      stock_count: 0,
      is_active: true
    }

    const productGroup = await createProductGroup(productGroupData)
    return productGroup
  } catch (error) {
    console.error('Error creating product template:', error)
    return null
  }
}

// Process CSV accounts and link them to a product group
export async function processBulkAccountUpload(
  csvData: any[], 
  productGroupId: string
): Promise<{ success: boolean; accountsCreated: number; error?: string }> {
  try {
    console.log('📤 Processing bulk account upload for product group:', productGroupId)

    if (!csvData || csvData.length === 0) {
      return { success: false, accountsCreated: 0, error: 'No account data provided' }
    }

    // Validate required fields in CSV
    const requiredFields = ['password']
    const optionalFields = ['email', 'username', 'email_password', 'two_fa', 'two_fa_code']
    
    const firstRow = csvData[0]
    const hasPassword = 'password' in firstRow
    const hasEmail = 'email' in firstRow
    const hasUsername = 'username' in firstRow

    if (!hasPassword) {
      return { success: false, accountsCreated: 0, error: 'CSV must contain password field' }
    }

    if (!hasEmail && !hasUsername) {
      return { success: false, accountsCreated: 0, error: 'CSV must contain either email or username field (or both)' }
    }

    // Create accounts array
    const accountsToCreate: Omit<IndividualAccount, 'id' | 'created_at'>[] = []

    for (const row of csvData) {
      // Skip rows without required data
      if (!row.password || (!row.email && !row.username)) {
        console.warn('Skipping row with missing required data:', row)
        continue
      }

      const accountData: Omit<IndividualAccount, 'id' | 'created_at'> = {
        product_group_id: productGroupId,
        username: row.username || row.email || '', // Use email as username if username not provided
        password: row.password,
        email: row.email || undefined,
        email_password: row.email_password || undefined,
        two_fa_code: row.two_fa || row.two_fa_code || undefined,
        additional_info: null,
        status: 'available'
      }

      accountsToCreate.push(accountData)
    }

    if (accountsToCreate.length === 0) {
      return { success: false, accountsCreated: 0, error: 'No valid accounts found in CSV' }
    }

    // Bulk create accounts
    const createdAccounts = await bulkCreateIndividualAccounts(accountsToCreate)
    
    if (createdAccounts.length === 0) {
      return { success: false, accountsCreated: 0, error: 'Failed to create accounts' }
    }

    // Update product group stock count
    await updateProductGroupStock(productGroupId)

    console.log(`✅ Successfully created ${createdAccounts.length} accounts`)
    
    return { 
      success: true, 
      accountsCreated: createdAccounts.length,
      error: createdAccounts.length < accountsToCreate.length ? 
        `${accountsToCreate.length - createdAccounts.length} accounts failed to create` : undefined
    }

  } catch (error) {
    console.error('❌ Error processing bulk account upload:', error)
    return { 
      success: false, 
      accountsCreated: 0, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

// ===============================
// PURCHASE PROCESSING FUNCTIONS
// ===============================

// Get user's wallet balance
export async function getUserWalletBalance(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching wallet balance:', error)
      return 0
    }

    return data?.wallet_balance || 0
  } catch (error) {
    console.error('Error getting wallet balance:', error)
    return 0
  }
}

// Update user's wallet balance (add amount)
export async function updateUserWalletBalance(userId: string, amountToAdd: number): Promise<boolean> {
  try {
    // Get current balance
    const currentBalance = await getUserWalletBalance(userId)
    const newBalance = currentBalance + amountToAdd

    const { error } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', userId)

    if (error) {
      console.error('❌ Error updating wallet balance:', error)
      throw error
    }

    console.log(`✅ Wallet updated: ${userId} +₦${amountToAdd} (New balance: ₦${newBalance})`)
    return true
  } catch (error) {
    console.error('❌ Failed to update wallet balance:', error)
    return false
  }
}

// Get available account for purchase
export async function getAvailableAccount(productGroupId: string): Promise<IndividualAccount | null> {
  try {
    const { data, error } = await supabase
      .from('individual_accounts')
      .select('*')
      .eq('product_group_id', productGroupId)
      .eq('status', 'available')
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching available account:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting available account:', error)
    return null
  }
}

// Get multiple available accounts for bulk purchase
export async function getAvailableAccounts(productGroupId: string, quantity: number): Promise<IndividualAccount[]> {
  try {
    const { data, error } = await supabase
      .from('individual_accounts')
      .select('*')
      .eq('product_group_id', productGroupId)
      .eq('status', 'available')
      .limit(quantity)

    if (error) {
      console.error('Error fetching available accounts:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting available accounts:', error)
    return []
  }
}

// Process bulk purchase transaction (for quantity-based buying)
export async function processBulkPurchase(
  userId: string, 
  productGroupId: string,
  quantity: number
): Promise<{ success: boolean; error?: string; orderData?: any; accounts?: IndividualAccount[] }> {
  try {
    console.log('🛒 Starting bulk purchase process for user:', userId, 'productGroup:', productGroupId, 'quantity:', quantity)

    // 1. Get product group details for pricing
    const { data: productGroup, error: productError } = await supabase
      .from('product_groups')
      .select('*, categories(name)')
      .eq('id', productGroupId)
      .single()

    if (productError || !productGroup) {
      console.error('Product group not found:', productError)
      return { success: false, error: 'Product not found' }
    }

    // 2. Check if enough accounts are available
    const availableAccounts = await getAvailableAccounts(productGroupId, quantity)
    if (availableAccounts.length < quantity) {
      return { 
        success: false, 
        error: `Only ${availableAccounts.length} accounts available, but ${quantity} requested` 
      }
    }

    // 3. Check user wallet balance
    const totalPrice = productGroup.price * quantity
    const walletBalance = await getUserWalletBalance(userId)
    if (walletBalance < totalPrice) {
      return { success: false, error: 'Insufficient wallet balance' }
    }

    // 4. Reserve all selected accounts
    const accountIds = availableAccounts.map(acc => acc.id)
    const { error: reserveError } = await supabase
      .from('individual_accounts')
      .update({ status: 'reserved' })
      .in('id', accountIds)
      .eq('status', 'available')

    if (reserveError) {
      console.error('Failed to reserve accounts:', reserveError)
      return { success: false, error: 'Failed to reserve accounts - some may have been sold to others' }
    }

    // 5. Deduct wallet balance
    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ 
        wallet_balance: walletBalance - totalPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (balanceError) {
      // Rollback: unreserve the accounts
      await supabase
        .from('individual_accounts')
        .update({ status: 'available' })
        .in('id', accountIds)
      
      return { success: false, error: 'Failed to process payment' }
    }

    // 6. Create order record - using actual database schema
    const orderData = {
      user_id: userId,
      product_group_id: productGroupId, // Changed back to product_group_id for foreign key
      amount: totalPrice,
      status: 'completed',
      account_details: {
        accounts: availableAccounts.map(acc => ({
          username: acc.username,
          password: acc.password,
          email: acc.email,
          email_password: acc.email_password,
          two_fa_code: acc.two_fa_code,
          additional_info: acc.additional_info
        })),
        product_name: productGroup.name,
        category: productGroup.categories?.name,
        quantity: quantity,
        price_per_unit: productGroup.price
      }
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single()

    if (orderError) {
      console.error('❌ Order creation failed:', orderError)
      console.error('❌ Order data that failed:', orderData)
      
      // Rollback: restore wallet balance and unreserve accounts
      await supabase
        .from('profiles')
        .update({ wallet_balance: walletBalance })
        .eq('id', userId)
      
      await supabase
        .from('individual_accounts')
        .update({ status: 'available' })
        .in('id', accountIds)
      
      return { success: false, error: `Failed to create order: ${orderError.message}` }
    }

    // 7. Mark accounts as sold
    const { error: soldError } = await supabase
      .from('individual_accounts')
      .update({ 
        status: 'sold',
        sold_at: new Date().toISOString()
      })
      .in('id', accountIds)

    if (soldError) {
      console.error('Warning: Accounts not marked as sold, but purchase completed')
    }

    // 8. Update product group stock count
    await updateProductGroupStock(productGroupId)

    // 9. Record transaction
    const newBalance = walletBalance - totalPrice
    await supabase
      .from('transactions')
      .insert([{
        user_id: userId,
        type: 'purchase',
        amount: -totalPrice,
        balance_after: newBalance,
        description: `Bulk Purchase: ${quantity}x ${productGroup.name}`,
        reference: `ORD-${order.id.substring(0, 8).toUpperCase()}`
      }])

    console.log('✅ Bulk purchase completed successfully!')
    
    // Update product group stock count
    await updateProductGroupStock(productGroupId)
    
    // Send credentials email automatically
    try {
      // Get user email for sending credentials
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (userProfile) {
        // Get user auth data for email
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user?.email) {
          const credentials = {
            accounts: availableAccounts.map((account, index) => ({
              accountNumber: index + 1,
              username: account.username,
              password: account.password,
              email: account.email,
              email_password: account.email_password,
              two_fa_code: account.two_fa_code,
              additional_info: account.additional_info
            }))
          }

          await sendCredentialsEmail({
            userEmail: user.email,
            userName: user.email.split('@')[0],
            credentials,
            orderId: order.id
          })
          
          console.log('✅ Credentials email sent automatically')
        }
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send automatic credentials email:', emailError)
      // Don't fail the purchase if email fails
    }
    
    return { 
      success: true, 
      orderData: {
        ...order,
        product_name: productGroup.name,
        category: productGroup.categories?.name
      },
      accounts: availableAccounts
    }

  } catch (error) {
    console.error('❌ Bulk purchase processing error:', error)
    return { success: false, error: 'Purchase failed. Please try again.' }
  }
}

// Process complete purchase transaction
export async function processPurchase(
  userId: string, 
  accountId: string
): Promise<{ success: boolean; error?: string; orderData?: any }> {
  try {
    console.log('🛒 Starting purchase process for user:', userId, 'account:', accountId)

    // 1. Get the specific account details
    const { data: account, error: accountError } = await supabase
      .from('individual_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('status', 'available')
      .single()

    if (accountError || !account) {
      console.error('Account not found or not available:', accountError)
      return { success: false, error: 'Account not found or no longer available' }
    }

    // 2. Get product group details for pricing
    const { data: productGroup, error: productError } = await supabase
      .from('product_groups')
      .select('*, categories(name)')
      .eq('id', account.product_group_id)
      .single()

    if (productError || !productGroup) {
      console.error('Product group not found:', productError)
      return { success: false, error: 'Product details not found' }
    }

    // 3. Check user wallet balance
    const walletBalance = await getUserWalletBalance(userId)
    if (walletBalance < productGroup.price) {
      return { success: false, error: 'Insufficient wallet balance' }
    }

    // 4. Reserve the account first (prevent double-selling)
    const { error: reserveError } = await supabase
      .from('individual_accounts')
      .update({ status: 'reserved' })
      .eq('id', accountId)
      .eq('status', 'available') // Double-check it's still available

    if (reserveError) {
      console.error('Failed to reserve account:', reserveError)
      return { success: false, error: 'Failed to reserve account - may have been purchased by someone else' }
    }

    // 5. Deduct wallet balance
    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ 
        wallet_balance: walletBalance - productGroup.price,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (balanceError) {
      // Rollback: unreserve the account
      await supabase
        .from('individual_accounts')
        .update({ status: 'available' })
        .eq('id', accountId)
      
      return { success: false, error: 'Failed to process payment' }
    }

    // 6. Create order record
    const orderData = {
      user_id: userId,
      product_group_id: account.product_group_id, // Changed back to product_group_id
      amount: productGroup.price,
      status: 'completed',
      account_details: {
        username: account.username,
        password: account.password,
        email: account.email,
        email_password: account.email_password,
        two_fa_code: account.two_fa_code,
        additional_info: account.additional_info,
        product_name: productGroup.name,
        category: productGroup.categories?.name,
        quantity: 1,
        price_per_unit: productGroup.price
      }
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single()

    if (orderError) {
      console.error('❌ Single account order creation failed:', orderError)
      console.error('❌ Order data that failed:', orderData)
      
      // Rollback: restore wallet balance and unreserve account
      await supabase
        .from('profiles')
        .update({ wallet_balance: walletBalance })
        .eq('id', userId)
      
      await supabase
        .from('individual_accounts')
        .update({ status: 'available' })
        .eq('id', accountId)
      
      return { success: false, error: `Failed to create order: ${orderError.message}` }
    }

    // 7. Mark account as sold
    const { error: soldError } = await supabase
      .from('individual_accounts')
      .update({ 
        status: 'sold',
        sold_at: new Date().toISOString()
      })
      .eq('id', accountId)

    if (soldError) {
      console.error('Warning: Account not marked as sold, but purchase completed')
    }

    // 8. Update product group stock count
    await updateProductGroupStock(account.product_group_id)

    // 9. Record transaction
    const newBalance = walletBalance - productGroup.price
    await supabase
      .from('transactions')
      .insert([{
        user_id: userId,
        type: 'purchase',
        amount: -productGroup.price,
        balance_after: newBalance,
        description: `Purchase: ${productGroup.name}`,
        reference: `ORD-${order.id.substring(0, 8).toUpperCase()}`
      }])

    console.log('✅ Purchase completed successfully!')
    
    // Update product group stock count
    await updateProductGroupStock(account.product_group_id)
    
    // Send credentials email automatically
    try {
      // Get user email for sending credentials
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (userProfile) {
        // Get user auth data for email
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user?.email) {
          const credentials = {
            accounts: [{
              accountNumber: 1,
              username: account.username,
              password: account.password,
              email: account.email,
              email_password: account.email_password,
              two_fa_code: account.two_fa_code,
              additional_info: account.additional_info
            }]
          }

          await sendCredentialsEmail({
            userEmail: user.email,
            userName: user.email.split('@')[0],
            credentials,
            orderId: order.id
          })
          
          console.log('✅ Credentials email sent automatically')
        }
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send automatic credentials email:', emailError)
      // Don't fail the purchase if email fails
    }
    
    return { 
      success: true, 
      orderData: {
        ...order,
        product_name: productGroup.name,
        category: productGroup.categories?.name
      }
    }

  } catch (error) {
    console.error('❌ Purchase processing error:', error)
    return { success: false, error: 'Purchase failed. Please try again.' }
  }
}

// Get user's order history
export async function getUserOrders(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        product_groups(name, categories(name))
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user orders:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting user orders:', error)
    return []
  }
}

// Get user transactions
export async function getUserTransactions(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user transactions:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting user transactions:', error)
    return []
  }
}

// Record a wallet top-up transaction
export async function recordTopUpTransaction(
  userId: string, 
  amount: number, 
  reference: string, 
  ercasReference?: string
): Promise<boolean> {
  try {
    // Get current balance to calculate balance_after
    const currentBalance = await getUserWalletBalance(userId);
    
    const transactionData = {
      user_id: userId,
      type: 'topup' as const,
      amount: amount,
      status: 'completed', // Add status field to match purchase transactions
      balance_after: currentBalance, // Add this field to match purchase transactions
      description: `Wallet top-up via Ercas Pay`, // Add description
      reference: reference,
      ercas_reference: ercasReference
    };

    console.log('📝 Attempting to record transaction:', transactionData);

    const { data, error } = await supabase
      .from('transactions')
      .insert([transactionData]) // Use array format like purchase transactions
      .select() // Get the inserted record back

    if (error) {
      console.error('❌ Detailed transaction error:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        data: transactionData
      });
      throw error
    }

    console.log(`✅ Top-up transaction recorded successfully:`, data)
    console.log(`✅ Summary: User ${userId} +₦${amount} (${reference})`)
    return true
  } catch (error) {
    console.error('❌ Failed to record top-up transaction:', error)
    return false
  }
}

// Get individual account by ID
export async function getIndividualAccountById(accountId: string): Promise<IndividualAccount | null> {
  try {
    const { data, error } = await supabase
      .from('individual_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('status', 'available')
      .single()

    if (error) {
      console.error('Error fetching individual account:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting individual account:', error)
    return null
  }
}

// Get product group by ID
export async function getProductGroupById(productGroupId: string): Promise<ProductGroup | null> {
  try {
    const { data, error } = await supabase
      .from('product_groups')
      .select('*, categories(name)')
      .eq('id', productGroupId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching product group:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting product group:', error)
    return null
  }
}

// Get category by ID
export async function getCategoryById(categoryId: string): Promise<Category | null> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching category:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting category:', error)
    return null
  }
}

// Get all users for admin dashboard
export async function getAllUsers(): Promise<Profile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting users:', error)
    return []
  }
}

// Get user count for admin dashboard
export async function getUserCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Error counting users:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Error getting user count:', error)
    return 0
  }
}
