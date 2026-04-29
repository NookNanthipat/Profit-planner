import React, { useEffect, useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Pencil, Plus, Trash2, User as UserIcon, Sparkles, AlertTriangle, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatMoney, type PPAccount, type PPCategory, type PPPerson } from "@/lib/profitPlanner";

// ─── Person Form ─────────────────────────────────────────────────────────────
interface PersonFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  person: PPPerson | null;
  onSaved: () => void;
}

const BLANK_PERSON = { name: "", nickname: "", color: "#6366f1", avatar_url: "" };

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Bella",
];

function PersonFormDialog({ open, onOpenChange, person, onSaved }: PersonFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [f, setF]     = useState({ ...BLANK_PERSON });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setF(person ? {
      name: person.name, nickname: person.nickname ?? "",
      color: person.color ?? "#6366f1", avatar_url: person.avatar_url ?? "",
    } : { ...BLANK_PERSON });
  }, [open, person]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !f.name.trim()) { toast({ title: t("app.common.error"), description: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const row = {
        user_id: user.id, name: f.name.trim(), nickname: f.nickname.trim() || null,
        color: f.color, avatar_url: f.avatar_url.trim() || null,
      };
      const { error } = person
        ? await supabase.from("pp_people").update(row).eq("id", person.id)
        : await supabase.from("pp_people").insert(row);
      if (error) throw error;
      toast({ title: t("app.common.success") });
      onSaved(); onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("app.common.error"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-[32px] p-6 shadow-2xl border-none">
        <DialogHeader><DialogTitle className="font-black uppercase tracking-tight flex items-center gap-2"><Sparkles size={18} className="text-primary" /> {person ? t("app.common.edit") : t("app.setup.newContact")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identity Presets</Label>
            <div className="flex flex-wrap gap-2 py-1">
              <button 
                type="button" 
                onClick={() => set("avatar_url", "")}
                className={cn("w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all", !f.avatar_url ? "border-primary bg-primary/10 shadow-md" : "border-transparent bg-muted/20 hover:bg-muted/40")}
              >
                <UserIcon size={18} className={!f.avatar_url ? "text-primary" : "text-muted-foreground"} />
              </button>
              {PRESET_AVATARS.map(url => (
                <button 
                  key={url} 
                  type="button" 
                  onClick={() => set("avatar_url", url)}
                  className={cn("w-10 h-10 rounded-xl border-2 overflow-hidden transition-all", f.avatar_url === url ? "border-primary shadow-md scale-110" : "border-transparent hover:scale-105")}
                >
                  <img src={url} className="w-full h-full object-cover" alt="preset" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.common.name")} *</Label>
            <Input value={f.name} onChange={e => set("name", e.target.value)} placeholder="John Doe" autoFocus className="rounded-xl h-11 bg-muted/10 border-none shadow-inner font-bold" />
          </div>
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nickname</Label>
            <Input value={f.nickname} onChange={e => set("nickname", e.target.value)} placeholder="Johnny" className="rounded-xl h-11 bg-muted/10 border-none shadow-inner font-bold" />
          </div>
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Custom Image URL / Base64</Label>
            <Input value={f.avatar_url} onChange={e => set("avatar_url", e.target.value)} placeholder="https://..." className="rounded-xl h-9 bg-muted/10 border-none shadow-inner text-[10px] font-mono" />
          </div>
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.forms.color")}</Label>
            <div className="flex gap-3 items-center">
              <input type="color" value={f.color} onChange={e => set("color", e.target.value)} className="w-12 h-10 rounded-xl cursor-pointer border-none shadow-sm" />
              <Input value={f.color} onChange={e => set("color", e.target.value)} className="flex-1 font-mono text-xs rounded-xl h-10 bg-muted/10 border-none shadow-inner uppercase" />
            </div>
          </div>
          <DialogFooter className="pt-4 flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase text-[10px] flex-1">{t("app.common.discard")}</Button>
            <Button type="submit" disabled={saving} className="rounded-xl flex-1 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">{saving ? t("app.common.save") + "..." : person ? t("app.common.update") : t("app.common.add")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Category Form (supports parent_id) ──────────────────────────────────────
interface CatFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: PPCategory | null;
  presetParentId?: string | null;
  parentOptions: PPCategory[];
  onSaved: () => void;
}

const BLANK_CAT = { name: "", type: "expense" as "income" | "expense", icon: "", color: "#6366f1", parent_id: "" };

function CategoryFormDialog({ open, onOpenChange, category, presetParentId, parentOptions, onSaved }: CatFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [f, setF]     = useState({ ...BLANK_CAT });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    if (category) {
      setF({
        name: category.name,
        type: category.type,
        icon: category.icon ?? "",
        color: category.color ?? "#6366f1",
        parent_id: category.parent_id ?? "",
      });
    } else {
      const parent = presetParentId ? parentOptions.find(p => p.id === presetParentId) : null;
      setF({
        ...BLANK_CAT,
        parent_id: presetParentId ?? "",
        type: parent?.type ?? "expense",
      });
    }
  }, [open, category, presetParentId, parentOptions]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !f.name.trim()) { toast({ title: t("app.common.error"), description: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const row = {
        user_id: user.id,
        name: f.name.trim(),
        type: f.type,
        icon: f.icon || null,
        color: f.color || null,
        parent_id: f.parent_id || null,
        sort_order: category?.sort_order ?? 99,
      };
      const { error } = category
        ? await supabase.from("pp_categories").update(row).eq("id", category.id)
        : await supabase.from("pp_categories").insert(row);
      if (error) throw error;
      toast({ title: t("app.common.success") });
      onSaved(); onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("app.common.error"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const validParents = parentOptions.filter(p => p.type === f.type && p.id !== category?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="font-black uppercase tracking-tight">{category ? t("app.common.edit") : t("app.setup.newCategory")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2">
            {(["income", "expense"] as const).map(tType => (
              <button type="button" key={tType} onClick={() => { set("type", tType); set("parent_id", ""); }}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  f.type === tType
                    ? tType === "income"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-sm"
                      : "bg-rose-500/10 border-rose-500 text-rose-600 shadow-sm"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}>
                {tType === "income" ? `📥 ${t("app.common.income")}` : `📤 ${t("app.common.expense")}`}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.forms.parent")}</Label>
            <Select value={f.parent_id || "none"} onValueChange={v => set("parent_id", v === "none" ? "" : v)}>
              <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-none shadow-inner">
                <SelectValue placeholder="— None —" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none">— None —</SelectItem>
                {validParents.map(p => (<SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.common.name")} *</Label>
            <Input value={f.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Dining, Rent" autoFocus className="rounded-xl bg-muted/20 border-none shadow-inner" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.forms.icon")}</Label>
              <Input value={f.icon} onChange={e => set("icon", e.target.value)} placeholder="🍜" maxLength={4} className="text-xl text-center rounded-xl bg-muted/20 border-none shadow-inner" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.forms.color")}</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={f.color} onChange={e => set("color", e.target.value)} className="w-10 h-10 rounded-xl cursor-pointer border-none shadow-sm" />
                <Input value={f.color} onChange={e => set("color", e.target.value)} className="flex-1 font-mono text-xs rounded-xl bg-muted/20 border-none shadow-inner uppercase" />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase text-[10px]">{t("app.common.cancel")}</Button>
            <Button type="submit" disabled={saving} className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest">{saving ? t("app.common.save") + "..." : category ? t("app.common.update") : t("app.common.add")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Account Form ────────────────────────────────────────────────────────────
interface AccFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  account: PPAccount | null;
  onSaved: () => void;
}

const BLANK_ACC = { name: "", type: "bank" as "cash"|"bank"|"credit"|"ewallet", opening_balance: "0", currency: "THB" };

function AccountFormDialog({ open, onOpenChange, account, onSaved }: AccFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [f, setF]     = useState({ ...BLANK_ACC });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setF(account ? {
      name: account.name, type: account.type,
      opening_balance: String(account.opening_balance), currency: account.currency,
    } : { ...BLANK_ACC });
  }, [open, account]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !f.name.trim()) { toast({ title: t("app.common.error"), description: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const row = {
        user_id: user.id, name: f.name.trim(), type: f.type,
        opening_balance: parseFloat(f.opening_balance) || 0, currency: f.currency,
      };
      const { error } = account
        ? await supabase.from("pp_accounts").update(row).eq("id", account.id)
        : await supabase.from("pp_accounts").insert(row);
      if (error) throw error;
      toast({ title: t("app.common.success") });
      onSaved(); onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("app.common.error"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-[24px]">
        <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">{account ? t("app.common.edit") : t("app.setup.newSource")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.forms.name")} *</Label>
            <Input value={f.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Main Bank" autoFocus className="rounded-xl bg-muted/20 border-none shadow-inner" />
          </div>
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.forms.type")}</Label>
            <Select value={f.type} onValueChange={v => set("type", v)}>
              <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-none shadow-inner"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {["cash", "bank", "credit", "ewallet"].map(k => <SelectItem key={k} value={k}>{t(`app.types.account.${k}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.forms.openingBalance")}</Label>
              <Input type="number" value={f.opening_balance} onChange={e => set("opening_balance", e.target.value)} className="rounded-xl bg-muted/20 border-none shadow-inner font-bold" />
            </div>
            <div className="space-y-1"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.forms.currency")}</Label>
              <Select value={f.currency} onValueChange={v => set("currency", v)}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-none shadow-inner font-bold"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">{["THB","USD","EUR","JPY","GBP"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase text-[10px]">{t("app.common.cancel")}</Button>
            <Button type="submit" disabled={saving} className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest">{saving ? t("app.common.save") + "..." : account ? t("app.common.update") : t("app.common.add")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Category Tree display ────────────────────────────────────────────────────
function CategoryTree({ categories, type, onEdit, onDelete, onAddSub }: {
  categories: PPCategory[];
  type: "income" | "expense";
  onEdit: (c: PPCategory) => void;
  onDelete: (id: string) => void;
  onAddSub: (parent: PPCategory) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const parents = categories.filter(c => c.type === type && !c.parent_id);
  const childrenOf = (id: string) => categories.filter(c => c.parent_id === id);

  if (!parents.length) return (<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-8 text-center opacity-40">{t("app.common.noData")}</p>);

  return (
    <div className="space-y-2">
      {parents.map(parent => {
        const subs = childrenOf(parent.id);
        const isExpanded = !!expanded[parent.id];
        return (
          <div key={parent.id}>
            <Card className="p-3 flex items-center justify-between gap-2 rounded-[20px] border-none shadow-sm ring-1 ring-border/50 bg-background group">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {subs.length > 0 && (<button onClick={() => toggle(parent.id)} className={cn("p-1.5 hover:bg-muted rounded-lg transition-transform duration-300", isExpanded && "rotate-90")}><ChevronRight size={14} className="text-muted-foreground" /></button>)}
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-inner" style={{ backgroundColor: (parent.color ?? "#888") + "15" }}>{parent.icon || "🏷️"}</span>
                <span className="truncate text-xs font-black uppercase tracking-tight" onClick={() => subs.length > 0 && toggle(parent.id)} style={{ cursor: subs.length > 0 ? "pointer" : "default" }}>{parent.name}</span>
                {subs.length > 0 && (<Badge variant="secondary" className="text-[8px] font-black uppercase h-5 px-1.5 shrink-0 opacity-60 bg-muted/50">{subs.length} units</Badge>)}
              </div>
              <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="h-8 px-2 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-xl transition-colors" onClick={() => onAddSub(parent)}>+ Sub</button>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => onEdit(parent)}><Pencil size={14} /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-500/10" onClick={() => onDelete(parent.id)}><Trash2 size={14} /></Button>
              </div>
            </Card>
            {isExpanded && subs.map(sub => (
              <Card key={sub.id} className="ml-10 mt-1.5 p-2.5 flex items-center justify-between gap-2 border-none shadow-sm ring-1 ring-border/30 bg-muted/10 rounded-[18px] group">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 bg-background/80 shadow-sm">{sub.icon || "🏷️"}</span>
                  <span className="truncate text-[11px] font-bold text-muted-foreground uppercase">{sub.name}</span>
                </div>
                <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => onEdit(sub)}><Pencil size={13} /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-500/10" onClick={() => onDelete(sub.id)}><Trash2 size={13} /></Button>
                </div>
              </Card>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function PersonAvatar({ person, onUpload, size = "md" }: { person: PPPerson; onUpload: (id: string, base64: string) => void; size?: "sm" | "md" | "lg" }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dim = size === "sm" ? "w-8 h-8" : size === "md" ? "w-11 h-11" : "w-20 h-20";
  const iconSize = size === "sm" ? 14 : size === "md" ? 20 : 32;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      onUpload(person.id, base64String);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn("relative group/avatar shrink-0 overflow-hidden rounded-[18px] lg:rounded-[22px] border border-white/20 shadow-sm transition-transform hover:scale-105 flex items-center justify-center text-white font-black", dim)} style={{ backgroundColor: !person.avatar_url ? (person.color || "#888") : "transparent" }}>
      {person.avatar_url ? (
        <img src={person.avatar_url} alt={person.name} className="w-full h-full object-cover" />
      ) : (
        <UserIcon size={iconSize} className="opacity-80" />
      )}
      <div 
        onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer z-20"
      >
        <Plus size={18} className="text-white" />
      </div>
      <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleFile} />
    </div>
  );
}

// ─── Main Setup Page ──────────────────────────────────────────────────────────
const Setup = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts]     = useState<PPAccount[]>([]);
  const [categories, setCategories] = useState<PPCategory[]>([]);
  const [people, setPeople]         = useState<PPPerson[]>([]);

  const [accFormOpen, setAccFormOpen] = useState(false);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [personFormOpen, setPersonFormOpen] = useState(false);
  const [editAcc, setEditAcc] = useState<PPAccount | null>(null);
  const [editCat, setEditCat] = useState<PPCategory | null>(null);
  const [editPerson, setEditPerson] = useState<PPPerson | null>(null);
  const [presetParent, setPresetParent] = useState<PPCategory | null>(null);

  const load = async () => {
    if (!user) return;
    const [a, c, p] = await Promise.all([
      supabase.from("pp_accounts").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("pp_categories").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("pp_people").select("*").eq("user_id", user.id).order("name"),
    ]);
    setAccounts((a.data as PPAccount[]) ?? []);
    setCategories((c.data as PPCategory[]) ?? []);
    setPeople((p.data as PPPerson[]) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const handleAvatarUpload = async (id: string, base64: string) => {
    try {
      const { error } = await supabase.from("pp_people").update({ avatar_url: base64 }).eq("id", id);
      if (error) throw error;
      toast({ title: t("app.common.success") });
      load();
    } catch (e: any) {
      toast({ title: t("app.common.error"), description: e.message, variant: "destructive" });
    }
  };

  const removeAccount = async (id: string) => {
    if (!confirm(t("app.common.confirm"))) return;
    const { error } = await supabase.from("pp_accounts").delete().eq("id", id);
    if (error) toast({ title: t("app.common.error"), description: error.message, variant: "destructive" });
    else { toast({ title: t("app.common.success") }); load(); }
  };

  const removeCategory = async (id: string) => {
    if (!confirm(t("app.common.confirm"))) return;
    const { error } = await supabase.from("pp_categories").delete().eq("id", id);
    if (error) toast({ title: t("app.common.error"), description: error.message, variant: "destructive" });
    else { toast({ title: t("app.common.success") }); load(); }
  };

  const removePerson = async (id: string) => {
    if (!confirm(t("app.common.confirm"))) return;
    const { error } = await supabase.from("pp_people").delete().eq("id", id);
    if (error) toast({ title: t("app.common.error"), description: error.message, variant: "destructive" });
    else { toast({ title: t("app.common.success") }); load(); }
  };

  const handleResetData = async () => {
    const confirmMsg = i18n.language === "th" 
      ? "คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทางการเงินทั้งหมด? การดำเนินการนี้ไม่สามารถย้อนกลับได้ (บัญชีผู้ใช้ของคุณจะยังอยู่)" 
      : "Are you sure you want to clear all your financial data? This will delete all transactions, assets, and budgets. Your account will remain active.";
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabase.rpc('reset_user_financial_data');
      if (error) throw error;

      toast({
        title: i18n.language === "th" ? "ล้างข้อมูลสำเร็จ" : "Data Reset Successful",
        description: i18n.language === "th" ? "ข้อมูลทางการเงินของคุณถูกลบแล้ว" : "All your financial records have been cleared.",
      });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAddSub = (parent: PPCategory) => { setPresetParent(parent); setEditCat(null); setCatFormOpen(true); };
  const handleOpenCatForm = (cat: PPCategory | null) => { setEditCat(cat); setPresetParent(null); setCatFormOpen(true); };

  const topLevelCats = categories.filter(c => !c.parent_id);
  const totalCats = categories.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div><h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter">{t("app.setup.title")}</h1><p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1 text-emerald-600/80">{t("app.setup.subtitle")}</p></div>
      </div>

      <Tabs defaultValue="accounts" className="w-full">
        <TabsList className="bg-muted/30 p-1 rounded-2xl h-11">
          <TabsTrigger value="accounts" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-lg">{t("app.setup.sources")} ({accounts.length})</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-lg">{t("app.setup.ledger")} ({totalCats})</TabsTrigger>
          <TabsTrigger value="people" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-lg">{t("app.setup.people")} ({people.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4 mt-6">
          <div className="flex justify-end"><Button size="sm" onClick={() => { setEditAcc(null); setAccFormOpen(true); }} className="rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"><Plus size={16} className="mr-1.5" /> {t("app.setup.newSource")}</Button></div>
          {accounts.length === 0 ? (<Card className="p-16 text-center border-none bg-muted/20 rounded-[48px]"><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">{t("app.common.noData")}</p></Card>) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map(a => (
                <Card key={a.id} className="p-5 flex items-center justify-between gap-4 rounded-[28px] border-none shadow-sm ring-1 ring-border/50 bg-background hover:shadow-md transition-all group">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1"><p className="font-black text-xs uppercase tracking-tight truncate">{a.name}</p><Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 opacity-60">{t(`app.types.account.${a.type}`)}</Badge></div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">{formatMoney(Number(a.opening_balance), a.currency)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" onClick={() => { setEditAcc(a); setAccFormOpen(true); }} className="h-9 w-9 rounded-xl hover:bg-primary/10"><Pencil size={15} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => removeAccount(a.id)} className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-500/10"><Trash2 size={15} /></Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-6 mt-6">
          <div className="flex justify-end"><Button size="sm" onClick={() => handleOpenCatForm(null)} className="rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"><Plus size={16} className="mr-1.5" /> {t("app.setup.newCategory")}</Button></div>
          <div className="space-y-8">
            {(["expense", "income"] as const).map(tType => {
              const hasCats = categories.some(c => c.type === tType);
              if (!hasCats) return null;
              return (
                <div key={tType}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 pl-1 opacity-60">{tType === "expense" ? t("app.setup.outflows") : t("app.setup.inflows")}</p>
                  <CategoryTree categories={categories} type={tType} onEdit={handleOpenCatForm} onDelete={removeCategory} onAddSub={handleAddSub} />
                </div>
              );
            })}
          </div>
          {categories.length === 0 && (<Card className="p-16 text-center border-none bg-muted/20 rounded-[48px]"><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">{t("app.common.noData")}</p></Card>)}
        </TabsContent>

        <TabsContent value="people" className="space-y-4 mt-6">
          <div className="flex justify-end"><Button size="sm" onClick={() => { setEditPerson(null); setPersonFormOpen(true); }} className="rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"><Plus size={16} className="mr-1.5" /> {t("app.setup.newContact")}</Button></div>
          {people.length === 0 ? (<Card className="p-16 text-center border-none bg-muted/20 rounded-[48px]"><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">{t("app.common.noData")}</p></Card>) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {people.map(p => (
                <Card key={p.id} className="p-5 flex items-center justify-between gap-4 rounded-[28px] border-none shadow-sm ring-1 ring-border/50 bg-background hover:shadow-md transition-all group">
                  <div className="flex items-center gap-3 min-w-0">
                    <PersonAvatar person={p} onUpload={handleAvatarUpload} />
                    <div className="min-w-0">
                      <p className="font-black text-xs uppercase tracking-tight truncate">{p.name}</p>
                      {p.nickname && <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60 tracking-widest mt-0.5 truncate">@{p.nickname}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" onClick={() => { setEditPerson(p); setPersonFormOpen(true); }} className="h-9 w-9 rounded-xl hover:bg-primary/10"><Pencil size={15} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => removePerson(p.id)} className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-500/10"><Trash2 size={15} /></Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AccountFormDialog open={accFormOpen} onOpenChange={setAccFormOpen} account={editAcc} onSaved={load} />
      <CategoryFormDialog open={catFormOpen} onOpenChange={v => { setCatFormOpen(v); if (!v) setPresetParent(null); }} category={editCat} presetParentId={presetParent?.id} parentOptions={topLevelCats} onSaved={load} />
      <PersonFormDialog open={personFormOpen} onOpenChange={setPersonFormOpen} person={editPerson} onSaved={load} />

      <section className="mt-20 pt-10 border-t border-border/40">
        <div className="max-w-2xl">
          <h2 className="text-lg font-bold text-rose-500 uppercase tracking-tight flex items-center gap-2 mb-4">
            <AlertTriangle size={18} />
            {i18n.language === "th" ? "เขตอันตราย" : "Danger Zone"}
          </h2>
          <Card className="p-6 border-rose-500/20 bg-rose-500/[0.02] rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-bold text-foreground">
                {i18n.language === "th" ? "ล้างข้อมูลแอป" : "Reset App Data"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {i18n.language === "th" 
                  ? "ลบข้อมูลธุรกรรม สินทรัพย์ และงบประมาณทั้งหมดของคุณ บัญชีผู้ใช้จะยังคงอยู่" 
                  : "Delete all your transactions, assets, and budgets. Your account will remain active."}
              </p>
            </div>
            <Button 
              variant="destructive" 
              onClick={handleResetData}
              className="rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-500/20 shrink-0"
            >
              <RefreshCcw size={16} className="mr-2" />
              {i18n.language === "th" ? "ล้างข้อมูลทั้งหมด" : "Clear All Data"}
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Setup;
