import React, { useState, useEffect } from "react";
import { useAdminEdit } from "@/context/AdminEditContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Check, X, Loader2, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSiteContent } from "@/hooks/useSiteContent";

interface Props {
  section: string;
  fieldKey: string;
  defaultValue: string;
  className?: string;
  multiline?: boolean;
  type?: "text" | "number";
}

export const EditableText = ({ section, fieldKey, defaultValue, className, multiline, type = "text" }: Props) => {
  const { isEditMode, previewLanguage } = useAdminEdit();
  const { toast } = useToast();
  const { overrides, refresh } = useSiteContent(section);
  
  // Get current DB value for the specific language we are previewing
  const dbValue = overrides[fieldKey];
  const finalValue = (typeof dbValue === 'string' && dbValue.length > 0) ? dbValue : defaultValue;

  const [tempValue, setTempValue] = useState(finalValue);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setTempValue(finalValue);
  }, [finalValue, open]);

  if (!isEditMode) {
    return <span className={className}>{finalValue}</span>;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const activeLang = previewLanguage.split('-')[0];
      let valToSave: any = tempValue;

      if (section === "products") {
        const [id, col] = fieldKey.split("_");
        if (!id || !col) throw new Error("Invalid fieldKey for products section");
        const columnName = activeLang === "th" ? `${col}_th` : col;
        
        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        if (col === "price" && type === "number") {
          updateData.price_cents = Math.round(parseFloat(tempValue) * 100);
        } else if (col === "pricethb" && type === "number") {
          updateData.price_thb = Math.round(parseFloat(tempValue));
        } else {
          updateData[columnName] = valToSave;
        }

        const { error } = await supabase.from("products").update(updateData).eq("id", id);
        if (error) throw error;
      } else {
        const fieldName = activeLang === "th" ? "value_th" : "value_en";
        const { error } = await supabase.from("pp_site_content").upsert({
          section,
          key: fieldKey,
          [fieldName]: valToSave,
          updated_at: new Date().toISOString()
        }, { onConflict: 'section,key' });
        if (error) throw error;
      }
      
      refresh();
      setOpen(false);
      toast({ title: "Saved successfully" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span 
          className={cn(
            "relative cursor-pointer transition-all rounded px-1 -mx-1 inline-flex items-center gap-1 group/edit select-none caret-transparent text-left",
            open ? "ring-2 ring-primary bg-primary/5 shadow-md" : "hover:bg-primary/5 hover:ring-1 hover:ring-primary/30",
            className
          )}
        >
          {finalValue || <span className="opacity-40 italic">Empty {fieldKey}</span>}
          <Edit3 size={10} className="opacity-0 group-hover/edit:opacity-40 transition-opacity" />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-5 rounded-[24px] shadow-2xl border-none ring-1 ring-border/50 z-[100]">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-black uppercase text-[10px] tracking-widest text-primary">Edit Content</h4>
            <p className="text-[10px] text-muted-foreground italic">Field: {fieldKey} ({previewLanguage.toUpperCase()})</p>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase opacity-60">New Value</Label>
            {multiline ? (
              <textarea
                autoFocus
                className="w-full min-h-[150px] rounded-2xl bg-muted/20 border-none p-4 text-xs font-medium focus:ring-1 focus:ring-primary outline-none shadow-inner resize-none leading-relaxed"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
              />
            ) : (
              <input
                autoFocus
                type={type}
                className="w-full h-11 rounded-xl bg-muted/20 border-none px-4 text-xs font-bold shadow-inner focus:ring-1 focus:ring-primary outline-none"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
              />
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1 rounded-xl font-bold uppercase text-[10px]">Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-2 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
              {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Check className="mr-2" size={14} />}
              Apply Changes
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
