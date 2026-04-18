import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  initials: string;
}

const TestimonialsSection = () => {
  const { t } = useTranslation();
  const items = t("testimonials.items", { returnObjects: true }) as Testimonial[];

  return (
    <section id="testimonials" className="section-padding">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">
            {t("testimonials.label")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-3">
            {t("testimonials.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("testimonials.description")}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 flex flex-col"
            >
              <div className="flex gap-0.5 text-primary mb-4">
                {[...Array(5)].map((_, s) => (
                  <Star key={s} size={16} fill="currentColor" />
                ))}
              </div>
              <p className="text-foreground/90 mb-6 flex-1 leading-relaxed">"{item.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-semibold">
                  {item.initials}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
