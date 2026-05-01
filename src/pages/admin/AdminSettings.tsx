import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Moon, Sun, Monitor, Smartphone, Globe, Layout, Sparkles, CheckCircle2, Eye, EyeOff, Save, Loader2, AlertTriangle, GripVertical } from "lucide-react";
import { useAdminEdit } from "@/context/AdminEditContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useSiteContent } from "@/hooks/useSiteContent";
import { Reorder } from "framer-motion";

// Standard imports
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
import PortalPage from "@/pages/Portal";

const SECTION_MAP: any = {
  hero: { label: "Hero Banner", component: HeroSection },
  trust: { label: "Trust Badges", component: TrustBadges },
  portal: { label: "User Portal", component: PortalPage },
  problem: { label: "The Problem", component: ProblemSection },
  comparison: { label: "Comparison (Old vs New)", component: ComparisonSection },
  features: { label: "Core Features", component: FeaturesSection },
  suite: { label: "Product Suite", component: SuiteSection },
  testimonials: { label: "Testimonials", component: TestimonialsSection },
  pricing: { label: "Pricing Plans", component: PricingSection },
  roadmap: { label: "Roadmap", component: RoadmapSection },
  faq: { label: "FAQ", component: FAQSection },
  newsletter: { label: "Newsletter", component: NewsletterSection },
  cta: { label: "Call to Action", component: CTASection },
  footer: { label: "Footer", component: Footer },
};

const DEFAULT_ORDER = ["hero", "trust", "problem", "comparison", "features", "suite", "testimonials", "pricing", "roadmap", "faq", "newsletter", "cta", "footer"];

