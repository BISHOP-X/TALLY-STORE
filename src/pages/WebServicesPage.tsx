import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Globe, 
  Smartphone, 
  ShoppingCart, 
  Palette, 
  Code, 
  Zap, 
  Check, 
  Star, 
  MessageCircle,
  Phone,
  Mail,
  Clock,
  Award
} from 'lucide-react'
import NavbarAuth from '@/components/NavbarAuth'
import Footer from '@/components/Footer'
import WalletBalanceWidget from '@/components/WalletBalanceWidget'

// Web service packages
const webServices = [
  {
    id: 'basic',
    name: 'Basic Website',
    price: 50000,
    duration: '3-5 days',
    features: [
      'Up to 5 pages',
      'Mobile responsive design',
      'Contact form',
      'Basic SEO setup',
      'Free hosting for 1 year',
      '1 revision included'
    ],
    ideal: 'Small businesses, personal portfolios'
  },
  {
    id: 'business',
    name: 'Business Website',
    price: 150000,
    duration: '7-10 days',
    popular: true,
    features: [
      'Up to 10 pages',
      'Custom design',
      'Mobile responsive',
      'Advanced SEO',
      'Contact forms & maps',
      'Social media integration',
      'Free hosting for 1 year',
      '3 revisions included',
      'Content management system'
    ],
    ideal: 'Growing businesses, service providers'
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Store',
    price: 300000,
    duration: '14-21 days',
    features: [
      'Unlimited pages',
      'Online store functionality',
      'Payment gateway integration',
      'Inventory management',
      'Customer accounts',
      'Order management',
      'Mobile responsive',
      'Advanced SEO',
      'Free hosting for 1 year',
      '5 revisions included',
      'Admin dashboard'
    ],
    ideal: 'Online retailers, product sellers'
  },
  {
    id: 'custom',
    name: 'Custom Development',
    price: 500000,
    duration: '21+ days',
    features: [
      'Fully custom solution',
      'Advanced functionality',
      'Database integration',
      'API development',
      'Third-party integrations',
      'User authentication',
      'Admin panels',
      'Mobile app (optional)',
      'Unlimited revisions',
      'Ongoing support'
    ],
    ideal: 'Large businesses, complex projects'
  }
]

// Technologies we work with
const technologies = [
  { name: 'React', icon: Code },
  { name: 'WordPress', icon: Globe },
  { name: 'Shopify', icon: ShoppingCart },
  { name: 'Mobile Apps', icon: Smartphone },
  { name: 'Custom Design', icon: Palette },
  { name: 'Fast Delivery', icon: Zap }
]

export default function WebServicesPage() {
  const [selectedService, setSelectedService] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    projectType: '',
    budget: '',
    timeline: '',
    description: '',
    features: ''
  })
  const [showForm, setShowForm] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId)
    setShowForm(true)
    setFormData(prev => ({ ...prev, projectType: serviceId }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In real app, this would send to backend
    console.log('Form submitted:', formData)
    setSubmitSuccess(true)
    setShowForm(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-background">
      <NavbarAuth />
      
      {/* Wallet Balance Widget */}
      <div className="container mx-auto px-6 pt-24 pb-4 max-w-6xl">
        <WalletBalanceWidget showRefresh={true} />
      </div>
      
      <div className="container mx-auto px-6 pb-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Professional Web Development Services</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From simple websites to complex e-commerce platforms, we build digital solutions that grow your business
          </p>
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <Alert className="mb-8 border-green-200 bg-green-50 text-green-800">
            <Check className="h-4 w-4" />
            <AlertDescription>
              Your project request has been submitted! We'll contact you within 24 hours to discuss your requirements.
            </AlertDescription>
          </Alert>
        )}

        {/* Technologies */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-center mb-8">Technologies We Master</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {technologies.map((tech) => {
              const Icon = tech.icon
              return (
                <Card key={tech.name} className="text-center p-4">
                  <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">{tech.name}</p>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Service Packages */}
        <div className="mb-16">
          <h2 className="text-3xl font-semibold text-center mb-8">Choose Your Package</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {webServices.map((service) => (
              <Card 
                key={service.id} 
                className={`relative hover:shadow-lg transition-shadow ${
                  service.popular ? 'border-primary shadow-md' : ''
                }`}
              >
                {service.popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{service.name}</CardTitle>
                  <div className="text-3xl font-bold text-primary">
                    ₦{service.price.toLocaleString()}
                  </div>
                  <CardDescription className="flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" />
                    {service.duration}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {service.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">
                      <strong>Ideal for:</strong> {service.ideal}
                    </p>
                    <Button 
                      className="w-full"
                      onClick={() => handleServiceSelect(service.id)}
                    >
                      Get Started
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        {showForm && (
          <Card className="mb-16">
            <CardHeader>
              <CardTitle>Tell Us About Your Project</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you within 24 hours with a detailed proposal
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company">Company/Organization</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget Range</Label>
                    <Select value={formData.budget} onValueChange={(value) => handleInputChange('budget', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-100k">Under ₦100,000</SelectItem>
                        <SelectItem value="100k-300k">₦100,000 - ₦300,000</SelectItem>
                        <SelectItem value="300k-500k">₦300,000 - ₦500,000</SelectItem>
                        <SelectItem value="500k-1m">₦500,000 - ₦1,000,000</SelectItem>
                        <SelectItem value="above-1m">Above ₦1,000,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timeline">Preferred Timeline</Label>
                    <Select value={formData.timeline} onValueChange={(value) => handleInputChange('timeline', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="When do you need this?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asap">ASAP (Rush job)</SelectItem>
                        <SelectItem value="1-2weeks">1-2 weeks</SelectItem>
                        <SelectItem value="3-4weeks">3-4 weeks</SelectItem>
                        <SelectItem value="1-2months">1-2 months</SelectItem>
                        <SelectItem value="flexible">I'm flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Project Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Tell us about your project goals, target audience, and any specific requirements..."
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="features">Special Features or Requirements</Label>
                  <Textarea
                    id="features"
                    value={formData.features}
                    onChange={(e) => handleInputChange('features', e.target.value)}
                    placeholder="Any specific features, integrations, or functionalities you need..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    Submit Project Request
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Why Choose Us */}
        <div className="mb-16">
          <h2 className="text-3xl font-semibold text-center mb-8">Why Choose TallyStore Development?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-6">
              <Award className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Proven Expertise</h3>
              <p className="text-muted-foreground">
                Years of experience building successful digital platforms and e-commerce solutions
              </p>
            </Card>
            
            <Card className="text-center p-6">
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Fast Delivery</h3>
              <p className="text-muted-foreground">
                Quick turnaround times without compromising on quality or functionality
              </p>
            </Card>
            
            <Card className="text-center p-6">
              <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">24/7 Support</h3>
              <p className="text-muted-foreground">
                Ongoing support and maintenance to keep your website running smoothly
              </p>
            </Card>
          </div>
        </div>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Ready to Start Your Project?</CardTitle>
            <CardDescription>
              Contact our development team directly for custom quotes or urgent projects
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-600">WhatsApp Only</p>
                  <p className="text-sm text-muted-foreground">+234 902 459 5121</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">wisdomthedev@gmail.com</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-500">Telegram</p>
                  <p className="text-sm text-muted-foreground">Coming Soon - Use email for now</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  )
}
