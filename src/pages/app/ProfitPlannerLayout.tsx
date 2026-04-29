import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft, LayoutDashboard, ListPlus, Loader2, Lock, Settings, RefreshCw, PieChart, BarChart2, Briefcase, Target, Menu } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { seedDefaultCategoriesIfEmpty } from "@/lib/profitPlanner";
import { cn } from "@/lib/utils";
import logo from "@/assets/profitplanner-logo.png";
import SettingsMenu from "@/components/SettingsMenu";
import { PaywallOverlay } from "@/components/profit-planner/PaywallOverlay";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const FREE_ROUTES = ["/app/profit-planner/dashboard", "/app/profit-planner/transactions", "/app/profit-planner/setup"];

const ProfitPlannerLayout = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NAV = [
    { to: "/app/profit-planner/dashboard",    label: t("app.nav.dashboard"),    icon: LayoutDashboard },
    { to: "/app/profit-planner/annual", label: t("app.nav.annual"), icon: BarChart2 },
    { to: "/app/profit-planner/transactions", label: t("app.nav.transactions"), icon: ListPlus },
    { to: "/app/profit-planner/portfolio",    label: t("app.nav.portfolio"), icon: Briefcase },
    { to: "/app/profit-planner/recurring",    label: t("app.nav.recurring"),    icon: RefreshCw },
    { to: "/app/profit-planner/budget",       label: t("app.nav.budget"),       icon: PieChart },
    { to: "/app/profit-planner/debt",         label: t("app.nav.debt"), icon: BarChart2 },
    { to: "/app/profit-planner/split",        label: t("app.nav.split"), icon: ListPlus },
    { to: "/app/profit-planner/simulator",    label: t("app.nav.simulator"), icon: Target },
    { to: "/app/profit-planner/setup",        label: t("app.nav.setup"),        icon: Settings },
  ];

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Basic entry check
      const { data } = await supabase.rpc("user_has_product_access", {
        _user_id: user.id,
        _product_slug: "profit-planner",
      });
      const access = !!data;
      setHasAccess(access);

      // Check for Pro specifically
      const { data: proRes } = await supabase.from("user_products")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "active");
      
      setIsPro(access && (proRes?.length || 0) > 0);

      if (access) await seedDefaultCategoriesIfEmpty(user.id);
      setChecking(false);
    })();
  }, [user]);

  if (location.pathname === "/app/profit-planner") {
    return <Navigate to="/app/profit-planner/dashboard" replace />;
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="max-w-md w-full p-8 text-center border-none shadow-2xl rounded-[40px]">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-6">
            <Lock size={28} />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2 text-foreground">Access Restricted</h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed font-medium">
            You don't own ProfitPlanner yet. Unlock full access by purchasing or starting a free trial.
          </p>
          <div className="flex flex-col gap-3">
            <Button className="h-12 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20" asChild><Link to="/checkout/profit-planner">Unlock Now</Link></Button>
            <Button variant="ghost" className="rounded-xl font-bold uppercase text-xs" asChild><Link to="/portal">Back to portal</Link></Button>
          </div>
        </Card>
      </div>
    );
  }

  const mainNav = NAV.slice(0, 4);

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* App Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/app/profit-planner/dashboard" className="flex items-center gap-3 min-w-0 group">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform border border-primary/10">
              <img src={logo} alt="ProfitPlanner" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold leading-tight truncate text-base">Profit<span className="text-primary">Planner</span></p>
              <p className="text-[9px] text-muted-foreground font-black leading-tight hidden sm:block uppercase tracking-widest opacity-60">Wealth OS</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-3">
            <SettingsMenu />
            <div className="h-6 w-px bg-border/60 mx-1 hidden sm:block" />
            <Button variant="ghost" size="sm" asChild className="rounded-xl hidden sm:flex">
              <Link to="/portal" className="gap-1.5 font-bold uppercase text-[10px] tracking-widest">
                <ArrowLeft size={14} /> {t("app.nav.portal")}
              </Link>
            </Button>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden rounded-xl">
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 border-none w-72 bg-card/95 backdrop-blur-xl shadow-2xl">
                <SheetHeader className="p-6 border-b border-border/40 text-left">
                  <SheetTitle className="font-black uppercase tracking-tighter text-xl">Profit<span className="text-primary">Planner</span></SheetTitle>
                </SheetHeader>
                <div className="p-4 flex flex-col gap-1">
                  {NAV.map((item) => {
                    const isLocked = !isPro && !FREE_ROUTES.includes(item.to);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                            isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted/50"
                          )
                        }
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={18} />
                          <span>{item.label}</span>
                        </div>
                        {isLocked && <Lock size={12} className="opacity-40" />}
                      </NavLink>
                    );
                  })}
                  <div className="mt-4 pt-4 border-t border-border/40">
                    <Link to="/portal" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-muted-foreground hover:bg-muted/50">
                      <ArrowLeft size={18} /> {t("app.nav.exit")}
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-hidden relative">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:block w-56 shrink-0 border-r border-border/60 py-8 px-4 overflow-y-auto no-scrollbar">
          <nav className="flex flex-col gap-1.5">
            {NAV.map((item) => {
              const isLocked = !isPro && !FREE_ROUTES.includes(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between px-3.5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-tight transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )
                  }
                >
                  <div className="flex items-center gap-3 truncate">
                    <item.icon size={16} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isLocked && <Lock size={12} className="opacity-40" />}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 px-4 lg:px-8 py-8 pb-32 lg:pb-10 overflow-y-auto no-scrollbar relative">
          {!isPro && !FREE_ROUTES.includes(location.pathname) && (
            <PaywallOverlay title={NAV.find(n => n.to === location.pathname)?.label || "Premium Feature"} />
          )}
          <div className={cn("h-full", !isPro && !FREE_ROUTES.includes(location.pathname) && "pointer-events-none opacity-40 blur-[1px]")}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom tab - mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl pb-safe shadow-2xl">
        <div className="grid grid-cols-5 h-16">
          {mainNav.map((item) => {
            const isLocked = !isPro && !FREE_ROUTES.includes(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest relative",
                    isActive ? "text-primary" : "text-muted-foreground opacity-50"
                  )
                }
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {isLocked && <Lock size={8} className="absolute top-2 right-4 opacity-60" />}
              </NavLink>
            );
          })}
          <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
             <Menu size={18} />
             <span>More</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default ProfitPlannerLayout;
