import React from "react";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const PaywallOverlay = ({ title }: { title: string }) => {
  const { t } = useTranslation();
  
  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-background/20 backdrop-blur-[6px] rounded-[32px] md:rounded-[48px] border-4 border-dashed border-primary/20 m-1">
      <div className="max-w-sm w-full bg-background/90 backdrop-blur-xl p-8 rounded-[40px] shadow-2xl border border-primary/10 text-center animate-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Lock size={32} />
        </div>
        <h3 className="text-2xl font-black uppercase tracking-tight mb-2 text-foreground">{title}</h3>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed font-medium">
          This is a <span className="text-primary font-bold">Premium Feature</span>. Upgrade your account to unlock full wealth management capabilities.
        </p>
        <div className="flex flex-col gap-3">
          <Button className="h-12 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 group" asChild>
            <Link to="/checkout/profit-planner">
              <Sparkles size={16} className="mr-2 group-hover:rotate-12 transition-transform" />
              Upgrade to Pro
            </Link>
          </Button>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Starting from $4.99/mo</p>
        </div>
      </div>
    </div>
  );
};
