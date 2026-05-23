import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "./admin/EditableText";
import { EditableImage } from "./admin/EditableImage";
import { EditableButton } from "./admin/EditableButton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { DemoModal } from "./portal/DemoModal";

const HeroSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { ds, overrides } = useSiteContent("hero");
  const heroImg = overrides["hero_image"] || "";
  const [demoOpen, setDemoOpen] = useState(false);

  const chartData = [35, 42, 58, 45, 65, 52, 78, 62, 85, 72, 90, 95];
  const rows = [
    { label: ds("income", "hero.income"), value: "$4,850", change: "+12%", positive: true },
    { label: ds("expenses", "hero.expenses"), value: "$2,340", change: "-5%", positive: true },
    { label: ds("savings", "hero.savings"), value: "$1,510", change: "+24%", positive: true },
    { label: ds("investments", "hero.investments"), value: "$820", change: "+8%", positive: true },
  ];

  const handleStartFree = async (e: React.MouseEvent) => {
    // If not admin editing, handle free entitlement
    if (overrides["_editMode"]) return; 
    
    if (!user) {
      window.location.href = "/login";
      return;
    }

    try {
      // Find the main product (ProfitPlanner)
      const { data: product } = await supabase.from("products").select("id").eq("slug", "profit-planner").single();
      if (!product) throw new Error("Product not found");

      // Use RPC for the most accurate entitlement check (matches the dashboard logic)
      const { data: hasAccess } = await supabase.rpc("user_has_product_access", {
        _user_id: user.id,
        _product_slug: "profit-planner",
      });

      if (hasAccess) {
        toast({ title: t("nav.welcome"), description: "You already have active access. Redirecting..." });
        window.location.href = "/app/profit-planner/dashboard";
        return;
      }

      // Check if they have an EXPIRED trial (already exists in DB but expired)
      const { data: existing } = await supabase.from("user_products")
        .select("status, expired_at")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (existing) {
        toast({ title: "Upgrade Required", description: "Your trial has expired. Please upgrade to Pro." });
        window.location.href = "/portal";
        return;
      }

      // ONLY grant trial access if user has NO record for this product
      // Uses server-side RPC (SECURITY DEFINER) — client cannot manipulate status
      const { data: rpcResult, error } = await supabase.rpc("grant_trial_access", {
        _product_slug: "profit-planner",
      });

      if (error) throw error;
      if (rpcResult?.error) {
        if (rpcResult.error === "already_exists") {
          toast({ title: "Upgrade Required", description: "Your trial has expired. Please upgrade to Pro." });
          window.location.href = "/portal";
          return;
        }
        throw new Error(rpcResult.error);
      }

      toast({ title: "Free Access Granted", description: "You can now use the dashboard and transactions!" });
      window.location.href = "/portal";
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center section-padding pt-32 overflow-hidden">
      <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-20 left-10 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />

      <div className="max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 glass-card px-4 py-1.5 text-sm font-medium text-muted-foreground mb-6">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <EditableText section="hero" fieldKey="badge" defaultValue={ds("badge", "hero.badge")} />
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] text-foreground mb-6">
              <EditableText section="hero" fieldKey="title1" defaultValue={ds("title1", "hero.title1")} />{" "}
              <span className="text-gradient-emerald">
                <EditableText section="hero" fieldKey="title2" defaultValue={ds("title2", "hero.title2")} />
              </span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              <EditableText section="hero" fieldKey="description" defaultValue={ds("description", "hero.description")} multiline />
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <button 
                onClick={handleStartFree}
                className="btn-primary inline-flex items-center gap-2 relative group"
              >
                <span className="relative z-10">
                   <EditableText section="hero" fieldKey="startFree" defaultValue={ds("startFree", "hero.startFree")} />
                </span>
                <ArrowRight size={18} className="relative z-10" />
              </button>
              
              <button 
                onClick={(e) => { e.preventDefault(); setDemoOpen(true); }}
                className="btn-outline inline-flex items-center gap-2"
              >
                <Play size={16} /> 
                <EditableText section="hero" fieldKey="watchDemo" defaultValue={ds("watchDemo", "hero.watchDemo")} />
              </button>
            </div>

          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative hidden lg:block"
          >
            <div className="relative animate-float">
              <EditableImage 
                section="hero" 
                fieldKey="hero_image" 
                defaultSrc={heroImg} 
                className="w-full h-auto"
                aspectRatio="aspect-[4/3]"
              >
                <div className="glass-card p-6 rounded-[32px] border-primary/20 shadow-2xl overflow-visible relative">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-destructive/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                      <div className="w-3 h-3 rounded-full bg-primary/60" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">ProfitPlanner Dashboard</span>
                  </div>
                  <div className="h-24 bg-secondary/50 rounded-xl flex items-end gap-1 p-3 mb-5">
                    {chartData.map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.6, delay: 0.4 + i * 0.05 }}
                        className="flex-1 bg-primary/80 rounded-sm"
                      />
                    ))}
                  </div>
                  <div className="space-y-3">
                    {rows.map((row) => (
                      <div key={row.label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                        <span className="text-sm text-muted-foreground">{row.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-foreground">{row.value}</span>
                          <span className="text-xs font-medium text-primary">{row.change}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="absolute -bottom-4 -left-4 glass-card px-4 py-3 border-primary/30 z-10"
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                       <EditableText section="hero" fieldKey="netWorth" defaultValue={ds("netWorth", "hero.netWorth")} />
                    </p>
                    <p className="text-lg font-bold text-primary">+23.5%</p>
                  </motion.div>
                </div>
              </EditableImage>
            </div>
          </motion.div>
        </div>
      </div>
      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
};

export default HeroSection;
