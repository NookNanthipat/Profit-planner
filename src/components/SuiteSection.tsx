import { motion } from "framer-motion";
import { LayoutDashboard, Sparkles, Building2, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const icons = [LayoutDashboard, Sparkles, Building2];

interface SuiteItem {
  badge: string;
  title: string;
  desc: string;
  cta: string;
}

const SuiteSection = () => {
  const { t } = useTranslation();
  const items = t("suite.items", { returnObjects: true }) as SuiteItem[];

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
            const Icon = icons[i] || LayoutDashboard;
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
                    <Icon size={22} />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground flex-1">{item.desc}</p>
                <a href="#" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary mt-5 hover:gap-2.5 transition-all">
                  {item.cta} <ArrowRight size={14} />
                </a>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SuiteSection;
