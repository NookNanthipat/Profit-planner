import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TrustBadges from "@/components/TrustBadges";
import ProblemSection from "@/components/ProblemSection";
import FeaturesSection from "@/components/FeaturesSection";
import SuiteSection from "@/components/SuiteSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import PricingSection from "@/components/PricingSection";
import RoadmapSection from "@/components/RoadmapSection";
import FAQSection from "@/components/FAQSection";
import NewsletterSection from "@/components/NewsletterSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <TrustBadges />
      <ProblemSection />
      <FeaturesSection />
      <SuiteSection />
      <TestimonialsSection />
      <PricingSection />
      <RoadmapSection />
      <FAQSection />
      <NewsletterSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
