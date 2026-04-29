import React, { useState, useEffect } from "react";
import { useAdminEdit } from "@/context/AdminEditContext";
import { supabase } from "@/lib/supabase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings2, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  section: string;
  fieldKey: string;
  defaultLabel: string;
  defaultHref?: string;
  className?: string;
  variant?: "primary" | "outline" | "ghost" | "default";
  targetCols?: { label?: string; href?: string };
}

export const EditableButton = ({ section, fieldKey, defaultLabel, defaultHref = "#", className, variant = "default", targetCols }: Props) => {
  const { isEditMode, previewLanguage } = useAdminEdit();
  const { toast } = useToast();
  const [label, setLabel] = useState(defaultLabel);
  const [href, setHref] = useState(defaultHref);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLabel(defaultLabel);
    setHref(defaultHref);
  }, [defaultLabel, defaultHref]);

  if (!isEditMode) {
    return (
      <a href={href} className={className} onClick={(e) => { if(href.startsWith('#')) e.preventDefault(); }}>
        {label}
      </a>
    );
  }

  const handleSave = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsSaving(true);
    try {
      const activeLang = previewLanguage.split('-')[0];
      
      if (section === "products") {
        const [id] = fieldKey.split("_");
        // For products, label can update name or a specific badge/label col
        // href can update app_route or slug
        const labelCol = targetCols?.label || (activeLang === "th" ? "name_th" : "name");
        const hrefCol = targetCols?.href || "app_route";
        
        const updateObj: any = {
          updated_at: new Date().toISOString()
        };
        if (labelCol) updateObj[labelCol] = label;
        if (hrefCol) updateObj[hrefCol] = href;

        const { error } = await supabase.from("products").update(updateObj).eq("id", id);
        if (error) throw error;
      } else {
        const labelField = activeLang === "th" ? "value_th" : "value_en";
        await Promise.all([
          supabase.from("pp_site_content").upsert({
            section,
            key: fieldKey,
            [labelField]: label,
            updated_at: new Date().toISOString()
          }, { onConflict: 'section,key' }),
          supabase.from("pp_site_content").upsert({
            section,
            key: `${fieldKey}_href`,
            value_en: href,
            value_th: href,
            updated_at: new Date().toISOString()
          }, { onConflict: 'section,key' })
        ]);
      }
      
      toast({ title: "Button updated" });
      setOpen(false);
    } catch (err: any) {
      console.error("Save failed:", err);
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className={cn(
            "relative group/btn cursor-pointer transition-all",
            className
          )}
        >
          {label}
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity scale-75 group-hover/btn:scale-100">
            <Settings2 size={10} />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-5 rounded-[24px] shadow-2xl border-none ring-1 ring-border/50 z-[100]" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-black uppercase text-[10px] tracking-widest text-primary">Button Config</h4>
            <p className="text-[10px] text-muted-foreground italic">Editing key: {fieldKey}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase opacity-60">Button Label ({previewLanguage.toUpperCase()})</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-10 rounded-xl bg-muted/20 border-none text-xs font-bold" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase opacity-60">Redirect Link (URL / Route)</Label>
            <Input value={href} onChange={(e) => setHref(e.target.value)} className="h-10 rounded-xl bg-muted/20 border-none text-[10px] font-mono" />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full h-11 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 mt-2">
            {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save className="mr-2" size={14} />}
            Update Button
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
