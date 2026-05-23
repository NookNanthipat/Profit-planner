import { Link } from "react-router-dom";
import { ArrowRight, Clock, Lock, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Product, UserProduct } from "@/lib/supabase";
import { useTranslation } from "react-i18next";
import { EditableText } from "../admin/EditableText";
import { EditableButton } from "../admin/EditableButton";

interface Props {
  product: Product;
  entitlement?: UserProduct;
}

const formatPrice = (product: Product) => {
  const raw = Number(product.price_amount);
  const value = isNaN(raw) ? 0 : raw / 100;
  const currency = product.currency?.toUpperCase() || "THB";
  const locale = currency === "THB" ? "th-TH" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const ProductCard = ({ product, entitlement }: Props) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "en";
  const isThai = lang.startsWith("th");
  const displayName = isThai && product.name_th ? product.name_th : product.name;
  const displayDesc = isThai && product.description_th ? product.description_th : product.description;

  const isComingSoon = product.is_coming_soon;
  const isFree = entitlement?.status === "free";
  const isActive = !isFree && !!entitlement &&
    (entitlement.status === "active" || entitlement.status === "trial") &&
    (!entitlement.expired_at || new Date(entitlement.expired_at) > new Date());
  const isTrial = isActive && entitlement?.status === "trial";
  const isAccessible = isActive || isFree; // can open the app

  const getBadgeText = () => {
    if (isComingSoon) return t("product.coming_soon") === "product.coming_soon" ? "Coming Soon" : t("product.coming_soon");
    if (isFree) return isThai ? "แผนฟรี" : "Free Plan";
    if (isTrial) return t("product.trial") === "product.trial" ? "Trial" : t("product.trial");
    if (isActive) return t("nav.active") === "nav.active" ? "Active" : t("nav.active");
    return product.badge || (t("nav.available") === "nav.available" ? "Available" : t("nav.available"));
  };

  return (
    <Card className="p-6 flex flex-col gap-5 hover:shadow-2xl transition-all duration-500 border-border/60 bg-card/60 backdrop-blur rounded-[32px] group">
      <div className="flex items-start justify-between gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
          {isComingSoon ? <Clock size={22} /> : isAccessible ? <Sparkles size={22} /> : <Lock size={22} />}
        </div>
        <Badge
          variant={isComingSoon ? "outline" : (isActive && !isTrial ? "default" : "secondary")}
          className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
        >
          {getBadgeText()}
        </Badge>
      </div>

      <div className="flex-1 space-y-2">
        <h3 className="font-bold text-xl leading-tight">
          <EditableText 
            section="products" 
            fieldKey={`${product.id}_name`} 
            defaultValue={displayName || ""} 
          />
        </h3>
        <div className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          <EditableText 
            section="products" 
            fieldKey={`${product.id}_description`} 
            defaultValue={displayDesc || ""} 
            multiline
          />
        </div>
        {isTrial && entitlement?.expired_at && (
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-4 bg-primary/5 inline-block px-3 py-1 rounded-lg">
            {t("product.trial_ends") || "Trial ends"} {new Date(entitlement.expired_at).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-5 border-t border-border/40">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase opacity-40 leading-none mb-1">
            {isThai ? "ราคาเริ่มต้น" : "Starting from"}
          </span>
          <span className="text-xl font-black text-foreground tracking-tighter">
             {formatPrice(product)}
          </span>
        </div>
        
        {isComingSoon ? (
          <Button size="lg" variant="ghost" disabled className="rounded-2xl px-6 font-bold text-xs uppercase tracking-widest">
            {t("product.coming_soon") === "product.coming_soon" ? "Soon" : t("product.coming_soon")}
          </Button>
        ) : isAccessible && product.app_route ? (
          <EditableButton
            section="products"
            fieldKey={`${product.id}_action`}
            defaultLabel={t("product.open_app") === "product.open_app" ? "Open Application" : t("product.open_app")}
            defaultHref={product.app_route || "#"}
            className="btn-primary h-14 text-[11px] font-black uppercase tracking-widest rounded-[22px] px-8 flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-all"
            targetCols={{ label: isThai ? "name_th" : "name", href: "app_route" }}
          />
        ) : (
          <EditableButton
            section="products"
            fieldKey={`${product.id}_action`}
            defaultLabel={t("product.buy_now") === "product.buy_now" ? "Unlock Now" : t("product.buy_now")}
            defaultHref={`/checkout/${product.slug}`}
            className="btn-primary h-12 text-[10px] font-black uppercase tracking-widest rounded-2xl px-6 hover:scale-105 transition-all shadow-lg"
            targetCols={{ label: isThai ? "name_th" : "name", href: "slug" }}
          />
        )}
      </div>
    </Card>
  );
};

export default ProductCard;
