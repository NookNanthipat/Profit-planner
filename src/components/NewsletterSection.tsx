import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const NewsletterSection = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="newsletter" className="section-padding">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-10 md:p-12 text-center relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-primary/10 text-primary items-center justify-center mb-5">
              <Mail size={24} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              {t("newsletter.title")}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              {t("newsletter.description")}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
                setEmail("");
                setTimeout(() => setSubmitted(false), 3000);
              }}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("newsletter.placeholder")}
                maxLength={255}
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-background/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button type="submit" className="btn-primary py-3">
                {submitted ? t("newsletter.success") : t("newsletter.subscribe")}
              </button>
            </form>
            <p className="text-xs text-muted-foreground mt-4">{t("newsletter.privacy")}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default NewsletterSection;
