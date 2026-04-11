import { motion } from "framer-motion";
import { CheckCircle2, Clock, Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";

const icons = [CheckCircle2, Clock, Rocket];
const colors = ["text-green-500", "text-accent", "text-muted-foreground"];

const RoadmapSection = () => {
  const { t } = useTranslation();
  const items = t("roadmap.items", { returnObjects: true }) as Array<{ status: string; title: string; desc: string }>;

  return (
    <section id="roadmap" className="section-padding bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-gold-light uppercase tracking-widest mb-3">{t("roadmap.label")}</p>
          <h2 className="text-3xl md:text-4xl mb-4">{t("roadmap.title")}</h2>
          <p className="text-primary-foreground/60 max-w-lg mx-auto">{t("roadmap.description")}</p>
        </motion.div>

        <div className="space-y-6">
          {items.map((item, i) => {
            const Icon = icons[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex gap-5 items-start bg-primary-foreground/5 rounded-xl p-6 border border-primary-foreground/10"
              >
                <Icon size={24} className={`${colors[i]} flex-shrink-0 mt-0.5`} />
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-display text-lg">{item.title}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors[i]} border-current/20`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-primary-foreground/60 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RoadmapSection;
