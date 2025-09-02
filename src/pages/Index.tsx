import Navbar from "@/components/Navbar"
import HeroSection from "@/components/HeroSection"
import ServicesSection from "@/components/ServicesSection"
import HowItWorksSection from "@/components/HowItWorksSection"
import TrustSection from "@/components/TrustSection"
import Footer from "@/components/Footer"

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <HowItWorksSection />
      <TrustSection />
      <Footer />
    </div>
  );
};

export default Index;
