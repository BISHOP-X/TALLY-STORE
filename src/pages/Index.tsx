import NavbarAuth from "@/components/NavbarAuth"
import HeroSection from "@/components/HeroSection"
import ServicesSection from "@/components/ServicesSection"
import HowItWorksSection from "@/components/HowItWorksSection"
import TrustSection from "@/components/TrustSection"
import Footer from "@/components/Footer"
import StatsBar from "@/components/StatsBar"
import TopCategoriesGrid from "@/components/TopCategoriesGrid"

const Index = () => {
  return (
    <div className="min-h-screen">
      <NavbarAuth />

      <HeroSection />

      <div className="container mx-auto px-6 -mt-8 mb-12 relative z-10">
        <StatsBar />
      </div>

      <div className="container mx-auto px-6 mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-center">Popular Categories</h2>
        <TopCategoriesGrid />
      </div>

      <ServicesSection />
      <HowItWorksSection />
      <TrustSection />
      <Footer />
    </div>
  );
};

export default Index;
