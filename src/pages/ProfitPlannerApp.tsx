import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const ProfitPlannerApp = () => {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc("user_has_product_access", {
        _user_id: user.id,
        _product_slug: "profit-planner",
      });
      setHasAccess(!!data);
      setChecking(false);
    })();
  }, [user]);

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
            You don't own ProfitPlanner App yet. Purchase it or start a 7-day trial to continue.
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/portal" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Portal
          </Link>
          <span className="font-display font-bold">ProfitPlanner App</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-display font-bold mb-2">Welcome to ProfitPlanner</h1>
        <p className="text-muted-foreground mb-8">This is the placeholder shell. Replace this page with your real app UI.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Income", value: "$12,450", trend: "+8.2%" },
            { label: "Expenses", value: "$4,820", trend: "-3.1%" },
            { label: "Net Worth", value: "$84,210", trend: "+12.5%" },
          ].map((m) => (
            <Card key={m.label} className="p-5">
              <p className="text-sm text-muted-foreground">{m.label}</p>
              <p className="text-2xl font-bold mt-1">{m.value}</p>
              <p className="text-xs text-primary mt-1">{m.trend}</p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ProfitPlannerApp;
