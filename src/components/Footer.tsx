const Footer = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <footer className="bg-gradient-card dark:bg-gradient-card-dark border-t border-border/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Logo and description */}
          <div className="space-y-6">
            <h3 className="text-3xl font-display font-bold bg-gradient-primary bg-clip-text text-transparent hover:scale-105 transform transition-all duration-300">
              Tally Store
            </h3>
            <p className="text-muted-foreground max-w-sm font-body leading-relaxed text-lg">
              Your trusted partner for authentic social media accounts and growth services.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xl font-display font-semibold text-foreground mb-6">Quick Links</h4>
            <ul className="space-y-4">
              <li>
                <button 
                  onClick={() => scrollToSection("home")}
                  className="text-muted-foreground hover:text-primary transition-all duration-300 font-medium hover:translate-x-1 transform inline-block"
                >
                  Home
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection("services")}
                  className="text-muted-foreground hover:text-primary transition-all duration-300 font-medium hover:translate-x-1 transform inline-block"
                >
                  About Us
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection("services")}
                  className="text-muted-foreground hover:text-primary transition-all duration-300 font-medium hover:translate-x-1 transform inline-block"
                >
                  Our Features
                </button>
              </li>
            </ul>
          </div>

          {/* Contact/Support */}
          <div>
            <h4 className="text-xl font-display font-semibold text-foreground mb-6">Support</h4>
            <ul className="space-y-4">
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-muted-foreground font-body">24/7 Customer Support</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-muted-foreground font-body">Secure Transactions</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-muted-foreground font-body">Instant Delivery</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border/50 mt-12 pt-8 text-center">
          <p className="text-muted-foreground font-body text-lg">
            Copyright © 2025 All rights reserved | Tally Store.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer