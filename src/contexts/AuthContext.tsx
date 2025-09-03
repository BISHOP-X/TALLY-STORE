import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

// Types
export interface User {
  id: string
  username: string
  email: string
  role: 'user' | 'admin'
  wallet_balance: number
  created_at: string
}

interface AuthContextType {
  // Auth State
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
  
  // Navigation State
  intendedRoute: string | null
  
  // Auth Actions
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  
  // Navigation Actions
  setIntendedRoute: (route: string) => void
  navigateToIntended: () => void
  
  // Utility
  hasRole: (role: 'user' | 'admin') => boolean
  requireAuth: (action?: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock users database (will be replaced with Supabase)
const MOCK_USERS = [
  {
    id: 'admin-1',
    username: 'Admin',
    email: 'admin@tallystore.com',
    password: 'admin123',
    role: 'admin' as const,
    wallet_balance: 0,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-1',
    username: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'user' as const,
    wallet_balance: 25000,
    created_at: '2024-01-15T00:00:00Z'
  }
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [intendedRoute, setIntendedRoute] = useState<string | null>(null)
  const navigate = useNavigate()

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      try {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
        const userData = localStorage.getItem('userData')
        
        if (isLoggedIn && userData) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        // Clear invalid data
        localStorage.removeItem('isLoggedIn')
        localStorage.removeItem('userData')
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  // Mock login function (will be replaced with Supabase auth)
  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    try {
      const foundUser = MOCK_USERS.find(u => u.email === email && u.password === password)
      
      if (!foundUser) {
        return { success: false, message: 'Invalid email or password' }
      }
      
      // Create user object without password
      const { password: _, ...userWithoutPassword } = foundUser
      
      // Set auth state
      setUser(userWithoutPassword)
      setIsAuthenticated(true)
      
      // Persist to localStorage
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userData', JSON.stringify(userWithoutPassword))
      
      return { success: true, message: 'Login successful' }
      
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: 'Login failed. Please try again.' }
    } finally {
      setIsLoading(false)
    }
  }

  // Mock register function (will be replaced with Supabase auth)
  const register = async (username: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    try {
      // Check if user already exists
      const existingUser = MOCK_USERS.find(u => u.email === email)
      if (existingUser) {
        return { success: false, message: 'User with this email already exists' }
      }
      
      // Create new user
      const newUser: User = {
        id: `user-${Date.now()}`,
        username,
        email,
        role: 'user',
        wallet_balance: 0, // New users start with 0 balance
        created_at: new Date().toISOString()
      }
      
      // Add to mock database (in real app, this would be Supabase)
      MOCK_USERS.push({ ...newUser, password } as any)
      
      // Auto-login after registration
      setUser(newUser)
      setIsAuthenticated(true)
      
      // Persist to localStorage
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userData', JSON.stringify(newUser))
      
      return { success: true, message: 'Registration successful' }
      
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, message: 'Registration failed. Please try again.' }
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    setIntendedRoute(null)
    
    // Clear localStorage
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userData')
    
    // Navigate to home
    navigate('/')
  }

  // Navigation helpers
  const navigateToIntended = () => {
    const route = intendedRoute || (user?.role === 'admin' ? '/admin' : '/dashboard')
    setIntendedRoute(null)
    navigate(route)
  }

  // Utility functions
  const hasRole = (role: 'user' | 'admin'): boolean => {
    return user?.role === role
  }

  const requireAuth = (action?: string): boolean => {
    if (!isAuthenticated) {
      // Store current location for redirect after login
      if (action) {
        setIntendedRoute(window.location.pathname)
      }
      return false
    }
    return true
  }

  const value: AuthContextType = {
    // State
    isAuthenticated,
    user,
    isLoading,
    intendedRoute,
    
    // Actions
    login,
    register,
    logout,
    setIntendedRoute,
    navigateToIntended,
    
    // Utilities
    hasRole,
    requireAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper hooks for common patterns
export function useRequireAuth() {
  const { isAuthenticated, setIntendedRoute } = useAuth()
  const navigate = useNavigate()
  
  const requireAuth = (redirectPath?: string) => {
    if (!isAuthenticated) {
      if (redirectPath) {
        setIntendedRoute(redirectPath)
      }
      navigate('/login')
      return false
    }
    return true
  }
  
  return requireAuth
}

export function useAuthRedirect() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  
  useEffect(() => {
    if (isAuthenticated && user) {
      const currentPath = window.location.pathname
      const authPages = ['/login', '/register']
      
      if (authPages.includes(currentPath)) {
        const defaultRoute = user.role === 'admin' ? '/admin' : '/dashboard'
        navigate(defaultRoute)
      }
    }
  }, [isAuthenticated, user, navigate])
}
