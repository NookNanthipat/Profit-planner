import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FAQ {
  q: string;
  a: string;
}

const FAQSection = () => {
  const { t } = useTranslation();
  const items = t("faq.items", { returnObjects: true }) as FAQ[];

  return (
    <section id="faq" className="section-padding">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">
            {t("faq.label")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-3">
            {t("faq.title")}
          </h2>
          <p className="text-muted-foreground">{t("faq.description")}</p>
        </motion.div>

        <Accordion type="single" collapsible className="glass-card px-6 divide-y divide-border/50">
          {items.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-b-0">
              <AccordionTrigger className="text-left text-foreground font-semibold hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
