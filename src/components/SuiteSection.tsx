import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Building2, LayoutDashboard, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "./admin/EditableText";
import { EditableButton } from "./admin/EditableButton";
import { useAdminEdit } from "@/context/AdminEditContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const iconMap: any = {
  "Personal Finance App": LayoutDashboard,
  "AI Budget Advisor": Sparkles,
  "SME Planner & ERP": Building2,
};

const SuiteSection = () => {
  const { t } = useTranslation();
  const { isEditMode } = useAdminEdit();
  const { toast } = useToast();
  const { ds, dsList, refresh, overrides } = useSiteContent("suite");
  const items = dsList("suite_list", "suite.items");

  const saveList = async (newList: any[]) => {
    try {
      const { error } = await supabase.from("pp_site_content").upsert({
        section: "suite",
        key: "suite_list",
        value_en: JSON.stringify(newList),
        value_th: JSON.stringify(newList),
        updated_at: new Date().toISOString()
      }, { onConflict: 'section,key' });
      if (error) throw error;
      toast({ title: "Suite updated" });
      refresh();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const addItem = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newItem = { badge: "New", title: "New Product", desc: "Description here.", cta: "Learn More" };
    saveList([...items, newItem]);
  };

  const removeItem = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Remove this product?")) return;
    const newList = [...items];
    newList.splice(index, 1);
    saveList(newList);
  };

  return (
    <section id="suite" className="section-padding bg-slate-50 dark:bg-slate-950/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
             <EditableText section="suite" fieldKey="label" defaultValue={ds("label", "suite.label")} />
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
             <EditableText section="suite" fieldKey="title" defaultValue={ds("title", "suite.title")} />
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
             <EditableText section="suite" fieldKey="description" defaultValue={ds("description", "suite.description")} multiline />
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {items.map((item, i) => {
            const Icon = iconMap[item.title] || LayoutDashboard;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-8 group flex flex-col items-center text-center hover:scale-[1.02] transition-all duration-500 relative"
              >
                {isEditMode && (
                  <button 
                    onClick={(e) => removeItem(e, i)}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white z-20"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider mb-6">
                  <EditableText section="suite" fieldKey={`item_badge_${i}`} defaultValue={item.badge} />
                </div>
                
                <div className="w-16 h-16 rounded-[24px] bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform duration-500 shadow-xl shadow-primary/5">
                  <Icon size={32} />
                </div>

                <h3 className="text-xl font-bold text-foreground mb-3 uppercase tracking-tight">
                  <EditableText section="suite" fieldKey={`item_title_${i}`} defaultValue={item.title} />
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-8 flex-1">
                  <EditableText section="suite" fieldKey={`item_desc_${i}`} defaultValue={item.desc} multiline />
                </p>

                <EditableButton 
                  section="suite" 
                  fieldKey={`item_cta_${i}`} 
                  defaultLabel={item.cta} 
                  defaultHref={overrides[`item_cta_${i}_href`] || "#"}
                  className="w-full btn-outline inline-flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 py-3"
                />
              </motion.div>
            );
          })}

          {isEditMode && (
            <button 
              onClick={addItem}
              className="p-8 rounded-[32px] border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group min-h-[400px]"
            >
              <Plus size={32} />
              <span className="font-black uppercase text-xs tracking-widest">Add Product</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default SuiteSection;
