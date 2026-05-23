import { useState } from "react";
import { Lock, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export const PaywallOverlay = ({ title }: { title: string }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("grant_trial_access", {
        _product_slug: "profit-planner",
      });
      if (error) throw error;
      if (data?.error === "already_exists") {
        toast({ title: "Trial already used", description: "Please upgrade to Pro to continue.", variant: "destructive" });
        return;
      }
      toast({ title: "7-Day Trial Started! 🎉", description: "Enjoy full access for 7 days." });
      window.location.reload(); // re-check isPro
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-background/20 backdrop-blur-[6px] rounded-[32px] md:rounded-[48px] border-4 border-dashed border-primary/20 m-1">
      <div className="max-w-sm w-full bg-background/90 backdrop-blur-xl p-8 rounded-[40px] shadow-2xl border border-primary/10 text-center animate-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Lock size={32} />
        </div>
        <h3 className="text-2xl font-black uppercase tracking-tight mb-2 text-foreground">{title}</h3>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed font-medium">
          This is a <span className="text-primary font-bold">Premium Feature</span>. Start a free 7-day trial or upgrade to unlock full wealth management capabilities.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            className="h-12 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 group"
            onClick={handleStartTrial}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Sparkles size={16} className="mr-2 group-hover:rotate-12 transition-transform" />
            )}
            Start Free Trial — 7 Days
          </Button>
          <Button variant="outline" className="h-10 rounded-2xl font-bold uppercase text-xs" asChild>
            <Link to="/checkout/profit-planner">Upgrade to Pro</Link>
          </Button>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">No credit card required for trial</p>
        </div>
      </div>
    </div>
  );
};
