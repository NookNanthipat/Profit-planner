import { motion } from "framer-motion";
import { FileSpreadsheet, ArrowUpRight, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

const prices = ["฿299", "฿499", "฿799"];

const ProductsSection = () => {
  const { t } = useTranslation();
  const items = t("products.items", { returnObjects: true }) as Array<{
    title: string; description: string; badge: string; features: string[];
  }>;

  return (
    <section id="products" className="section-padding bg-secondary/50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-3">{t("products.label")}</p>
          <h2 className="text-3xl md:text-4xl text-foreground mb-4">{t("products.title")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("products.description")}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((product, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl border border-border p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
                  <FileSpreadsheet size={20} className="text-accent" />
                </div>
                <span className="text-xs font-semibold bg-accent/15 text-accent-foreground px-3 py-1 rounded-full">
                  {product.badge}
                </span>
              </div>
              <h3 className="font-display text-xl text-foreground mb-2">{product.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{product.description}</p>
              <ul className="space-y-2 mb-6 flex-1">
                {product.features.map((f, fi) => (
                  <li key={fi} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star size={12} className="text-accent flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                <span className="text-2xl font-bold text-foreground">{prices[i]}</span>
                <button className="btn-gold py-2 px-5 text-sm inline-flex items-center gap-1">
                  {t("products.getTemplate")} <ArrowUpRight size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;
