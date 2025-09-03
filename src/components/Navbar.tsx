// This file now redirects to NavbarAuth for consistency across all pages
export { default } from './NavbarAuth'
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const controlNavbar = useCallback(() => {
    const currentScrollY = window.scrollY
    
    // Show navbar when scrolling up or at the top
    if (currentScrollY < lastScrollY || currentScrollY < 10) {
      setIsVisible(true)
    } else {
      // Hide navbar when scrolling down and past 80px
      if (currentScrollY > 80 && currentScrollY > lastScrollY) {
        setIsVisible(false)
      }
    }
    
    // Set background blur when scrolled
    setIsScrolled(currentScrollY > 10)
    setLastScrollY(currentScrollY)
  }, [lastScrollY])

  useEffect(() => {
    let ticking = false
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          controlNavbar()
          ticking = false
        })
        ticking = true
      }
    }
    
    // Set initial state
    controlNavbar()
    
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [controlNavbar])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 navbar-transition transform ${
      isVisible ? "translate-y-0" : "-translate-y-full"
    } ${
      isScrolled 
        ? "navbar-blurred" 
        : "navbar-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 group">
            <button 
              onClick={() => scrollToSection("home")}
              className="text-2xl font-display font-bold bg-gradient-primary bg-clip-text text-transparent hover:scale-105 transform transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg px-2 py-1"
            >
              TallyStore
            </button>
          </div>

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
            
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button variant="hero">Get Started</Button>
              </Link>
            </div>
            
            <ThemeToggle />
          </div>

          {/* Mobile menu button and theme toggle */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`hover:scale-110 transform transition-all duration-300 ${
                !isScrolled 
                  ? "text-white hover:bg-white/20 bg-white/10 backdrop-blur-sm" 
                  : "text-foreground hover:bg-primary/10"
              }`}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        }`}>
          <div className="mobile-menu-bg">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button 
                onClick={() => scrollToSection("home")}
                className="block w-full text-left px-3 py-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection("services")}
                className="block w-full text-left px-3 py-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                Our Services
              </button>
              <button 
                onClick={() => scrollToSection("how-it-works")}
                className="block w-full text-left px-3 py-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                How It Works
              </button>
              <div className="px-3 py-2">
                <Button variant="nav" size="sm" className="w-full">
                  Purchase Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar