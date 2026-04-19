import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Settings, Shield } from "lucide-react";
import { supabase, type Product, type UserProduct } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import SettingsMenu from "@/components/SettingsMenu";
import { ProductCard } from "@/components/portal/ProductCard";

type EntitlementMap = Record<string, UserProduct>;

const PortalPage = () => {
  const { user, signOut, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [productsRes, upRes] = await Promise.all([
        supabase.from("products").select("*").eq("is_active", true).order("created_at"),
        supabase.from("user_products").select("*").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      setProducts((productsRes.data as Product[]) || []);
      const map: EntitlementMap = {};
      ((upRes.data as UserProduct[]) || []).forEach((e) => (map[e.product_id] = e));
      setEntitlements(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const owned = products.filter((p) => {
    const e = entitlements[p.id];
    if (!e) return false;
    if (e.expired_at && new Date(e.expired_at) < new Date()) return false;
    return e.status === "active" || e.status === "trial";
  });

  const available = products.filter((p) => !owned.includes(p));
  const initial = ((user?.user_metadata?.display_name as string) || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold">
            Profit<span className="text-gradient-emerald">Planner</span>
          </Link>
          <div className="flex items-center gap-3">
            <SettingsMenu />
            {isAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin"><Shield size={14} /> Admin</Link>
              </Button>
            )}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                {initial}
              </div>
              <span className="text-muted-foreground truncate max-w-[160px]">{user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut size={14} /> Sign out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-sm text-muted-foreground mb-1">Welcome back</p>
          <h1 className="text-3xl font-display font-bold">{(user?.user_metadata?.display_name as string) || user?.email}</h1>
          <p className="text-muted-foreground mt-2">Manage your products and pick up where you left off.</p>
        </motion.div>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Products</h2>
            <span className="text-sm text-muted-foreground">{owned.length} active</span>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : owned.length === 0 ? (
            <Card className="p-10 text-center bg-muted/30 border-dashed">
              <p className="text-muted-foreground">You don't own any products yet. Browse the suite below to get started.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {owned.map((p) => (
                <ProductCard key={p.id} product={p} entitlement={entitlements[p.id]} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Available Products</h2>
            <span className="text-sm text-muted-foreground">{available.length} available</span>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {available.map((p) => (
                <ProductCard key={p.id} product={p} entitlement={undefined} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PortalPage;
