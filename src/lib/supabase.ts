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

// Get total count of individual accounts (for admin dashboard stats)
export async function getIndividualAccountsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('individual_accounts')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('❌ Error counting individual accounts:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('❌ Failed to count individual accounts:', error)
    return 0
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

/**
 * @deprecated SECURITY RISK - DO NOT USE
 * This function has been replaced by the verify-and-credit-wallet Edge Function.
 * Use verifyAndCreditWalletSecure() instead.
 * This function will be removed in a future update.
 */
export async function updateUserWalletBalance(
  userId: string,
  amountToAdd: number,
  reference?: string,
  ercasReference?: string
): Promise<boolean> {
  try {
    // If a reference is provided, ensure we haven't processed it already
    if (reference) {
      const { data: existingTx, error: existingErr } = await supabase
        .from('transactions')
        .select('id')
        .or(`reference.eq.${reference},ercas_reference.eq.${ercasReference || ''}`)
        .limit(1)

      if (existingErr) {
        console.error('❌ Error checking existing transaction for idempotency:', existingErr)
      }

      if (existingTx && (existingTx as any[]).length > 0) {
        console.log('⏭️ Transaction already processed, skipping wallet update:', reference)
        return true
      }
    }

    // Retry loop to avoid race conditions: update only when balance matches the read value
    const maxAttempts = 5
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // CRITICAL: If this is a retry (attempt > 0) and we have a reference, 
      // check if the transaction was recorded by another concurrent process while we were failing.
      if (reference && attempt > 0) {
        const { data: retryCheckTx } = await supabase
          .from('transactions')
          .select('id')
          .or(`reference.eq.${reference},ercas_reference.eq.${ercasReference || ''}`)
          .limit(1)
        
        if (retryCheckTx && (retryCheckTx as any[]).length > 0) {
          console.log('⏭️ Transaction found during retry check, skipping wallet update:', reference)
          return true
        }
      }

      const currentBalance = await getUserWalletBalance(userId)
      const newBalance = currentBalance + amountToAdd

      const { data, error } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
        .match({ id: userId, wallet_balance: currentBalance })
        .select()
        .single()

      if (error) {
        // If it's the last attempt, throw; otherwise retry
        if (attempt === maxAttempts - 1) {
          console.error('❌ Error updating wallet balance after retries:', error)
          throw error
        }
        console.warn('⚠️ Transient error updating wallet balance, retrying...', { attempt, error })
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)))
        continue
      }

      if (!data) {
        // No rows updated (likely due to concurrent modification) — retry
        console.log('🔁 Wallet update conflict detected, retrying...', { attempt })
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)))
        continue
      }

      // Successfully updated balance — record transaction if reference provided
      if (reference) {
        try {
          const { error: txError } = await supabase
            .from('transactions')
            .insert([{
              user_id: userId,
              type: 'topup',
              amount: amountToAdd,
              status: 'completed',
              balance_after: newBalance,
              description: `Wallet top-up via Ercas Pay`,
              reference,
              ercas_reference: ercasReference
            }])

          if (txError) {
            console.error('❌ Failed to record top-up transaction after wallet update:', txError)
          } else {
            console.log('✅ Top-up transaction recorded during wallet update:', reference)
          }
        } catch (txErr) {
          console.error('❌ Exception while recording top-up transaction:', txErr)
        }
      }

      console.log(`✅ Wallet updated: ${userId} +₦${amountToAdd} (New balance: ₦${newBalance})`)
      return true
    }

    console.error('❌ Failed to update wallet after max retries')
    return false
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

// Generate idempotency key for preventing duplicate purchases
function generateIdempotencyKey(userId: string, productGroupId: string, quantity: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `purchase_${userId.substring(0, 8)}_${productGroupId.substring(0, 8)}_${quantity}_${timestamp}_${random}`;
}

