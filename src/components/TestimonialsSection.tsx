import React from "react";
import { motion } from "framer-motion";
import { Quote, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "./admin/EditableText";
import { useAdminEdit } from "@/context/AdminEditContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const TestimonialsSection = () => {
  const { i18n } = useTranslation();
  const isThai = i18n.language?.startsWith("th");
  const { isEditMode, previewLanguage } = useAdminEdit();
  const { toast } = useToast();
  const { ds, dsList, refresh, overrides } = useSiteContent("testimonials");
  const items = dsList("testimonials_list", "testimonials.items");

  const saveList = async (newList: any[]) => {
    try {
      const activeLang = previewLanguage.split('-')[0];
      const fieldName = activeLang === "th" ? "value_th" : "value_en";
      const { error } = await supabase.from("pp_site_content").upsert({
        section: "testimonials",
        key: "testimonials_list",
        [fieldName]: JSON.stringify(newList),
        updated_at: new Date().toISOString()
      }, { onConflict: 'section,key' });
      if (error) throw error;
      toast({ title: "Testimonials updated" });
      refresh();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const addItem = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newItem = { initials: "JD", name: "John Doe", role: "Investor", quote: "ProfitPlanner changed my life." };
    saveList([...items, newItem]);
  };

  const removeItem = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Remove this testimonial?")) return;
    const newList = [...items];
    newList.splice(index, 1);
    saveList(newList);
  };

  return (
    <section id="testimonials" className="section-padding">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
             <EditableText section="testimonials" fieldKey="label" defaultValue={ds("label", "testimonials.label")} />
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
             <EditableText section="testimonials" fieldKey="title" defaultValue={ds("title", "testimonials.title")} />
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
             <EditableText section="testimonials" fieldKey="description" defaultValue={ds("description", "testimonials.description")} multiline />
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-8 relative hover:-translate-y-2 transition-all duration-500 group"
            >
              {isEditMode && (
                <button 
                  onClick={(e) => removeItem(e, i)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white z-20"
                >
                  <Trash2 size={12} />
                </button>
              )}
              <div className="absolute top-8 right-8 text-primary/10">
                <Quote size={48} />
              </div>
              
              <p className="text-lg italic text-foreground mb-8 relative z-10 leading-relaxed">
                 <EditableText section="testimonials" fieldKey={`item_quote_${i}`} defaultValue={testimonial.quote} multiline />
              </p>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary shadow-inner">
                   <EditableText section="testimonials" fieldKey={`item_initials_${i}`} defaultValue={testimonial.initials} />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">
                     <EditableText section="testimonials" fieldKey={`item_name_${i}`} defaultValue={testimonial.name} />
                  </h4>
                  <p className="text-sm text-muted-foreground">
                     <EditableText section="testimonials" fieldKey={`item_role_${i}`} defaultValue={testimonial.role} />
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          {isEditMode && (
            <button 
              onClick={addItem}
              className="p-8 rounded-[32px] border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group min-h-[300px]"
            >
              <Plus size={32} />
              <span className="font-black uppercase text-xs tracking-widest">Add Testimonial</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
