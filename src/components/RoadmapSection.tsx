import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "./admin/EditableText";
import { useAdminEdit } from "@/context/AdminEditContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const RoadmapSection = () => {
  const { t } = useTranslation();
  const { isEditMode } = useAdminEdit();
  const { toast } = useToast();
  const { ds, dsList, refresh } = useSiteContent("roadmap");
  const items = dsList("roadmap_list", "roadmap.items");

  const saveList = async (newList: any[]) => {
    try {
      const { error } = await supabase.from("pp_site_content").upsert({
        section: "roadmap",
        key: "roadmap_list",
        value_en: JSON.stringify(newList),
        value_th: JSON.stringify(newList),
        updated_at: new Date().toISOString()
      }, { onConflict: 'section,key' });
      if (error) throw error;
      toast({ title: "Roadmap updated" });
      refresh();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const addItem = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newItem = { status: "Planned", title: "New Feature", desc: "Description here." };
    saveList([...items, newItem]);
  };

  const removeItem = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Remove this milestone?")) return;
    const newList = [...items];
    newList.splice(index, 1);
    saveList(newList);
  };

  return (
    <section id="roadmap" className="section-padding bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
             <EditableText section="roadmap" fieldKey="label" defaultValue={ds("label", "roadmap.label")} />
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
             <EditableText section="roadmap" fieldKey="title" defaultValue={ds("title", "roadmap.title")} />
          </h2>
          <p className="text-muted-foreground">
             <EditableText section="roadmap" fieldKey="description" defaultValue={ds("description", "roadmap.description")} multiline />
          </p>
        </div>

        <div className="space-y-8">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-6 relative group"
            >
              {i !== items.length - 1 && (
                <div className="absolute left-[11px] top-10 w-0.5 h-full bg-border/40" />
              )}
              
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 z-10 ${
                item.status === 'Live' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {item.status === 'Live' ? <CheckCircle2 size={14} /> : <Circle size={14} />}
              </div>

              <div className="glass-card p-6 flex-1 hover:border-primary/30 transition-all duration-300 relative">
                {isEditMode && (
                  <button 
                    onClick={(e) => removeItem(e, i)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white z-10"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-foreground">
                     <EditableText section="roadmap" fieldKey={`item_title_${i}`} defaultValue={item.title} />
                  </h3>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    item.status === 'Live' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                     <EditableText section="roadmap" fieldKey={`item_status_${i}`} defaultValue={item.status} />
                  </span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                   <EditableText section="roadmap" fieldKey={`item_desc_${i}`} defaultValue={item.desc} multiline />
                </p>
              </div>
            </motion.div>
          ))}

          {isEditMode && (
            <div className="flex justify-center pt-8">
               <button 
                onClick={addItem}
                className="px-8 py-4 rounded-[24px] border-2 border-dashed border-border/60 flex items-center justify-center gap-3 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group w-full"
              >
                <Plus size={20} />
                <span className="font-black uppercase text-[10px] tracking-widest">Add Roadmap Item</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default RoadmapSection;