const AdminSettings = () => {
  const { theme, setTheme } = useTheme();
  const { i18n } = useTranslation();
  const { toast } = useToast();
  const { 
    isEditMode, setEditMode, 
    activeSection, setActiveSection,
    previewLanguage, setPreviewLanguage 
  } = useAdminEdit();

  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [isSyncingOrder, setIsSyncingOrder] = useState(false);
  const { isVisible, overrides, refresh } = useSiteContent(activeSection || "");
  const [localVisible, setLocalVisible] = useState(true);
  const [isSyncingVisible, setIsSyncingVisible] = useState(false);

  // Load section order from DB
  useEffect(() => {
    setEditMode(true);
    async function loadOrder() {
      const { data } = await supabase.from("pp_site_content").select("value_en").eq("section", "system").eq("key", "section_order").single();
      if (data?.value_en) {
        try {
          const parsed = JSON.parse(data.value_en);
          // Ensure new sections (like comparison) are included if missing from old saved order
          const merged = [...parsed];
          DEFAULT_ORDER.forEach(id => {
            if (!merged.includes(id)) merged.push(id);
          });
          setSectionOrder(merged);
        } catch (e) { setSectionOrder(DEFAULT_ORDER); }
      } else {
        setSectionOrder(DEFAULT_ORDER);
      }
    }
    loadOrder();
    if (!activeSection) setActiveSection("hero");
    return () => { setEditMode(false); };
  }, []);

  useEffect(() => {
    setLocalVisible(isVisible);
  }, [isVisible, activeSection]);

  const saveOrder = async (newOrder: string[]) => {
    setSectionOrder(newOrder);
    setIsSyncingOrder(true);
    try {
      const { error } = await supabase.from("pp_site_content").upsert({
        section: "system",
        key: "section_order",
        value_en: JSON.stringify(newOrder),
        value_th: JSON.stringify(newOrder),
        updated_at: new Date().toISOString()
      }, { onConflict: 'section,key' });
      if (error) throw error;
      toast({ title: "Layout order saved" });
    } catch (e: any) {
      toast({ title: "Order sync failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSyncingOrder(false);
    }
  };

  const toggleVisibility = async () => {
    if (!activeSection) return;
    const nextValue = !localVisible;
    setLocalVisible(nextValue);
    setIsSyncingVisible(true);
    try {
      const { error } = await supabase.from("pp_site_content").upsert({
        section: activeSection,
        key: "_visible",
        value_en: String(nextValue),
        value_th: String(nextValue),
        updated_at: new Date().toISOString()
      }, { onConflict: 'section,key' });

      if (error) throw error;
      refresh();
      toast({ title: `Section ${nextValue ? 'Visible' : 'Hidden'}` });
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSyncingVisible(false);
    }
  };

  const ActiveComponent = useMemo(() => {
    return SECTION_MAP[activeSection || "hero"]?.component || HeroSection;
  }, [activeSection]);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100">
      {/* Editor Toolbar */}
      <div className="h-14 border-b border-border/60 bg-background/80 backdrop-blur flex items-center justify-between px-6 shrink-0 z-50 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
               <Layout size={16} />
             </div>
             <div>
               <h2 className="text-xs font-black uppercase tracking-widest leading-none">Visual Builder</h2>
               <p className="text-[9px] text-muted-foreground italic font-medium">CMS Engine v3.0</p>
             </div>
          </div>
          
          <div className="h-6 w-px bg-border/60" />

          <div className="flex bg-muted/20 p-1 rounded-xl border border-border/40 scale-90">
             <Button variant={previewLanguage === "en" ? "secondary" : "ghost"} size="sm" className="h-7 rounded-lg px-3 font-black text-[9px] uppercase" onClick={() => i18n.changeLanguage("en")}>EN</Button>
             <Button variant={previewLanguage === "th" ? "secondary" : "ghost"} size="sm" className="h-7 rounded-lg px-3 font-black text-[9px] uppercase" onClick={() => i18n.changeLanguage("th")}>TH</Button>
          </div>

          <div className="flex bg-muted/20 p-1 rounded-xl border border-border/40 scale-90">
             <Button variant={viewport === "desktop" ? "secondary" : "ghost"} size="icon" className="h-7 w-7 rounded-lg" onClick={() => setViewport("desktop")}><Monitor size={14} /></Button>
             <Button variant={viewport === "mobile" ? "secondary" : "ghost"} size="icon" className="h-7 w-7 rounded-lg" onClick={() => setViewport("mobile")}><Smartphone size={14} /></Button>
          </div>

          <div className="h-6 w-px bg-border/60" />

          <Button 
            variant={localVisible ? "ghost" : "destructive"} 
            size="sm" 
            className="h-8 rounded-xl font-black text-[9px] uppercase gap-2"
            onClick={toggleVisibility}
            disabled={isSyncingVisible}
          >
            {localVisible ? <Eye size={14} /> : <EyeOff size={14} />}
            {localVisible ? "Active" : "Hidden"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="rounded-xl font-bold text-[10px] uppercase gap-2 hover:bg-primary/5 text-primary" onClick={() => window.open('/', '_blank')}>
            <Eye size={14} /> Preview
          </Button>
          <div className="h-6 w-px bg-border/60" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">{isSyncingOrder || isSyncingVisible ? 'Syncing...' : 'Real-time'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Reorderable Section Sidebar */}
        <aside className="w-64 border-r border-border/60 bg-card/40 backdrop-blur p-4 flex flex-col gap-2 shrink-0 overflow-y-auto no-scrollbar">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 pl-2">Layout & Structure</p>
          
          <Reorder.Group axis="y" values={sectionOrder} onReorder={saveOrder} className="space-y-1.5">
            {sectionOrder.map(id => (
              <Reorder.Item
                key={id}
                value={id}
                className={cn(
                  "relative group cursor-grab active:cursor-grabbing select-none",
                  activeSection === id && "z-10"
                )}
              >
                <div
                  onClick={() => setActiveSection(id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all border shrink-0 text-left",
                    activeSection === id
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                      : "bg-card/50 text-muted-foreground border-transparent hover:bg-card hover:border-border/60"
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <GripVertical size={12} className="opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                    {SECTION_MAP[id]?.label || id}
                  </span>
                  <CheckCircle2 size={12} className={cn("transition-opacity shrink-0 ml-2", activeSection === id ? "opacity-100" : "opacity-0")} />
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <div className="mt-6 space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 pl-2 opacity-60">Pages</p>
            {["portal"].map(id => (
              <div
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all border cursor-pointer select-none",
                  activeSection === id
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                    : "bg-card/50 text-muted-foreground border-transparent hover:bg-card hover:border-border/60"
                )}
              >
                <span className="truncate">{SECTION_MAP[id]?.label || id}</span>
                <CheckCircle2 size={12} className={cn("transition-opacity shrink-0 ml-2", activeSection === id ? "opacity-100" : "opacity-0")} />
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-4 pt-4 border-t border-border/40 pb-10">
             <div className="px-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3 opacity-60">Preferences</p>
                <div className="flex gap-2">
                   <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                      {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                   </Button>
                   <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'th' : 'en')}>
                      <Globe size={16} />
                   </Button>
                </div>
             </div>
          </div>
        </aside>

        {/* Live Canvas Area */}
        <main className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-100 dark:bg-slate-900/50">
           <div 
             className={cn(
               "bg-background shadow-2xl transition-all duration-500 rounded-[32px] overflow-hidden border border-border/40 origin-top relative",
               viewport === "desktop" ? "w-full max-w-6xl h-fit min-h-screen" : "w-[375px] h-[812px]",
               !localVisible && "opacity-50 grayscale contrast-75 ring-4 ring-rose-500/20"
             )}
           >
              {!localVisible && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] pointer-events-none">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-2xl flex flex-col items-center gap-3 border border-rose-500/30">
                    <EyeOff size={40} className="text-rose-500" />
                    <p className="text-sm font-black uppercase tracking-widest text-foreground">Section Hidden</p>
                    <p className="text-[10px] text-muted-foreground italic">Disabled on landing page.</p>
                  </div>
                </div>
              )}
              <div className="w-full h-full pointer-events-auto relative">
                <ActiveComponent />
              </div>
           </div>
        </main>
      </div>
    </div>
  );
};

export default AdminSettings;
