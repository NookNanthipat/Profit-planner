import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Sparkles, Building2, ArrowRight, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase, type Product } from "@/lib/supabase";
import { getProductStatus } from "@/lib/productStatus";

const icons = [LayoutDashboard, Sparkles, Building2];

interface SuiteFallback {
  badge: string;
  title: string;
  desc: string;
  cta: string;
}

const SuiteSection = () => {
  const { t } = useTranslation();
  const fallback = t("suite.items", { returnObjects: true }) as SuiteFallback[];
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at")
      .then(({ data }) => setProducts((data as Product[]) || []));
  }, []);

  // Use DB products if available, else fall back to i18n
  const items = products && products.length > 0
    ? products.map((p, i) => ({
        product: p,
        icon: icons[i] || LayoutDashboard,
        badge: p.is_coming_soon ? "Coming Soon" : (p.badge || "Live"),
        title: p.name,
        desc: p.description || "",
        cta: p.is_coming_soon ? t("suite.items.0.cta") : "Explore",
        href: p.is_coming_soon ? "#" : (p.app_route || "/portal"),
        comingSoon: p.is_coming_soon,
      }))
    : fallback.map((item, i) => ({
        product: null,
        icon: icons[i] || LayoutDashboard,
        badge: item.badge,
        title: item.title,
        desc: item.desc,
        cta: item.cta,
        href: "#",
        comingSoon: /coming/i.test(item.badge),
      }));

  return (
    <section id="suite" className="section-padding bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">
            {t("suite.label")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-3">
            {t("suite.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("suite.description")}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {item.comingSoon ? <Clock size={22} /> : <Icon size={22} />}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    item.comingSoon
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground flex-1">{item.desc}</p>
                {item.comingSoon ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground mt-5">
                    {item.cta}
                  </span>
                ) : (
                  <Link to={item.href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary mt-5 hover:gap-2.5 transition-all">
                    {item.cta} <ArrowRight size={14} />
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SuiteSection;