// SECURE: Process purchase via Edge Function (server-side)
export async function processPurchaseSecure(
  productGroupId: string,
  quantity: number
): Promise<{ success: boolean; error?: string; order_id?: string; amount?: number; new_balance?: number }> {
  try {
    // Get current session for user ID
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const idempotencyKey = generateIdempotencyKey(session.user.id, productGroupId, quantity);
    
    console.log('🛒 Calling secure purchase Edge Function:', { productGroupId, quantity });

    const { data, error } = await supabase.functions.invoke('process-purchase', {
      body: {
        product_group_id: productGroupId,
        quantity: quantity,
        idempotency_key: idempotencyKey,
      },
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      
      // Try to extract detailed error message from response context
      let errorMessage = error.message || 'Purchase failed';
      
      // Check if error has context with the actual error response
      if (error.context && typeof error.context === 'object') {
        const context = error.context as any;
        if (context.error) {
          errorMessage = context.error;
        } else if (context.message) {
          errorMessage = context.message;
        }
      }
      
      return { success: false, error: errorMessage };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Purchase failed' };
    }

    console.log('✅ Secure purchase completed:', data);
    return {
      success: true,
      order_id: data.order_id,
      amount: data.amount,
      new_balance: data.new_balance,
    };
  } catch (error: any) {
    console.error('❌ processPurchaseSecure error:', error);
    
    // Try to extract meaningful error message
    let errorMessage = 'An unexpected error occurred';
    
    if (error?.message) {
      errorMessage = error.message;
    }
    
    // For FunctionsHttpError, try to parse the response body
    if (error?.context) {
      try {
        // Check for body in context
        if (error.context.body) {
          const body = typeof error.context.body === 'string' 
            ? JSON.parse(error.context.body) 
            : error.context.body;
          if (body.error) {
            errorMessage = body.error;
          }
        }
        // Check for error directly in context
        else if (error.context.error) {
          errorMessage = error.context.error;
        }
      } catch (e) {
        console.error('Failed to parse error context:', e);
      }
    }
    
    return { success: false, error: errorMessage };
  }
}

// SECURE: Verify payment and credit wallet via Edge Function (server-side)
export async function verifyAndCreditWalletSecure(
  transactionReference: string,
  ercasReference?: string
): Promise<{ success: boolean; error?: string; amount?: number; new_balance?: number; already_processed?: boolean }> {
  try {
    console.log('🔍 Calling secure verify-and-credit Edge Function:', transactionReference);

    const { data, error } = await supabase.functions.invoke('verify-and-credit-wallet', {
      body: {
        transaction_reference: transactionReference,
        ercas_reference: ercasReference,
      },
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      return { success: false, error: error.message || 'Verification failed' };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Verification failed' };
    }

    console.log('✅ Wallet credited:', data);
    return {
      success: true,
      amount: data.amount,
      new_balance: data.new_balance,
      already_processed: data.already_processed,
    };
  } catch (error) {
    console.error('❌ verifyAndCreditWalletSecure error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get multiple available accounts for bulk purchase
// NOTE: This function is deprecated - accounts are now fetched server-side only
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

/**
 * @deprecated SECURITY RISK - DO NOT USE
 * This function has been replaced by the process-purchase Edge Function.
 * Use processPurchaseSecure() instead.
 * This function will be removed in a future update.
 */
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
      balance_after: currentBalance + amount, // balance after top-up
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

// Get admin sales statistics from orders table
export async function getAdminSalesStats(): Promise<{ totalSales: number; totalRevenue: number }> {
  try {
    // Get total count of completed orders using exact count (bypasses 1000 row limit)
    const { count: totalSales, error: countError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')

    if (countError) {
      console.error('Error fetching sales count:', countError)
      return { totalSales: 0, totalRevenue: 0 }
    }

    // For revenue, we need to fetch amounts in batches to handle >1000 orders
    // Supabase doesn't support SUM aggregation directly, so we paginate
    let totalRevenue = 0
    const batchSize = 1000
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const { data: orders, error: revenueError } = await supabase
        .from('orders')
        .select('amount')
        .eq('status', 'completed')
        .range(offset, offset + batchSize - 1)

      if (revenueError) {
        console.error('Error fetching revenue batch:', revenueError)
        break
      }

      if (!orders || orders.length === 0) {
        hasMore = false
      } else {
        totalRevenue += orders.reduce((sum, order) => sum + (order.amount || 0), 0)
        offset += batchSize
        // If we got fewer than batchSize, we've reached the end
        if (orders.length < batchSize) {
          hasMore = false
        }
      }
    }

    return { totalSales: totalSales || 0, totalRevenue }
  } catch (error) {
    console.error('Error getting admin sales stats:', error)
    return { totalSales: 0, totalRevenue: 0 }
  }
}

// ==================== USER MANAGEMENT FUNCTIONS ====================

// Search users by email or name
export async function searchUsers(query: string) {
  try {
    if (!query || query.trim() === '') {
      return getAllUsers()
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error searching users:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in searchUsers:', error)
    throw error
  }
}

// SECURE: Admin adjust user wallet/crypto balance via Edge Function
export async function adminAdjustBalance(
  userId: string,
  amount: number,
  reason: string,
  _adminEmail: string, // Kept for backwards compatibility, but verified server-side
  balanceType: 'wallet' | 'crypto' = 'wallet'
): Promise<{ success: boolean; newBalance: number; previousBalance?: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('admin-adjust-balance', {
      body: {
        target_user_id: userId,
        adjustment_amount: amount,
        balance_type: balanceType,
        reason: reason,
        idempotency_key: `admin-${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      },
    });

    if (error) {
      console.error('Admin adjust balance Edge Function error:', error);
      throw new Error(error.message || 'Failed to adjust balance');
    }

    if (!data.success) {
      throw new Error(data.error || 'Balance adjustment failed');
    }

    console.log('✅ Balance adjusted via Edge Function:', {
      user: data.target_email,
      previousBalance: data.previous_balance,
      adjustment: data.adjustment,
      newBalance: data.new_balance,
      reason: data.reason,
      admin: data.adjusted_by
    });

    return { 
      success: true, 
      newBalance: data.new_balance,
      previousBalance: data.previous_balance
    };
  } catch (error) {
    console.error('Error in adminAdjustBalance:', error);
    throw error;
  }
}

// Get user's order history (admin view)
export async function getUserOrdersAdmin(userId: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        product_groups (
          name,
          price,
          category_id,
          categories (
            name
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user orders:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserOrdersAdmin:', error)
    throw error
  }
}

// Create pending payment record for automatic recovery
export async function createPendingPayment(params: {
  userId: string;
  transactionReference: string;
  ercasReference?: string;
  amount: number;
}) {
  try {
    const { data, error } = await supabase
      .from('pending_payments')
      .insert({
        user_id: params.userId,
        transaction_reference: params.transactionReference,
        ercas_reference: params.ercasReference || null,
        amount: params.amount,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating pending payment:', error)
      throw error
    }

    console.log('✅ Pending payment record created:', data)
    return data
  } catch (error) {
    console.error('Error in createPendingPayment:', error)
    // Don't throw - this is optional tracking, shouldn't block payment
    return null
  }
}
