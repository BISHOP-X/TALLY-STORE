import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  description: string
  is_active: boolean
  created_at: string
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
  product_id: string
  amount_paid: number
  purchase_date: string
  delivery_status: string
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
