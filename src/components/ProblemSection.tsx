import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const ProblemSection = () => {
  const { t } = useTranslation();
  const before = t("problem.before.items", { returnObjects: true }) as string[];
  const after = t("problem.after.items", { returnObjects: true }) as string[];

  return (
    <section id="problem" className="section-padding">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">
            {t("problem.label")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-3">
            {t("problem.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("problem.description")}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8 border-destructive/30"
          >
            <h3 className="text-xl font-bold text-foreground mb-5">{t("problem.before.title")}</h3>
            <ul className="space-y-3">
              {before.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-muted-foreground">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <X size={14} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8 border-primary/30"
          >
            <h3 className="text-xl font-bold text-foreground mb-5">
              <span className="text-gradient-emerald">{t("problem.after.title")}</span>
            </h3>
            <ul className="space-y-3">
              {after.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check size={14} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
