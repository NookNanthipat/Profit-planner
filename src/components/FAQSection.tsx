import React from "react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "./admin/EditableText";
import { useAdminEdit } from "@/context/AdminEditContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

const FAQSection = () => {
  const { t } = useTranslation();
  const { isEditMode } = useAdminEdit();
  const { toast } = useToast();
  const { ds, dsList, refresh } = useSiteContent("faq");
  const items = dsList("faq_list", "faq.items");

  const saveList = async (newList: any[]) => {
    try {
      const { error } = await supabase.from("pp_site_content").upsert({
        section: "faq",
        key: "faq_list",
        value_en: JSON.stringify(newList),
        value_th: JSON.stringify(newList),
        updated_at: new Date().toISOString()
      }, { onConflict: 'section,key' });
      if (error) throw error;
      toast({ title: "FAQ updated" });
      refresh();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const addItem = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newItem = { q: "New Question?", a: "New answer goes here." };
    saveList([...items, newItem]);
  };

  const removeItem = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Remove this FAQ item?")) return;
    const newList = [...items];
    newList.splice(index, 1);
    saveList(newList);
  };

  return (
    <section id="faq" className="section-padding">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
             <EditableText section="faq" fieldKey="label" defaultValue={ds("label", "faq.label")} />
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
             <EditableText section="faq" fieldKey="title" defaultValue={ds("title", "faq.title")} />
          </h2>
          <p className="text-muted-foreground">
             <EditableText section="faq" fieldKey="description" defaultValue={ds("description", "faq.description")} multiline />
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {items.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="glass-card border-none px-6 group relative">
              <AccordionTrigger className="hover:no-underline font-bold text-left py-6">
                <EditableText section="faq" fieldKey={`item_q_${i}`} defaultValue={item.q} />
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6 pt-0">
                <EditableText section="faq" fieldKey={`item_a_${i}`} defaultValue={item.a} multiline />
              </AccordionContent>
              {isEditMode && (
                <button 
                  onClick={(e) => removeItem(e, i)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white z-10"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </AccordionItem>
          ))}
        </Accordion>

        {isEditMode && (
          <button 
            onClick={addItem}
            className="w-full mt-8 p-6 rounded-[24px] border-2 border-dashed border-border/60 flex items-center justify-center gap-3 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group"
          >
            <Plus size={20} />
            <span className="font-black uppercase text-[10px] tracking-widest">Add FAQ Item</span>
          </button>
        )}
      </div>
    </section>
  );
};

export default FAQSection;
