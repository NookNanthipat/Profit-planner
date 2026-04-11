import { motion } from "framer-motion";
import { BarChart3, Lock, Smartphone, RefreshCw, Palette, HeadphonesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const icons = [BarChart3, Lock, Smartphone, RefreshCw, Palette, HeadphonesIcon];

const FeaturesSection = () => {
  const { t } = useTranslation();
  const items = t("features.items", { returnObjects: true }) as Array<{ title: string; desc: string }>;

  return (
    <section id="features" className="section-padding">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-3">{t("features.label")}</p>
          <h2 className="text-3xl md:text-4xl text-foreground mb-4">{t("features.title")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("features.description")}</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((f, i) => {
            const Icon = icons[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <Icon size={22} className="text-accent" />
                </div>
                <h3 className="font-display text-lg text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
