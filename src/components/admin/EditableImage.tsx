import React, { useRef, useState, useEffect } from "react";
import { useAdminEdit } from "@/context/AdminEditContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ImageIcon, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  section: string;
  fieldKey: string;
  defaultSrc: string;
  className?: string;
  aspectRatio?: string;
  children?: React.ReactNode;
}

export const EditableImage = ({ section, fieldKey, defaultSrc, className, aspectRatio = "aspect-video", children }: Props) => {
  const { isEditMode } = useAdminEdit();
  const [src, setSrc] = useState(defaultSrc);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSrc(defaultSrc);
  }, [defaultSrc]);

  if (!isEditMode) {
    if (src) return <img src={src} className={className} alt="" />;
    return <>{children}</>;
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const { error } = await supabase.from("pp_site_content").upsert({
          section,
          key: fieldKey,
          value_en: base64String, // Images are usually shared
          value_th: base64String,
          updated_at: new Date().toISOString()
        }, { onConflict: 'section,key' });

        if (error) throw error;
        setSrc(base64String);
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUploading(true);
    try {
      await supabase.from("pp_site_content").delete().eq("section", section).eq("key", fieldKey);
      setSrc("");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("relative group cursor-pointer overflow-hidden transition-all", className)}>
      {src ? (
        <img src={src} className="w-full h-full object-cover" alt="" />
      ) : children ? (
        children
      ) : (
        <div className={cn("flex flex-col items-center justify-center bg-muted/20 w-full h-full border-2 border-dashed border-border/60 rounded-xl", aspectRatio)}>
          <ImageIcon size={32} className="opacity-20" />
          <p className="text-[10px] font-black uppercase mt-2 opacity-40">Missing Image</p>
        </div>
      )}

      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30">
        <div className="flex flex-col gap-2 scale-90 group-hover:scale-100 transition-transform">
          <Button size="sm" className="rounded-xl font-black uppercase text-[10px] tracking-widest" onClick={() => fileRef.current?.click()}>
            {isUploading ? <Loader2 className="animate-spin mr-2" size={14} /> : <Plus className="mr-2" size={14} />}
            Upload New
          </Button>
          {src && (
            <Button size="sm" variant="destructive" className="rounded-xl font-black uppercase text-[10px] tracking-widest" onClick={removeImage}>
              <Trash2 className="mr-2" size={14} /> Remove
            </Button>
          )}
        </div>
      </div>
      <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleFile} />
    </div>
  );
};
