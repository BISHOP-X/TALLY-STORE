import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  redirectTo?: string
  requireRole?: 'user' | 'admin'
}

export function ProtectedRoute({ children, redirectTo = '/login', requireRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading, setIntendedRoute } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    // Store intended route for redirect after login
    setIntendedRoute(location.pathname + location.search)
    return <Navigate to={redirectTo} replace />
  }

  // Check role requirement
  if (requireRole && user?.role !== requireRole) {
    // User doesn't have required role - redirect based on their actual role
    const userRedirect = user?.role === 'admin' ? '/admin' : '/dashboard'
    return <Navigate to={userRedirect} replace />
  }

  return <>{children}</>
}

interface PublicRouteProps {
  children: ReactNode
  redirectTo?: string
}

export function PublicRoute({ children, redirectTo }: PublicRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth()

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Already authenticated - redirect to appropriate dashboard
  if (isAuthenticated && user) {
    const defaultRedirect = user.role === 'admin' ? '/admin' : '/dashboard'
    return <Navigate to={redirectTo || defaultRedirect} replace />
  }

  return <>{children}</>
}
