import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TrustBadges from "@/components/TrustBadges";
import ProblemSection from "@/components/ProblemSection";
import ComparisonSection from "@/components/ComparisonSection";
import FeaturesSection from "@/components/FeaturesSection";
import SuiteSection from "@/components/SuiteSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import PricingSection from "@/components/PricingSection";
import RoadmapSection from "@/components/RoadmapSection";
import FAQSection from "@/components/FAQSection";
import NewsletterSection from "@/components/NewsletterSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { useSiteContent } from "@/hooks/useSiteContent";
import { supabase } from "@/lib/supabase";

const COMPONENT_MAP: Record<string, React.ComponentType> = {
  hero: HeroSection,
  trust: TrustBadges,
  problem: ProblemSection,
  comparison: ComparisonSection,
  features: FeaturesSection,
  suite: SuiteSection,
  testimonials: TestimonialsSection,
  pricing: PricingSection,
  roadmap: RoadmapSection,
  faq: FAQSection,
  newsletter: NewsletterSection,
  cta: CTASection,
  footer: Footer,
};

const DEFAULT_ORDER = [
  "hero", "trust", "problem", "comparison", "features", 
  "suite", "testimonials", "pricing", "roadmap", "faq", 
  "newsletter", "cta", "footer"
];

const SectionRenderer = ({ id }: { id: string }) => {
  const { isVisible } = useSiteContent(id);
  const Component = COMPONENT_MAP[id];
  
  if (!Component) return null;
  if (!isVisible) return null;
  
  return <Component />;
};

const Index = () => {
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);

  useEffect(() => {
    async function loadOrder() {
      try {
        const { data, error } = await supabase
          .from("pp_site_content")
          .select("value_en")
          .eq("section", "system")
          .eq("key", "section_order")
          .maybeSingle();

        if (error) throw error;

        if (data?.value_en) {
          const parsed = JSON.parse(data.value_en);
          if (Array.isArray(parsed)) {
            // Ensure any new sections added to the code are appended to the saved order
            const merged = [...parsed];
            DEFAULT_ORDER.forEach(id => {
              if (!merged.includes(id)) {
                merged.push(id);
              }
            });
            setOrder(merged);
          }
        }
      } catch (e) {
        console.warn("Using default section order:", e);
        setOrder(DEFAULT_ORDER);
      }
    }
    loadOrder();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {order.map((sectionId) => (
        <SectionRenderer key={sectionId} id={sectionId} />
      ))}
    </div>
  );
};

export default Index;
