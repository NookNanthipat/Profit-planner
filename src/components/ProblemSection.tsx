import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "./admin/EditableText";
import { useAdminEdit } from "@/context/AdminEditContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const ProblemSection = () => {
  const { i18n } = useTranslation();
  const isThai = i18n.language?.startsWith("th");
  const { isEditMode } = useAdminEdit();
  const { toast } = useToast();
  const { ds, dsList, refresh, overrides, isReady } = useSiteContent("problem");

  const beforeItems = dsList("before_list", "problem.before.items");
  const afterItems = dsList("after_list", "problem.after.items");

  if (!isReady) return null;

  const saveList = async (key: string, newList: any[]) => {
    try {
      const activeLang = i18n.language.split('-')[0];
      const fieldName = activeLang === "th" ? "value_th" : "value_en";
      
      const { error } = await supabase.from("pp_site_content").upsert({
        section: "problem",
        key: key,
        [fieldName]: JSON.stringify(newList),
        updated_at: new Date().toISOString()
      }, { onConflict: 'section,key' });
      
      if (error) throw error;
      toast({ title: "List updated" });
      refresh(); 
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <section id="problem" className="section-padding bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            <EditableText section="problem" fieldKey="label" defaultValue={ds("label", "problem.label")} />
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            <EditableText section="problem" fieldKey="title" defaultValue={ds("title", "problem.title")} />
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            <EditableText section="problem" fieldKey="description" defaultValue={ds("description", "problem.description")} multiline />
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* The Old Way */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8 border-rose-500/20 bg-rose-500/[0.02]"
          >
            <h3 className="text-xl font-bold text-rose-500 mb-6 flex items-center gap-2">
              <XCircle size={20} />
              <EditableText section="problem" fieldKey="before_title" defaultValue={ds("before_title", "problem.before.title")} />
            </h3>
            <ul className="space-y-4">
              {beforeItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-muted-foreground group relative">
                  <XCircle size={18} className="text-rose-500/50 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <EditableText 
                      section="problem" 
                      fieldKey={`before_item_${i}`} 
                      defaultValue={typeof item === 'string' ? item : item.text} 
                    />
                  </div>
                  {isEditMode && (
                    <button onClick={(e) => {
                      e.preventDefault();
                      const next = [...beforeItems];
                      next.splice(i, 1);
                      saveList("before_list", next);
                    }} className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:bg-rose-500/10 rounded ml-auto transition-opacity"><Trash2 size={12} /></button>
                  )}
                </li>
              ))}
              {isEditMode && (
                <button onClick={(e) => { e.preventDefault(); saveList("before_list", [...beforeItems, "New Problem point"]); }} className="w-full py-2 border-2 border-dashed border-rose-500/20 rounded-xl text-rose-500/60 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/5 transition-all"><Plus size={14} className="inline mr-1" /> Add Pain Point</button>
              )}
            </ul>
          </motion.div>

          {/* The New Way */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8 border-primary/20 bg-primary/[0.02]"
          >
            <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
              <CheckCircle2 size={20} />
              <EditableText section="problem" fieldKey="after_title" defaultValue={ds("after_title", "problem.after.title")} />
            </h3>
            <ul className="space-y-4">
              {afterItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground group relative">
                  <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <EditableText section="problem" fieldKey={`after_item_${i}`} defaultValue={typeof item === 'string' ? item : item.text} />
                  </div>
                  {isEditMode && (
                    <button onClick={(e) => {
                      e.preventDefault();
                      const next = [...afterItems];
                      next.splice(i, 1);
                      saveList("after_list", next);
                    }} className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:bg-rose-500/10 rounded ml-auto transition-opacity"><Trash2 size={12} /></button>
                  )}
                </li>
              ))}
              {isEditMode && (
                <button onClick={(e) => { e.preventDefault(); saveList("after_list", [...afterItems, "New Solution point"]); }} className="w-full py-2 border-2 border-dashed border-primary/20 rounded-xl text-primary/60 text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 transition-all"><Plus size={14} className="inline mr-1" /> Add Solution</button>
              )}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
