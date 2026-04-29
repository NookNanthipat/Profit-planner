import React from "react";
import { motion } from "framer-motion";
import { XCircle, CheckCircle2, Minus, ArrowRight, Zap, Database, Clock, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "./admin/EditableText";
import { EditableButton } from "./admin/EditableButton";

const iconMap: any = {
  "Data Entry": Database,
  "Calculations": Zap,
  "Debt Tracking": Clock,
  "Security": ShieldCheck,
  "การบันทึกข้อมูล": Database,
  "การคำนวณ": Zap,
  "การติดตามหนี้": Clock,
  "ความปลอดภัย": ShieldCheck
};

const ComparisonSection = () => {
  const { t, i18n } = useTranslation();
  const isThai = i18n.language?.startsWith("th");
  const { ds, dsList, overrides } = useSiteContent("comparison");
  
  const points = dsList("points_list", "comparison.items");

  return (
    <section id="comparison" className="section-padding overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground mb-6">
            <EditableText 
              section="comparison" 
              fieldKey="title" 
              defaultValue={ds("title", "comparison.title")} 
            />
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            <EditableText 
              section="comparison" 
              fieldKey="description" 
              defaultValue={ds("description", "comparison.description")} 
              multiline 
            />
          </p>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-12 gap-4 px-6 mb-4 hidden md:grid">
            <div className="col-span-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
              {isThai ? "หัวข้อ" : "Feature"}
            </div>
            <div className="col-span-4 text-[10px] font-black uppercase tracking-[0.2em] text-rose-500/60">
              {isThai ? "แบบเดิม" : "The Old Way"}
            </div>
            <div className="col-span-5 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 text-right">
              {isThai ? "แบบ ProfitPlanner" : "ProfitPlanner Way"}
            </div>
          </div>

          {points.map((point: any, i: number) => {
            const Icon = iconMap[point.title] || Zap;
            return (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group glass-card p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:bg-primary/[0.02] transition-all border-border/40"
              >
                {/* Feature Title */}
                <div className="md:col-span-3 flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Icon size={20} />
                   </div>
                   <h4 className="font-bold text-foreground uppercase tracking-tight">
                      <EditableText 
                        section="comparison" 
                        fieldKey={`item_title_${i}`} 
                        defaultValue={point.title} 
                      />
                   </h4>
                </div>

                {/* Before (Old Way) */}
                <div className="md:col-span-4 flex items-center gap-3 text-muted-foreground/60 line-through decoration-rose-500/40 italic text-sm">
                   <XCircle size={16} className="text-rose-500/40 shrink-0" />
                   <EditableText 
                    section="comparison" 
                    fieldKey={`item_before_${i}`} 
                    defaultValue={point.before} 
                  />
                </div>

                {/* Arrow */}
                <div className="hidden md:flex md:col-span-1 justify-center text-primary/20 group-hover:text-primary/40 transition-colors">
                   <ArrowRight size={24} />
                </div>

                {/* After (New Way) */}
                <div className="md:col-span-4 flex items-center gap-4 text-right justify-end bg-primary/[0.03] md:bg-transparent p-4 md:p-0 rounded-2xl border md:border-0 border-primary/10">
                   <p className="font-black text-foreground tracking-tight text-base">
                      <EditableText 
                        section="comparison" 
                        fieldKey={`item_after_${i}`} 
                        defaultValue={point.after} 
                      />
                   </p>
                   <CheckCircle2 size={24} className="text-primary shrink-0" />
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
           <EditableButton 
             section="comparison" 
             fieldKey="cta" 
             defaultLabel={ds("cta", "comparison.cta")} 
             defaultHref={overrides["cta_href"] || "#pricing"}
             className="btn-primary inline-flex items-center gap-2 h-14 px-10 rounded-2xl shadow-2xl shadow-primary/20"
           />
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
