import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { PPCategory, TxType } from "@/lib/profitPlanner";

const schema = z.object({
  name: z.string().trim().min(1).max(40),
  type: z.enum(["income", "expense"]),
  icon: z.string().max(4).optional(),
  color: z.string().max(20).optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category?: PPCategory | null;
  defaultType?: TxType;
  onSaved: () => void;
}

const CategoryForm = ({ open, onOpenChange, category, defaultType = "expense", onSaved }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(category?.name ?? "");
  const [type, setType] = useState<TxType>(category?.type ?? defaultType);
  const [icon, setIcon] = useState(category?.icon ?? "🏷️");
  const [color, setColor] = useState(category?.color ?? "#3b82f6");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) return;
    const parsed = schema.safeParse({ name, type, icon, color });
    if (!parsed.success) {
      toast({ title: "Invalid input", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { ...parsed.data, user_id: user.id };
    const res = category
      ? await supabase.from("pp_categories").update(payload).eq("id", category.id)
      : await supabase.from("pp_categories").insert(payload);
    setSaving(false);
    if (res.error) {
      toast({ title: "Error", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: category ? "Category updated" : "Category created" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} className="text-center text-lg" />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coffee" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TxType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 p-1" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryForm;
