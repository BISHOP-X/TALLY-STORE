import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  resendConfirmation: (email: string) => Promise<{ success: boolean; error?: string }>
  isAdmin: boolean
  walletBalance: number
  walletLoading: boolean
  refreshWalletBalance: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [walletLoading, setWalletLoading] = useState(true)
  const lastProfileLoadKey = useRef<string | null>(null)

  const checkAdminStatus = useCallback(async (userId: string) => {
    setWalletLoading(true)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin, wallet_balance')
        .eq('id', userId)
        .single()

      if (error) {
        setIsAdmin(false)
        setWalletBalance(0)
        return
      }

      setIsAdmin(data?.is_admin || false)
      setWalletBalance(data?.wallet_balance || 0)
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
      setWalletBalance(0)
    } finally {
      setWalletLoading(false)
    }
  }, [])

  useEffect(() => {
    const syncSession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)

      if (sessionUser) {
        const profileLoadKey = `${sessionUser.id}:${sessionUser.email ?? ''}`
        if (lastProfileLoadKey.current !== profileLoadKey) {
          lastProfileLoadKey.current = profileLoadKey
          checkAdminStatus(sessionUser.id)
        }
      } else {
        lastProfileLoadKey.current = null
        setIsAdmin(false)
        setWalletBalance(0)
        setWalletLoading(false)
      }

      setLoading(false)
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        syncSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [checkAdminStatus])

  const refreshWalletBalance = useCallback(async () => {
    if (!user) {
      setWalletBalance(0)
      setWalletLoading(false)
      return
    }

    setWalletLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setWalletBalance(data.wallet_balance || 0)
      }
    } catch (error) {
      console.error('Error refreshing wallet balance:', error)
    } finally {
      setWalletLoading(false)
    }
  }, [user])

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: email.split('@')[0], // Use email prefix as name
          },
          emailRedirectTo: `${window.location.origin}/email-confirmation`
        }
      })

      if (error) {
        // If user already exists but isn't confirmed, offer to resend confirmation
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          return { 
            success: false, 
            error: 'User already exists. Please check your email for the confirmation link, or we can resend it.' 
          }
        }
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Sign up failed' }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Sign in failed' }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setIsAdmin(false)
  }

  const resendConfirmation = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/email-confirmation`
        }
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to resend confirmation email' }
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resendConfirmation,
    isAdmin,
    walletBalance,
    walletLoading,
    refreshWalletBalance
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
