import { motion } from "framer-motion";
import { ShieldCheck, Lock, Globe, Server, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "./admin/EditableText";
import { useAdminEdit } from "@/context/AdminEditContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const icons = [Lock, ShieldCheck, Globe, Server];

const TrustBadges = () => {
  const { t } = useTranslation();
  const { isEditMode } = useAdminEdit();
  const { toast } = useToast();
  const { ds, dsList, refresh } = useSiteContent("trust");
  
  const items = dsList("trust_list", "trust.items");

  const saveList = async (newList: any[]) => {
    try {
      const { error } = await supabase.from("pp_site_content").upsert({
        section: "trust",
        key: "trust_list",
        value_en: JSON.stringify(newList),
        value_th: JSON.stringify(newList),
        updated_at: new Date().toISOString()
      }, { onConflict: 'section,key' });
      if (error) throw error;
      toast({ title: "Badges updated" });
      refresh();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const addItem = (e: React.MouseEvent) => {
    e.preventDefault();
    saveList([...items, "New Trust Standard"]);
  };

  const removeItem = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    if (!confirm("Remove this trust badge?")) return;
    const newList = [...items];
    newList.splice(index, 1);
    saveList(newList);
  };

  return (
    <section className="py-12 px-6 border-t border-border/50 bg-slate-50/30 dark:bg-slate-900/10">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 mb-10">
           <EditableText section="trust" fieldKey="title" defaultValue={ds("title", "trust.title")} />
        </p>
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
          {items.map((item, i) => {
            const Icon = icons[i % icons.length];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 text-sm text-muted-foreground group relative"
              >
                <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-border/40 flex items-center justify-center text-primary/70 shrink-0 transition-transform group-hover:scale-110">
                  <Icon size={18} />
                </div>
                <span className="font-bold tracking-tight">
                  <EditableText section="trust" fieldKey={`item_${i}`} defaultValue={typeof item === 'string' ? item : item.text} />
                </span>
                
                {isEditMode && (
                  <button onClick={(e) => removeItem(e, i)} className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-opacity absolute -top-2 -right-4">
                    <Trash2 size={12} />
                  </button>
                )}
              </motion.div>
            );
          })}

          {isEditMode && (
            <button 
              onClick={addItem}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60 border-2 border-dashed border-primary/20 rounded-xl px-4 py-2 hover:bg-primary/5 hover:border-primary/40 transition-all"
            >
              <Plus size={14} /> Add Badge
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
