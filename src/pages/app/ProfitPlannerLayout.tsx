import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft, LayoutDashboard, ListPlus, Loader2, Lock, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { seedDefaultCategoriesIfEmpty } from "@/lib/profitPlanner";
import { cn } from "@/lib/utils";
import logo from "@/assets/profitplanner-logo.png";

const NAV = [
  { to: "/app/profit-planner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/profit-planner/transactions", label: "Transactions", icon: ListPlus },
  { to: "/app/profit-planner/setup", label: "Setup", icon: Settings },
];

const ProfitPlannerLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc("user_has_product_access", {
        _user_id: user.id,
        _product_slug: "profit-planner",
      });
      const access = !!data;
      setHasAccess(access);
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
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock size={20} />
          </div>
          <h1 className="text-xl font-semibold mb-2">Access required</h1>
          <p className="text-muted-foreground text-sm mb-6">
            You don't own ProfitPlanner yet. Purchase or start a 7-day trial to continue.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" asChild><Link to="/portal">Back to portal</Link></Button>
            <Button asChild><Link to="/checkout/profit-planner">View pricing</Link></Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/app/profit-planner/dashboard" className="flex items-center gap-3 min-w-0">
            <img src={logo} alt="ProfitPlanner logo" className="w-9 h-9 rounded-lg object-contain shrink-0" />
            <div className="min-w-0">
              <p className="font-display font-bold leading-tight truncate">ProfitPlanner</p>
              <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block">Ultimate Personal Finance App</p>
            </div>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/portal" className="gap-1.5">
              <ArrowLeft size={14} /> <span className="hidden sm:inline">Portal</span>
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:block w-56 shrink-0 border-r border-border/60 py-6 px-3">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 px-4 lg:px-8 py-6 pb-24 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Bottom tab - mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="grid grid-cols-3 h-16">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default ProfitPlannerLayout;
