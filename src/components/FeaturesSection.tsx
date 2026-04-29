import React from "react";
import { motion } from "framer-motion";
import { Check, Shield, Zap, Smartphone, Cpu, Target, FileText, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "./admin/EditableText";
import { useAdminEdit } from "@/context/AdminEditContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const iconMap: any = {
  "Smart Dashboard": Zap,
  "Bank-Level Security": Shield,
  "Multi-Device Sync": Smartphone,
  "Auto Categorization": Cpu,
  "Goal Tracking": Target,
  "Export & Reports": FileText,
};

const FeaturesSection = () => {
  const { i18n } = useTranslation();
  const isThai = i18n.language?.startsWith("th");
  const { isEditMode } = useAdminEdit();
  const { toast } = useToast();
  const { ds, dsList, refresh, overrides, isReady } = useSiteContent("features");
  
  const items = dsList("items_list", "features.items");
  
  if (!isReady) return null;
  
  const saveList = async (newList: any[]) => {
    try {
      const activeLang = i18n.language.split('-')[0];
      const fieldName = activeLang === "th" ? "value_th" : "value_en";

      const { error } = await supabase.from("pp_site_content").upsert({
        section: "features",
        key: "items_list",
        [fieldName]: JSON.stringify(newList),
        updated_at: new Date().toISOString()
      }, { onConflict: 'section,key' });
      if (error) throw error;
      toast({ title: "Features updated" });
      refresh(); // Instant refresh without reload
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const addItem = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newItem = { title: "New Feature", desc: "Feature description goes here." };
    saveList([...items, newItem]);
  };

  const removeItem = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Remove this feature?")) return;
    const newList = [...items];
    newList.splice(index, 1);
    saveList(newList);
  };

  return (
    <section id="features" className="section-padding">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            <EditableText section="features" fieldKey="label" defaultValue={ds("label", "features.label")} />
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            <EditableText section="features" fieldKey="title" defaultValue={ds("title", "features.title")} />
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            <EditableText section="features" fieldKey="description" defaultValue={ds("description", "features.description")} multiline />
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, i) => {
            const Icon = iconMap[item.title] || Check;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-8 group hover:border-primary/40 transition-all duration-500 relative"
              >
                {isEditMode && (
                  <button 
                    onClick={(e) => removeItem(e, i)}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white z-20"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  <EditableText section="features" fieldKey={`item_title_${i}`} defaultValue={item.title} />
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  <EditableText section="features" fieldKey={`item_desc_${i}`} defaultValue={item.desc} multiline />
                </p>
              </motion.div>
            );
          })}

          {isEditMode && (
            <button 
              onClick={addItem}
              className="p-8 rounded-[32px] border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                <Plus size={24} />
              </div>
              <span className="font-black uppercase text-xs tracking-widest">Add Feature</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
