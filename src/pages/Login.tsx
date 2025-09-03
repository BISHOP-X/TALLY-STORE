import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth, useAuthRedirect } from '@/contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  
  const { login, isLoading, navigateToIntended } = useAuth()
  
  // Redirect if already logged in
  useAuthRedirect()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = await login(email, password)
    
    if (result.success) {
      // Navigate to intended route or default dashboard
      navigateToIntended()
    } else {
      setError(result.message)
    }
  }

  // Quick fill for demo credentials
  const fillAdminCredentials = () => {
    setEmail('admin@tallystore.com')
    setPassword('admin123')
  }

  const fillUserCredentials = () => {
    setEmail('john@example.com')
    setPassword('password123')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your TallyStore account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Demo Credentials Info */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
            <h4 className="font-semibold text-sm mb-3">Demo Accounts:</h4>
            <div className="space-y-3 text-xs">
              <div>
                <strong>Admin Access:</strong><br/>
                Email: admin@tallystore.com<br/>
                Password: admin123
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-2 h-6 text-xs"
                  onClick={fillAdminCredentials}
                >
                  Use
                </Button>
              </div>
              <div>
                <strong>User Access:</strong><br/>
                Email: john@example.com<br/>
                Password: password123
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-2 h-6 text-xs"
                  onClick={fillUserCredentials}
                >
                  Use
                </Button>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
