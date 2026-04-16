import { motion } from "framer-motion";
import { ShieldCheck, Lock, Globe, Server } from "lucide-react";
import { useTranslation } from "react-i18next";

const icons = [Lock, ShieldCheck, Globe, Server];

const TrustBadges = () => {
  const { t } = useTranslation();
  const items = t("trust.items", { returnObjects: true }) as string[];

  return (
    <section className="py-12 px-6 border-t border-border/50">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-sm text-muted-foreground mb-8">{t("trust.title")}</p>
        <div className="flex flex-wrap justify-center gap-8">
          {items.map((item, i) => {
            const Icon = icons[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Icon size={18} className="text-primary/70" />
                <span className="font-medium">{item}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
