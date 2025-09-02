import { Card, CardContent } from "@/components/ui/card"
import { Facebook, Instagram, Camera, Music, Star, TrendingUp } from "lucide-react"
import { ScrollAnimationWrapper } from "@/components/ScrollAnimationWrapper"

const ServicesSection = () => {
  const services = [
    {
      name: "Facebook Accounts",
      icon: Facebook,
      description: "Verified Facebook accounts ready for instant use",
      image: "/fACEBOOK ACCOUNT.webp"
    },
    {
      name: "Instagram Accounts", 
      icon: Instagram,
      description: "Authentic Instagram profiles with established history",
      image: "/INSTAGRAM ACCOUNT.webp"
    },
    {
      name: "Snapchat Accounts",
      icon: Camera,
      description: "Active Snapchat accounts with clean reputation",
      image: "/snapchat account.webp"
    },
    {
      name: "TikTok Accounts",
      icon: Music,
      description: "TikTok profiles optimized for content creation",
      image: "/purchase social media account.webp"
    },
    {
      name: "Aged Facebook Accounts",
      icon: Star,
      description: "Premium aged Facebook accounts with established history and credibility",
      image: "/AGED FACEBOOK ACCT.webp"
    },
    {
      name: "Followers Boosting",
      icon: TrendingUp,
      description: "Organic follower growth services across platforms",
      image: "/boost followers .webp"
    }
  ]

  return (
    <section id="services" className="py-24 bg-gradient-section dark:bg-gradient-section-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollAnimationWrapper>
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-6">
              What We Offer
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-body leading-relaxed">
              Premium social media accounts and growth services tailored to your needs
            </p>
          </div>
        </ScrollAnimationWrapper>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon
            return (
              <ScrollAnimationWrapper 
                key={service.name}
                delay={index * 100}
                animation="scale-in"
              >
                <Card className="group hover:shadow-elegant border-border/50 hover:border-primary/40 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:-translate-y-2 bg-gradient-card dark:bg-gradient-card-dark backdrop-blur-sm h-full overflow-hidden">
                  {/* Service Image */}
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={service.image} 
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent"></div>
                    <div className="absolute top-4 right-4">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:shadow-glow group-hover:scale-110 transition-all duration-500">
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="p-5 text-center relative">
                    {/* Background glow effect */}
                    <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-lg"></div>
                    
                    <div className="relative z-10">
                      <h3 className="text-lg font-display font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                        {service.name}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed font-body">
                        {service.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </ScrollAnimationWrapper>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default ServicesSection