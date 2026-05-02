// Finalized stable version of Recurring with backfill logic and locking mechanism
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus, Pencil, Trash2, Zap, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Loader2, Calendar as CalendarIcon, AlertCircle, RefreshCw, X
} from "lucide-react";
import { format, addDays, addWeeks, addMonths, addYears, isBefore, isSameDay } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  formatMoney,
  type PPAccount, type PPCategory,
  type PPRecurring, type RecurringFrequency,
  fetchRecurring, upsertRecurring, deleteRecurring, bookRecurringNow,
  FREQUENCY_MONTHLY,
} from "@/lib/profitPlanner";

// ─── Book-Now Confirm Dialog ─────────────────────────────────────────────────
function BookNowDialog({ rec, accounts, onClose, onBooked }: { rec: PPRecurring | null; accounts: PPAccount[]; onClose: () => void; onBooked: () => void; }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (rec) setAmount(String(rec.amount)); }, [rec]);
  const handle = async () => {
    if (!user || !rec) return;
    if (!rec.account_id) { toast({ title: t("app.common.error"), description: "No account linked", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await bookRecurringNow(user.id, rec, date, parseFloat(amount) || rec.amount);
      toast({ title: t("app.common.success") });
      onBooked(); onClose();
    } catch (e: any) {
      toast({ title: t("app.common.error"), description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };
  
  const dateObj = useMemo(() => date ? new Date(date + "T00:00:00") : undefined, [date]);

  return (
    <Dialog open={!!rec} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-[32px] border-none shadow-2xl p-6">
        <DialogHeader><DialogTitle className="font-black uppercase tracking-tight flex items-center gap-2"><Zap size={20} className="text-primary" /> {t("app.recurring.bookNow")}</DialogTitle></DialogHeader>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">Confirming <span className="text-foreground font-black">{rec?.name}</span> for this period.</p>
        <div className="space-y-4 mt-6">
          <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.common.date")}</Label>
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" className="w-full h-11 justify-start text-left font-bold rounded-xl bg-muted/20 border-none shadow-inner px-3"><CalendarIcon className="mr-2 h-4 w-4 opacity-50" />{dateObj ? format(dateObj, "PPP") : <span>{t("app.common.date")}</span>}</Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="start"><Calendar mode="single" selected={dateObj} onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))} initialFocus className="rounded-2xl" /></PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.common.amount")}</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-black text-lg text-primary" /></div>
        </div>
        <DialogFooter className="mt-6 flex gap-2"><Button variant="ghost" onClick={onClose} className="rounded-xl font-bold uppercase text-[10px]">{t("app.common.discard")}</Button><Button onClick={handle} disabled={saving} className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest shadow-lg">{saving ? <Loader2 className="animate-spin" /> : t("app.recurring.bookNow")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Recurring Form Dialog ────────────────────────────────────────────────────
function RecurringForm({ open, onOpenChange, item, accounts, categories, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; item: PPRecurring | null; accounts: PPAccount[]; categories: PPCategory[]; onSaved: () => void; }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const blank = { name: "", type: "expense" as "income"|"expense", category_id: "none", account_id: "none", amount: "", currency: "THB", frequency: "monthly" as RecurringFrequency, start_date: format(new Date(), "yyyy-MM-dd"), end_date: "", note: "", is_active: true };
  const [f, setF] = useState(blank);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  
  useEffect(() => { 
    if (open) { 
      setF(item ? { 
        name: item.name, 
        type: item.type, 
        category_id: item.category_id ?? "none", 
        account_id: item.account_id ?? "none", 
        amount: String(item.amount), 
        currency: item.currency, 
        frequency: item.frequency, 
        start_date: item.start_date, 
        end_date: item.end_date ?? "", 
        note: item.note ?? "", 
        is_active: item.is_active 
      } : blank); 
    } 
  }, [open, item]);

  const filteredCats = useMemo(() => (categories || []).filter((c) => c.type === f.type), [categories, f.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return; const amt = parseFloat(f.amount);
    if (!f.name || isNaN(amt) || amt <= 0) { toast({ title: t("app.common.error"), description: "Name and amount required.", variant: "destructive" }); return; }
    
    setSaving(true);
    try {
      const payload: any = { 
        name: f.name.trim(), 
        type: f.type, 
        category_id: f.category_id === "none" ? null : f.category_id, 
        account_id: f.account_id === "none" ? null : f.account_id, 
        amount: amt, 
        currency: f.currency, 
        frequency: f.frequency, 
        start_date: f.start_date, 
        end_date: f.end_date || null, 
        note: f.note || null, 
        is_active: f.is_active 
      };

      if (payload.account_id) {
        const today = new Date(); today.setHours(23,59,59,999);
        let curr = new Date(f.start_date + "T00:00:00");
        const potentialDates = [];
        
        while (!isBefore(today, curr)) {
          potentialDates.push(new Date(curr));
          if (f.frequency === "daily") curr = addDays(curr, 1);
          else if (f.frequency === "weekly") curr = addWeeks(curr, 1);
          else if (f.frequency === "biweekly") curr = addWeeks(curr, 2);
          else if (f.frequency === "monthly") curr = addMonths(curr, 1);
          else if (f.frequency === "quarterly") curr = addMonths(curr, 3);
          else if (f.frequency === "biannual") curr = addMonths(curr, 6);
          else if (f.frequency === "yearly") curr = addYears(curr, 1);
          else break;
        }

        if (potentialDates.length > 0) {
          const minDateStr = format(potentialDates[0], "yyyy-MM-dd");
          const { data: existingTx } = await supabase
            .from("pp_transactions")
            .select("occurred_on, amount, note")
            .eq("user_id", user.id)
            .gte("occurred_on", minDateStr);

          const backfills = [];
          for (const d of potentialDates) {
            const dateStr = format(d, "yyyy-MM-dd");
            const monthPrefix = dateStr.slice(0, 7);
            
            const isDup = (existingTx || []).some(t => {
              const sameMonth = t.occurred_on.startsWith(monthPrefix);
              const sameAmount = Math.abs(Number(t.amount) - payload.amount) < 0.01;
              const noteLower = (t.note || "").toLowerCase();
              const nameLower = payload.name.toLowerCase();
              const nameMatch = noteLower.includes(nameLower) || nameLower.includes(noteLower);
              return sameMonth && sameAmount && nameMatch;
            });

            if (!isDup) {
              backfills.push({
                user_id: user.id,
                account_id: payload.account_id,
                category_id: payload.category_id,
                type: payload.type,
                amount: payload.amount,
                occurred_on: dateStr,
                note: `${payload.name} (Recurring)`,
              });
            }
          }

          if (backfills.length > 0) {
            await supabase.from("pp_transactions").insert(backfills);
          }
          payload.next_due = format(curr, "yyyy-MM-dd");
        }
      }

      await upsertRecurring(user.id, payload, item?.id);
      toast({ title: t("app.common.success") });
      onSaved(); onOpenChange(false);
    } catch (e: any) { toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); } finally { setSaving(false); }
  };

  const startDateObj = useMemo(() => f.start_date ? new Date(f.start_date + "T00:00:00") : undefined, [f.start_date]);
  const endDateObj = useMemo(() => f.end_date ? new Date(f.end_date + "T00:00:00") : undefined, [f.end_date]);
  const FREQUENCIES: RecurringFrequency[] = ["daily", "weekly", "biweekly", "monthly", "quarterly", "biannual", "yearly"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-[32px] border-none shadow-2xl p-0 gap-0">
        <DialogHeader className="p-6 pb-0"><DialogTitle className="font-black uppercase tracking-tight">{item ? t("app.common.edit") : t("app.recurring.newPlan")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-2 bg-muted/30 p-1 rounded-2xl">
            {(["expense", "income"] as const).map((tType) => (<Button type="button" key={tType} variant={f.type === tType ? "default" : "ghost"} onClick={() => { set("type", tType); set("category_id", "none"); }} className={cn("rounded-xl h-9 font-black uppercase text-[10px]", f.type === tType && "shadow-md")}>{t(`app.common.${tType}`)}</Button>))}
          </div>
          <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.common.name")} *</Label><Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Netflix, Rent" className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold" required /></div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.common.amount")}</Label><Input type="number" step="0.01" value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-black text-lg" required /></div>
             <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.common.currency")}</Label><Select value={f.currency} onValueChange={(v) => set("currency", v)}><SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{["THB","USD","EUR","JPY"].map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.common.type")}</Label><Select value={f.frequency} onValueChange={(v) => set("frequency", v as RecurringFrequency)}><SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-[10px] uppercase"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{FREQUENCIES.map(k => (<SelectItem key={k} value={k}>{t(`app.types.frequency.${k}`)}</SelectItem>))}</SelectContent></Select></div>
             <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.common.date")} *</Label>
                <Popover>
                  <PopoverTrigger asChild><Button variant="outline" className="w-full h-11 justify-start text-left font-bold rounded-xl bg-muted/20 border-none shadow-inner px-3"><CalendarIcon className="mr-2 h-4 w-4 opacity-50" />{startDateObj ? format(startDateObj, "PPP") : <span>{t("app.common.date")}</span>}</Button></PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="start"><Calendar mode="single" selected={startDateObj} onSelect={(d) => d && set("start_date", format(d, "yyyy-MM-dd"))} initialFocus className="rounded-2xl" /></PopoverContent>
                </Popover>
             </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">End Date <span className="opacity-50">(Optional)</span></Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 h-11 justify-start text-left font-bold rounded-xl bg-muted/20 border-none shadow-inner px-3">
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {endDateObj ? format(endDateObj, "PPP") : <span className="text-muted-foreground font-normal">{t("app.common.date")}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="start">
                  <Calendar mode="single" selected={endDateObj} onSelect={(d) => d && set("end_date", format(d, "yyyy-MM-dd"))} initialFocus className="rounded-2xl" />
                </PopoverContent>
              </Popover>
              {f.end_date && (
                <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-muted-foreground hover:text-rose-500 shrink-0" onClick={() => set("end_date", "")}>
                  <X size={14} />
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.common.category")}</Label><Select value={f.category_id} onValueChange={(v) => set("category_id", v)}><SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold"><SelectValue placeholder={t("app.common.all")} /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="none">{t("app.common.all")}</SelectItem>{filteredCats.map(c => (<SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>))}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.common.account")}</Label><Select value={f.account_id} onValueChange={(v) => set("account_id", v)}><SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold"><SelectValue placeholder={t("app.common.all")} /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="none">{t("app.common.all")}</SelectItem>{accounts.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent></Select></div>
          <div className="flex items-center justify-between py-2"><Label className="text-[10px] font-black uppercase tracking-widest opacity-60">{t("app.common.status")}</Label><Switch checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} /></div>
          <DialogFooter className="pt-2 bg-muted/10 -mx-6 -mb-6 p-6 border-t border-border/40 gap-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase text-[10px]">{t("app.common.discard")}</Button><Button type="submit" disabled={saving} className="rounded-xl px-8 font-black uppercase text-[11px] tracking-widest shadow-lg">{saving ? t("app.common.sync") + "..." : t("app.common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Recurring Page ───────────────────────────────────────────────────────────
const Recurring = () => {
  const { t } = useTranslation();
  const { user } = useAuth(); const { toast } = useToast();
  const [items, setItems] = useState<PPRecurring[]>([]);
  const [accounts, setAccounts] = useState<PPAccount[]>([]);
  const [categories, setCategories] = useState<PPCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<PPRecurring | null>(null);
  const [bookItem, setBookItem] = useState<PPRecurring | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [showInactive, setShowInactive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const catMap = useMemo(() => {
    try { return Object.fromEntries((categories || []).map((c) => [c.id, c])); } catch(e) { return {}; }
  }, [categories]);
  
  const accMap = useMemo(() => {
    try { return Object.fromEntries((accounts || []).map((a) => [a.id, a])); } catch(e) { return {}; }
  }, [accounts]);

  const load = async () => {
    if (!user) return; setLoading(true);
    try {
      const [a, c, r] = await Promise.all([
        supabase.from("pp_accounts").select("*").eq("user_id", user.id).order("name"),
        supabase.from("pp_categories").select("*").eq("user_id", user.id),
        fetchRecurring(user.id)
      ]);
      setAccounts((a.data ?? []) as PPAccount[]); 
      setCategories((c.data ?? []) as PPCategory[]); 
      setItems(r || []);
    } catch (e: any) { 
      toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); 
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  // AUTO-CREATOR logic kept as is...
  useEffect(() => {
    if (!user || items.length === 0 || loading || isProcessing) return;
    const processDue = async () => {
      const today = new Date(); today.setHours(23,59,59,999);
      const activeDue = items.filter(i => i.is_active && i.next_due && !isBefore(today, new Date(i.next_due + "T00:00:00")));
      if (activeDue.length === 0) return;
      setIsProcessing(true);
      for (const item of activeDue) {
        try {
          await bookRecurringNow(user.id, item, item.next_due!, item.amount);
          let nextD = new Date(item.next_due + "T00:00:00");
          if (item.frequency === "daily") nextD = addDays(nextD, 1);
          else if (item.frequency === "weekly") nextD = addWeeks(nextD, 1);
          else if (item.frequency === "biweekly") nextD = addWeeks(nextD, 2);
          else if (item.frequency === "monthly") nextD = addMonths(nextD, 1);
          else if (item.frequency === "quarterly") nextD = addMonths(nextD, 3);
          else if (item.frequency === "biannual") nextD = addMonths(nextD, 6);
          else if (item.frequency === "yearly") nextD = addYears(nextD, 1);
          await supabase.from("pp_recurring").update({ next_due: format(nextD, "yyyy-MM-dd") }).eq("id", item.id);
        } catch (e: any) {
          if (e.message.includes("detected") || e.message.includes("prevented")) {
             let nextD = new Date(item.next_due + "T00:00:00");
             if (item.frequency === "daily") nextD = addDays(nextD, 1);
             else if (item.frequency === "weekly") nextD = addWeeks(nextD, 1);
             else if (item.frequency === "biweekly") nextD = addWeeks(nextD, 2);
             else if (item.frequency === "monthly") nextD = addMonths(nextD, 1);
             else if (item.frequency === "quarterly") nextD = addMonths(nextD, 3);
             else if (item.frequency === "biannual") nextD = addMonths(nextD, 6);
             else if (item.frequency === "yearly") nextD = addYears(nextD, 1);
             await supabase.from("pp_recurring").update({ next_due: format(nextD, "yyyy-MM-dd") }).eq("id", item.id);
          }
        }
      }
      setIsProcessing(false);
      load();
    };
    processDue();
  }, [items, user, loading, isProcessing]);

  const active = useMemo(() => (items || []).filter(i => i.is_active), [items]);
  
  const monthlyInc = useMemo(() => 
    active.filter(i => i.type === "income").reduce((s, i) => s + (Number(i.amount || 0) * (FREQUENCY_MONTHLY[i.frequency] || 0)), 0)
  , [active]);

  const monthlyExp = useMemo(() => 
    active.filter(i => i.type === "expense").reduce((s, i) => s + (Number(i.amount || 0) * (FREQUENCY_MONTHLY[i.frequency] || 0)), 0)
  , [active]);

  const upcomingCount = useMemo(() => {
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const limit = new Date(); limit.setDate(limit.getDate() + 7); limit.setHours(23,59,59,999);
      return active.filter(i => { 
        if (!i.next_due) return false; 
        const d = new Date(i.next_due + "T00:00:00");
        return d >= today && d <= limit; 
      }).length;
    } catch(e) { return 0; }
  }, [active]);

  const filtered = useMemo(() => 
    (items || []).filter(i => (typeFilter === "all" || i.type === typeFilter) && (showInactive || i.is_active))
  , [items, typeFilter, showInactive]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap animate-in fade-in slide-in-from-top-4 duration-500">
        <div><h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter">{t("app.recurring.title")}</h1><p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">{t("app.recurring.subtitle")}</p></div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl h-11 px-4 font-black uppercase text-[10px] tracking-widest gap-2 bg-background shadow-sm" onClick={load}><RefreshCw size={14} className={cn(loading && "animate-spin")} /> {t("app.common.sync")}</Button>
          <Button onClick={() => { setEditItem(null); setFormOpen(true); }} className="rounded-2xl h-11 px-6 font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"><Plus size={18} className="mr-2" /> {t("app.recurring.newPlan")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t("app.common.income"), val: formatMoney(monthlyInc), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-500/10" },
          { label: t("app.common.expense"), val: formatMoney(monthlyExp), icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-500/10" },
          { label: t("app.recurring.netCashFlow"), val: formatMoney(monthlyInc - monthlyExp), icon: Zap, color: "text-primary", bg: "bg-primary/10" },
          { label: t("app.recurring.upcoming"), val: upcomingCount, icon: CalendarIcon, color: "text-amber-600", bg: "bg-amber-500/10" },
        ].map(s => (
          <Card key={s.label} className="p-5 border-none shadow-sm ring-1 ring-border/40 rounded-[28px] group hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-2"><p className="text-[9px] font-black uppercase tracking-widest opacity-40">{s.label}</p><div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shadow-inner", s.bg)}><s.icon size={14} className={s.color} /></div></div>
            <p className={cn("text-lg font-black tracking-tight", s.color)}>{s.val}</p>
          </Card>
        ))}
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-4 bg-muted/20 border-none shadow-sm ring-1 ring-border/40 rounded-[24px] backdrop-blur-sm">
        <div className="flex gap-1.5 p-1 bg-background/50 rounded-xl border border-border/40">
          {(["all", "income", "expense"] as const).map(tType => (<button key={tType} onClick={() => setTypeFilter(tType)} className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all", typeFilter === tType ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-muted")}>{t(`app.common.${tType}`)}</button>))}
        </div>
        <div className="flex items-center gap-3 ml-auto px-2"><Label className="text-[10px] font-black uppercase opacity-60">Show Paused</Label><Switch checked={showInactive} onCheckedChange={setShowInactive} /></div>
      </Card>

      {loading && items.length === 0 ? (<div className="py-24 text-center flex flex-col items-center gap-6"><div className="w-16 h-16 rounded-full border-8 border-primary/10 border-t-primary animate-spin shadow-2xl" /><p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground animate-pulse">{t("app.common.loading")}</p></div>) : filtered.length === 0 ? (
        <Card className="p-24 text-center border-none bg-background/50 backdrop-blur-sm ring-1 ring-border/40 rounded-[64px] shadow-sm"><div className="w-20 h-20 bg-primary/5 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-primary/10 shadow-inner text-primary opacity-30"><RefreshCw size={40} strokeWidth={1} /></div><p className="font-black text-2xl uppercase tracking-tighter mb-2 text-muted-foreground opacity-40 italic text-center">{t("app.common.noData")}</p></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(i => {
            const cat = i.category_id ? catMap[i.category_id] : null; const acc = i.account_id ? accMap[i.account_id] : null;
            const daysLeft = i.next_due ? Math.round((new Date(i.next_due + "T00:00:00").getTime() - Date.now()) / 86400000) : null;
            return (
              <Card key={i.id} className={cn("p-4 flex items-center gap-5 rounded-[32px] border-none shadow-sm ring-1 ring-border/40 bg-background hover:shadow-xl transition-all group overflow-hidden relative", !i.is_active && "opacity-60")}>
                <span className="w-14 h-14 rounded-[22px] flex items-center justify-center text-2xl shrink-0 shadow-inner border border-border/10" style={{ backgroundColor: (cat?.color ?? "#888") + "15", color: cat?.color ?? "#888" }}>{cat?.icon ?? (i.type === "income" ? "💰" : "💸")}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5"><p className="font-black text-xs uppercase tracking-tight truncate">{i.name}</p>{!i.is_active && <Badge variant="outline" className="text-[8px] font-black uppercase h-4">Paused</Badge>}{daysLeft !== null && daysLeft <= 3 && i.is_active && <Badge className="bg-rose-500 text-white text-[8px] font-black uppercase h-4 px-1.5 animate-pulse">Due {daysLeft <= 0 ? "Now" : `in ${daysLeft}d`}</Badge>}</div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 truncate">{t(`app.types.frequency.${i.frequency}`)} · {cat?.name || "Uncategorized"} · {acc?.name || "No Account"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn("text-lg font-black tracking-tighter", i.type === "income" ? "text-emerald-600" : "text-rose-600")}>{i.type === "income" ? "+" : "-"}{formatMoney(i.amount, i.currency)}</p>
                  <p className="text-[9px] font-black uppercase opacity-40 mt-0.5">/{i.frequency}</p>
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-primary/10" onClick={() => setBookItem(i)}><Zap size={15} /></Button>
                  <Button size="icon" variant="ghost" className="h-10 w-10 rounded-2xl hover:bg-primary/10 transition-colors shadow-sm border border-border/10" onClick={() => { setEditItem(i); setFormOpen(true); }}><Pencil size={18} /></Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-500/10" onClick={async () => { if(confirm("Delete?")) { await deleteRecurring(i.id); load(); } }}><Trash2 size={15} /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <RecurringForm open={formOpen} onOpenChange={setFormOpen} item={editItem} accounts={accounts} categories={categories} onSaved={load} />
      <BookNowDialog rec={bookItem} accounts={accounts} onClose={() => setBookItem(null)} onBooked={load} />
    </div>
  );
};

export default Recurring;
