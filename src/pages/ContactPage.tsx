import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useState } from 'react'
import { BackToHome } from '@/components/ui/back-button'

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock form submission
    alert('Thank you for your message! We\'ll get back to you within 24 hours.')
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: '',
      type: 'general'
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Contact Us
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            We're here to help! Get in touch with our team
          </p>
          <Badge variant="outline" className="mt-2">
            24/7 Support Available
          </Badge>
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <BackToHome />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Contact Type */}
                <div>
                  <Label htmlFor="type">Type of Inquiry</Label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">General Question</option>
                    <option value="support">Technical Support</option>
                    <option value="billing">Billing & Payments</option>
                    <option value="account">Account Issues</option>
                    <option value="business">Business Inquiries</option>
                    <option value="partnership">Partnership</option>
                  </select>
                </div>

                {/* Name */}
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                {/* Subject */}
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Brief description of your inquiry"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Please provide details about your inquiry..."
                    className="min-h-[120px]"
                    required
                  />
                </div>

                <Button type="submit" className="w-full">
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            {/* Quick Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Contact</CardTitle>
                <CardDescription>Get in touch through multiple channels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full w-10 h-10 flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400">📧</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Email Support</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">tallystoreorg@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="bg-gray-100 dark:bg-gray-700/30 rounded-full w-10 h-10 flex items-center justify-center">
                    <span className="text-gray-600 dark:text-gray-400">💬</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Telegram Support</p>
                    <Button 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => window.open('https://t.me/Tallystoreorg', '_blank')}
                    >
                      Join Telegram Group
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 dark:bg-green-900/30 rounded-full w-10 h-10 flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400">📱</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">WhatsApp Support</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">+234 902 459 5121 (WhatsApp only)</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="bg-orange-100 dark:bg-orange-900/30 rounded-full w-10 h-10 flex items-center justify-center">
                    <span className="text-orange-600 dark:text-orange-400">🎫</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Support Tickets</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <Link to="/support" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        Visit Support Center
                      </Link>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
              <CardHeader>
                <CardTitle>Business Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Monday - Friday</span>
                    <span className="font-medium text-gray-900 dark:text-white">9:00 AM - 6:00 PM EST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Saturday</span>
                    <span className="font-medium text-gray-900 dark:text-white">10:00 AM - 4:00 PM EST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sunday</span>
                    <span className="font-medium text-gray-900 dark:text-white">12:00 PM - 4:00 PM EST</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>Emergency Support:</strong> Available 24/7 for critical issues
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Response Times */}
            <Card>
              <CardHeader>
                <CardTitle>Response Times</CardTitle>
                <CardDescription>Expected response times by inquiry type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">General Questions</span>
                    <Badge variant="outline">24 hours</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Technical Support</span>
                    <Badge variant="outline">4-6 hours</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Billing Issues</span>
                    <Badge variant="outline">2-4 hours</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Account Problems</span>
                    <Badge variant="outline">1-2 hours</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Emergency Issues</span>
                    <Badge className="bg-red-500 text-white">15 minutes</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Office Location */}
            <Card>
              <CardHeader>
                <CardTitle>Office Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900 dark:text-white">TallyStore Headquarters</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    123 Digital Street<br />
                    Tech City, TC 12345<br />
                    United States
                  </p>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> We operate remotely with team members worldwide to provide 24/7 support
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>Quick answers to common questions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">How quickly do you respond to support tickets?</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    We aim to respond within 4-6 hours for technical issues and within 24 hours for general inquiries.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Can I track my support ticket status?</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Yes! Visit our Support Center to track all your tickets and view response history.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Do you offer phone support?</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    We offer WhatsApp support at +234 902 459 5121 (WhatsApp only). For email support, use tallystoreorg@gmail.com.
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">What information should I include in my message?</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Include your account email, order number (if applicable), and detailed description of the issue.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Can I request a callback?</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Traditional phone calls are not available. Please contact us via WhatsApp at +234 902 459 5121 or email at tallystoreorg@gmail.com.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Do you have Telegram support?</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Yes! Join our Telegram support group for quick updates and assistance at https://t.me/Tallystoreorg
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <Link to="/support">
                <Button variant="outline">
                  Visit Full FAQ Section
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Footer Navigation */}
        <div className="text-center space-y-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/support" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              Support Center
            </Link>
            <Link to="/terms" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              Terms of Service
            </Link>
            <Link to="/privacy" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              Privacy Policy
            </Link>
            <Link to="/about" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              About Us
            </Link>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            © 2024 TallyStore. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ContactPage
