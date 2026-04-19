import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react";
import { supabase, type Product } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const formatPrice = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

const Checkout = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase.from("products").select("*").eq("slug", slug).maybeSingle().then(({ data }) => {
      setProduct(data as Product | null);
      setLoading(false);
    });
  }, [slug]);

  const grantAccess = async (status: "active" | "trial") => {
    if (!user || !product) return;
    setPurchasing(true);
    try {
      const expired_at = status === "trial" ? new Date(Date.now() + 7 * 86400000).toISOString() : null;
      const { error } = await supabase.from("user_products").upsert(
        {
          user_id: user.id,
          product_id: product.id,
          status,
          purchased_at: new Date().toISOString(),
          expired_at,
        },
        { onConflict: "user_id,product_id" }
      );
      if (error) throw error;
      toast({
        title: status === "trial" ? "Trial started" : "Purchase successful",
        description: status === "trial" ? "Your 7-day trial is active." : "Welcome aboard!",
      });
      navigate(product.app_route || "/portal");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p>Product not found</p>
        <Button asChild><Link to="/portal">Back to portal</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/portal" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Back to portal
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8 backdrop-blur bg-card/80 border-border/60 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <Badge variant="secondary" className="mb-2">{product.badge || "Premium"}</Badge>
                <h1 className="text-3xl font-display font-bold">{product.name}</h1>
                <p className="text-muted-foreground mt-2">{product.description}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{formatPrice(product.price_cents, product.currency)}</div>
                <div className="text-xs text-muted-foreground">one-time</div>
              </div>
            </div>

            <div className="space-y-2 mb-8">
              {["Lifetime access", "Free updates", "Email support", "30-day money-back"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-primary" /> {f}
                </div>
              ))}
            </div>

            <div className="bg-muted/40 border border-dashed border-border rounded-lg p-4 mb-6 text-xs text-muted-foreground">
              <strong className="text-foreground">Demo mode:</strong> Stripe is not connected yet. The buttons below
              simulate a successful purchase by inserting the entitlement directly.
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1" disabled={purchasing} onClick={() => grantAccess("active")}>
                {purchasing ? <Loader2 className="animate-spin" /> : <>Buy Now (Simulate)</>}
              </Button>
              <Button size="lg" variant="outline" className="flex-1" disabled={purchasing} onClick={() => grantAccess("trial")}>
                <Sparkles size={16} /> Start 7-day Trial
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Checkout;
