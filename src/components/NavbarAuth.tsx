import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Menu, X, User, LogOut, Wallet } from "lucide-react"
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/SimpleAuth'

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, signOut, isAdmin, walletBalance } = useAuth()
  const navigate = useNavigate()

  // Mock data for display - now using actual user data from context
  const mockProfile = {
    username: user?.email?.split('@')[0] || 'User',
    wallet_balance: walletBalance, // Now using real wallet balance
  }

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 50)
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
      setIsMobileMenuOpen(false)
    }
  }

  const handleSignOut = async () => {
    signOut()
    setIsMobileMenuOpen(false)
  }

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-lg border-b border-gray-200/50 dark:border-gray-700/50" 
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="group">
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent group-hover:from-primary/80 group-hover:to-primary transition-all">
              TallyStore
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/products" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors">
              Products
            </Link>
            <Link to="/web-services" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors">
              Services
            </Link>
            <Link to="/support" className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors">
              Support
            </Link>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
            >
              How It Works
            </button>
            
            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center space-x-4">
                {/* User Dropdown Menu */}
                <div className="relative group">
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {mockProfile.username}
                    <svg className="h-4 w-4 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <Link to={isAdmin ? '/admin' : '/dashboard'} className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                        {isAdmin ? 'Admin Panel' : 'Dashboard'}
                      </Link>
                      <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                        Profile Settings
                      </Link>
                      <Link to="/orders" className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                        Order History
                      </Link>
                      {!isAdmin && (
                        <Link to="/wallet" className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                          Wallet
                        </Link>
                      )}
                      <div className="border-t border-gray-200 dark:border-gray-600 my-2"></div>
                      <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600">
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
                
                {!isAdmin && (
                  <Link to="/wallet" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                    <Wallet className="h-4 w-4" />
                    ₦{mockProfile.wallet_balance?.toLocaleString() || '0.00'}
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button variant="hero">Get Started</Button>
                </Link>
              </div>
            )}
            
            <ThemeToggle />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 ${
                isScrolled 
                  ? "text-gray-700 dark:text-gray-300" 
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 mobile-menu-bg backdrop-blur-md rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-4">
            <div className="flex flex-col space-y-4">
              <Link 
                to="/" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-left text-gray-700 dark:text-gray-300 hover:text-primary transition-colors py-2"
              >
                Home
              </Link>
              <Link 
                to="/products" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-left text-gray-700 dark:text-gray-300 hover:text-primary transition-colors py-2"
              >
                Products
              </Link>
              <Link 
                to="/web-services" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-left text-gray-700 dark:text-gray-300 hover:text-primary transition-colors py-2"
              >
                Services
              </Link>
              <Link 
                to="/support" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-left text-gray-700 dark:text-gray-300 hover:text-primary transition-colors py-2"
              >
                Support
              </Link>
              <button 
                onClick={() => scrollToSection('how-it-works')}
                className="text-left text-gray-700 dark:text-gray-300 hover:text-primary transition-colors py-2"
              >
                How It Works
              </button>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                {user ? (
                  <div className="space-y-4">
                    <Link to={isAdmin ? '/admin' : '/dashboard'} onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2">
                        <User className="h-4 w-4" />
                        {isAdmin ? 'Admin Panel' : 'Dashboard'}
                      </Button>
                    </Link>
                    
                    {!isAdmin && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 px-4">
                        <Wallet className="h-4 w-4" />
                        Balance: ₦{mockProfile.wallet_balance?.toLocaleString() || '0.00'}
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      onClick={handleSignOut}
                      className="w-full justify-start gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="hero" className="w-full">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
