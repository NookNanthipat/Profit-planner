import { motion } from "framer-motion";
import { CheckCircle2, Clock, Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";

const icons = [CheckCircle2, Clock, Rocket];

const RoadmapSection = () => {
  const { t } = useTranslation();
  const items = t("roadmap.items", { returnObjects: true }) as Array<{ status: string; title: string; desc: string }>;

  return (
    <section id="roadmap" className="section-padding bg-secondary/50">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">{t("roadmap.label")}</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t("roadmap.title")}</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">{t("roadmap.description")}</p>
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
                className="glass-card p-6 flex gap-5 items-start"
              >
                <Icon size={24} className={`flex-shrink-0 mt-0.5 ${i === 0 ? "text-primary" : i === 1 ? "text-yellow-500" : "text-muted-foreground"}`} />
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-display font-semibold text-lg text-foreground">{item.title}</h3>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      i === 0 ? "bg-primary/15 text-primary" : i === 1 ? "bg-yellow-500/15 text-yellow-600" : "bg-muted text-muted-foreground"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
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
