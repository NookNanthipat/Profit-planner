import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "./admin/EditableText";
import { EditableButton } from "./admin/EditableButton";

const CTASection = () => {
  const { t } = useTranslation();
  const { ds, overrides } = useSiteContent("cta");

  return (
    <section id="cta" className="section-padding py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="glass-card p-12 md:p-20 text-center border-primary/20 shadow-2xl bg-gradient-to-br from-background/80 to-primary/[0.03]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Sparkles className="w-12 h-12 text-primary mx-auto mb-8 animate-pulse" />
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
               <EditableText section="cta" fieldKey="title" defaultValue={ds("title", "cta.title")} />
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
               <EditableText section="cta" fieldKey="description" defaultValue={ds("description", "cta.description")} multiline />
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <EditableButton 
                section="cta" 
                fieldKey="btn" 
                defaultLabel={ds("btn", "cta.subscribe")} 
                defaultHref={overrides["btn_href"] || "#"}
                className="btn-primary px-10 py-4 h-auto text-base inline-flex items-center gap-2 group shadow-xl shadow-primary/30"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
