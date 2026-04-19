import { Link } from "react-router-dom";
import { ArrowRight, Clock, Lock, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Product, UserProduct } from "@/lib/supabase";

interface Props {
  product: Product;
  entitlement?: UserProduct;
}

const formatPrice = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

export const ProductCard = ({ product, entitlement }: Props) => {
  const isComingSoon = product.is_coming_soon;
  const isActive = entitlement && (entitlement.status === "active" || entitlement.status === "trial") &&
    (!entitlement.expired_at || new Date(entitlement.expired_at) > new Date());
  const isTrial = isActive && entitlement?.status === "trial";

  let statusBadge = <Badge variant="secondary">{product.badge || "Available"}</Badge>;
  if (isComingSoon) statusBadge = <Badge variant="outline">Coming Soon</Badge>;
  else if (isTrial) statusBadge = <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-0">Trial</Badge>;
  else if (isActive) statusBadge = <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">Active</Badge>;

  return (
    <Card className="p-5 flex flex-col gap-4 hover:shadow-lg transition-shadow border-border/60 bg-card/60 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {isComingSoon ? <Clock size={20} /> : isActive ? <Sparkles size={20} /> : <Lock size={20} />}
        </div>
        {statusBadge}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-lg leading-snug">{product.name}</h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
        {isTrial && entitlement?.expired_at && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            Trial ends {new Date(entitlement.expired_at).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <span className="text-sm font-medium">
          {product.price_cents === 0 ? "Free" : formatPrice(product.price_cents, product.currency)}
        </span>
        {isComingSoon ? (
          <Button size="sm" variant="ghost" disabled>Coming Soon</Button>
        ) : isActive && product.app_route ? (
          <Button size="sm" asChild>
            <Link to={product.app_route}>Open App <ArrowRight size={14} /></Link>
          </Button>
        ) : (
          <Button size="sm" asChild variant="default">
            <Link to={`/checkout/${product.slug}`}>Buy Now</Link>
          </Button>
        )}
      </div>
    </Card>
  );
};
