import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import confetti from "canvas-confetti";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Users, Receipt, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatMoney, type PPAccount, type PPCategory, type PPTransaction, type TxType, type PPPerson } from "@/lib/profitPlanner";

const schema = z.object({
  type: z.enum(["income", "expense", "saving", "investment"]),
  amount: z.number().positive().max(9_999_999_999),
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  occurred_on: z.string().min(8),
  note: z.string().max(500).nullable(),
  debt_id: z.string().uuid().optional().nullable(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tx?: PPTransaction | null;
  accounts: PPAccount[];
  categories: PPCategory[];
  onSaved: () => void;
}

const fireCelebration = () => {
  const duration = 5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);
    const particleCount = 50 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);
};

function QuickAddSubDialog({ open, onOpenChange, parent, onAdded }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  parent: PPCategory | null; onAdded: (newId: string) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!user || !parent || !name.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("pp_categories").insert({
        user_id: user.id, name: name.trim(), type: parent.type,
        parent_id: parent.id, icon: parent.icon, color: parent.color,
      }).select("id").single();
      if (error) throw error;
      toast({ title: t("app.common.success") });
      onAdded(data.id); onOpenChange(false); setName("");
    } catch (e: any) { toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs rounded-2xl">
        <DialogHeader><DialogTitle className="text-sm font-black uppercase tracking-tight">{t("app.setup.newCategory")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("app.common.name")} autoFocus onKeyDown={e => e.key === "Enter" && submit()} className="rounded-xl h-10" />
          <Button className="w-full rounded-xl h-10 font-bold uppercase text-xs" onClick={submit} disabled={saving || !name.trim()}>{saving ? t("app.common.loading") : t("app.common.add")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const TransactionForm = ({ open, onOpenChange, tx, accounts, categories, onSaved }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [parentCatId, setParentCatId] = useState("");
  const [subCatId, setSubCatId] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  
  const [linkedDebt, setLinkedDebt] = useState<any>(null);
  const [actualPaidCount, setActualPaidCount] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  
  const [isSplit, setIsSplit] = useState(false);
  const [splitMode, setSplitMode] = useState<'percent' | 'amount'>('percent');
  const [people, setPeople] = useState<PPPerson[]>([]);
  const [splitParts, setSplitParticipants] = useState<Array<{ person_id: string | null; value: string }>>([{ person_id: null, value: '100' }]);

  const [saving, setSaving] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [pendingSubId, setPendingSubId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string>("");

  const loadPeople = async () => {
    if (!user) return;
    const { data } = await supabase.from("pp_people").select("*").eq("user_id", user.id).order("name");
    setPeople((data ?? []) as PPPerson[]);
  };

  useEffect(() => {
    if (!open) { setSessionKey(""); setLinkedDebt(null); setIsSplit(false); setSplitParticipants([{ person_id: null, value: '100' }]); return; }
    loadPeople();
    const currentKey = tx ? `edit-${tx.id}` : "new";
    if (sessionKey === currentKey) return;
    if (tx) {
      setType(tx.type); setAmount(String(tx.amount)); setAccountId(tx.account_id); setDate(tx.occurred_on); setNote(tx.note ?? "");
      const cat = categories.find(c => c.id === tx.category_id);
      if (cat?.parent_id) { setParentCatId(cat.parent_id); setSubCatId(cat.id); } else { setParentCatId(tx.category_id ?? ""); setSubCatId(""); }
      
      (async () => {
        const { data: split } = await supabase.from("pp_splits").select(`*, participants:pp_split_participants(*)`).eq("transaction_id", tx.id).maybeSingle();
        if (split) {
          setIsSplit(true);
          const firstPart = split.participants[0];
          const mode = firstPart?.mode || 'percent';
          setSplitMode(mode);
          setSplitParticipants(split.participants.map((p: any) => ({ person_id: p.person_id, value: String(p.value) })));
        }
      })();
    } else {
      setType("expense"); setAmount(""); setAccountId(accounts[0]?.id ?? ""); setDate(new Date().toISOString().slice(0, 10)); setNote(""); setParentCatId(""); setSubCatId("");
      setActualPaidCount(0); setSplitMode('percent'); setSplitParticipants([{ person_id: null, value: '100' }]);
    }
    setSessionKey(currentKey);
  }, [open, tx, accounts, categories, sessionKey]);

  const dateObj = useMemo(() => {
    if (!date) return undefined;
    const d = new Date(date + "T00:00:00");
    return isNaN(d.getTime()) ? undefined : d;
  }, [date]);

  useEffect(() => {
    if (pendingSubId && categories.some(c => c.id === pendingSubId)) { setSubCatId(pendingSubId); setPendingSubId(null); }
  }, [categories, pendingSubId]);

  useEffect(() => {
    const checkDebt = async () => {
      if (!subCatId) { setLinkedDebt(null); return; }
      const sub = categories.find(c => c.id === subCatId);
      if (!sub?.parent_id) { setLinkedDebt(null); return; }
      const parent = categories.find(c => c.id === sub.parent_id);
      if (parent?.name === "Debt Payment") {
        const { data: debt } = await supabase.from("pp_debts").select("*").eq("name", sub.name).eq("user_id", user?.id).maybeSingle();
        if (debt) { 
          const { count } = await supabase.from("pp_transactions").select("id", { count: 'exact', head: true }).eq("debt_id", debt.id);
          const paidCount = count ?? 0;
          setActualPaidCount(paidCount);
          setLinkedDebt(debt); 
          setSelectedPeriod(String(paidCount + 1)); 
          setAmount(prev => (!prev || (linkedDebt && prev === String(linkedDebt.monthly_payment))) ? String(debt.monthly_payment) : prev);
        } else { setLinkedDebt(null); setActualPaidCount(0); }
      } else { setLinkedDebt(null); setActualPaidCount(0); }
    };
    checkDebt();
  }, [subCatId, categories, user?.id]);

  const parentOptions = useMemo(() => categories.filter(c => c.type === type && !c.parent_id), [categories, type]);
  const subOptions    = useMemo(() => categories.filter(c => c.parent_id === parentCatId), [categories, parentCatId]);
  const selectedParent = useMemo(() => categories.find(c => c.id === parentCatId), [categories, parentCatId]);

  const totalAmount = parseFloat(amount) || 0;
  const splitStats = useMemo(() => {
    if (!isSplit) return { total: 0, remainder: 0, isValid: true };
    const sum = splitParts.reduce((s, p) => s + (parseFloat(p.value) || 0), 0);
    const target = splitMode === 'percent' ? 100 : totalAmount;
    const remainder = target - sum;
    const isValid = Math.abs(remainder) < 0.01;
    return { total: sum, remainder, isValid, target };
  }, [isSplit, splitParts, splitMode, totalAmount]);

  const addSplitPart = () => setSplitParticipants([...splitParts, { person_id: "", value: "0" }]);
  const removeSplitPart = (i: number) => setSplitParticipants(splitParts.filter((_, idx) => idx !== i));
  const updateSplitPart = (i: number, k: string, v: any) => {
    const next = [...splitParts]; (next[i] as any)[k] = v; setSplitParticipants(next);
  };

  const submit = async () => {
    if (!user || !accountId) return;
    const finalCatId = subCatId || parentCatId || null;
    const finalNote = linkedDebt ? `${linkedDebt.name} — Period ${selectedPeriod}${note ? ` (${note})` : ""}` : note;
    const amtNum = Number(amount);
    
    if (linkedDebt) {
      const r = (linkedDebt.annual_rate / 100 / 12);
      const interest = (linkedDebt.remaining_amount || 0) * r;
      const maxPayable = (linkedDebt.remaining_amount || 0) + interest;
      if (amtNum > maxPayable + 0.01) { toast({ title: t("app.common.error"), description: `Cannot exceed payoff: ${maxPayable.toFixed(2)}`, variant: "destructive" }); return; }
    }

    if (isSplit) {
      if (!splitStats.isValid) { 
        toast({ title: t("app.common.error"), description: `Total mismatch. Current diff: ${splitStats.remainder.toFixed(2)}`, variant: "destructive" }); 
        return; 
      }
      if (splitParts.some(p => p.person_id === "" && p.person_id !== null)) { toast({ title: t("app.common.error"), description: "Please select participants." }); return; }
    }

    const parsed = schema.safeParse({ type, amount: amtNum, account_id: accountId, category_id: finalCatId, occurred_on: date, note: finalNote.trim() || null, debt_id: linkedDebt?.id || null });
    if (!parsed.success) { toast({ title: t("app.common.error"), description: parsed.error.issues[0].message, variant: "destructive" }); return; }
    
    setSaving(true);
    try {
      const payload = { ...parsed.data, user_id: user.id };
      let diff = 0; if (tx && linkedDebt) diff = amtNum - Number(tx.amount);
      const { data: savedTx, error: txErr } = tx 
        ? await supabase.from("pp_transactions").update(payload).eq("id", tx.id).select().single()
        : await supabase.from("pp_transactions").insert(payload).select().single();
      if (txErr) throw txErr;

      if (isSplit) {
        const { data: split, error: sErr } = await supabase.from("pp_splits").upsert({ user_id: user.id, transaction_id: savedTx.id, note: finalNote.trim() || null }, { onConflict: 'transaction_id' }).select().single();
        if (sErr) throw sErr;
        const partRows = splitParts.map(p => ({
          split_id: split.id, person_id: p.person_id || null, mode: splitMode, value: parseFloat(p.value),
          actual_amount: splitMode === 'percent' ? (savedTx.amount * (parseFloat(p.value) / 100)) : parseFloat(p.value)
        }));
        await supabase.from("pp_split_participants").delete().eq("split_id", split.id);
        await supabase.from("pp_split_participants").insert(partRows);
      } else if (tx) { await supabase.from("pp_splits").delete().eq("transaction_id", tx.id); }

      if (linkedDebt) {
        const { data: d } = await supabase.from("pp_debts").select("remaining_amount, paid_months").eq("id", linkedDebt.id).single();
        if (d) {
          if (tx) await supabase.from("pp_debts").update({ remaining_amount: Math.max(0, d.remaining_amount - diff) }).eq("id", linkedDebt.id);
          else {
            const r = (linkedDebt.annual_rate / 100 / 12); const interest = (linkedDebt.remaining_amount || 0) * r;
            const principal = Math.min(amtNum - interest, linkedDebt.remaining_amount || 0);
            await supabase.from("pp_debts").update({ paid_months: (d.paid_months || 0) + 1, remaining_amount: Math.max(0, d.remaining_amount - principal), is_active: (d.remaining_amount - principal) > 0.01 }).eq("id", linkedDebt.id);
            if ((d.remaining_amount - principal) <= 0.01) fireCelebration();
          }
        }
      }
      toast({ title: t("app.common.success") }); onSaved(); onOpenChange(false);
    } catch (e: any) { toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); } finally { setSaving(false); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-[32px] border-none shadow-2xl overflow-hidden p-0">
          <DialogHeader className="p-6 pb-0"><DialogTitle className="text-xl font-black uppercase tracking-tight">{tx ? t("app.common.edit") : t("app.transactions.newEntry")}</DialogTitle></DialogHeader>
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 bg-muted/30 p-1 rounded-2xl">
              <Button type="button" variant={type === "expense" ? "default" : "ghost"} onClick={() => { setType("expense"); setParentCatId(""); setSubCatId(""); }} className={cn("rounded-xl h-9 font-black uppercase text-[10px]", type === "expense" && "shadow-md")}>{t("app.common.expense")}</Button>
              <Button type="button" variant={type === "income" ? "default" : "ghost"} onClick={() => { setType("income"); setParentCatId(""); setSubCatId(""); }} className={cn("rounded-xl h-9 font-black uppercase text-[10px]", type === "income" && "shadow-md")}>{t("app.common.income")}</Button>
              <Button type="button" variant={type === "saving" ? "default" : "ghost"} onClick={() => { setType("saving"); setParentCatId(""); setSubCatId(""); }} className={cn("rounded-xl h-9 font-black uppercase text-[10px]", type === "saving" && "shadow-md")}>{t("app.common.saving")}</Button>
              <Button type="button" variant={type === "investment" ? "default" : "ghost"} onClick={() => { setType("investment"); setParentCatId(""); setSubCatId(""); }} className={cn("rounded-xl h-9 font-black uppercase text-[10px]", type === "investment" && "shadow-md")}>{t("app.common.investment")}</Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.common.amount")}</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-base" /></div>
              <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.common.date")}</Label>
                <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full h-11 justify-start text-left font-bold rounded-xl bg-muted/20 border-none shadow-inner px-3", !date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4 opacity-50" />{dateObj ? format(dateObj, "PPP") : <span>{t("app.common.date")}</span>}</Button></PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="start"><Calendar mode="single" selected={dateObj} onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))} initialFocus className="rounded-2xl" /></PopoverContent></Popover>
              </div>
            </div>

            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.forms.source")}</Label>
              <Select value={accountId} onValueChange={setAccountId}><SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-medium text-xs"><SelectValue placeholder={t("app.forms.source")} /></SelectTrigger><SelectContent className="rounded-xl shadow-xl">{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
            </div>

            <div className="space-y-4 pt-1">
              <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.forms.category")}</Label>
                <Select value={parentCatId || "none"} onValueChange={(v) => { setParentCatId(v === "none" ? "" : v); setSubCatId(""); }}><SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-medium text-xs"><SelectValue placeholder={t("app.forms.category")} /></SelectTrigger><SelectContent className="rounded-xl shadow-xl"><SelectItem value="none">— {t("app.common.noData")} —</SelectItem>{parentOptions.map((c) => (<SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>))}</SelectContent></Select>
              </div>
              {(subOptions.length > 0 || parentCatId) && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-center px-1"><Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t("app.forms.subCategory")}</Label>{parentCatId && (<button type="button" onClick={() => setQuickAddOpen(true)} className="text-[9px] font-black uppercase text-primary hover:underline">+ {t("app.common.add")}</button>)}</div>
                  <Select value={subCatId || "none"} onValueChange={(v) => setSubCatId(v === "none" ? "" : v)}><SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none shadow-inner font-medium text-sm"><SelectValue placeholder={t("app.forms.subCategory")} /></SelectTrigger><SelectContent className="rounded-xl shadow-xl"><SelectItem value="none">— N/A —</SelectItem>{subOptions.map((c) => (<SelectItem key={c.id} value={c.id}>{c.icon || selectedParent?.icon} {c.name}</SelectItem>))}</SelectContent></Select>
                </div>
              )}
            </div>

            {type === "expense" && (
              <div className="pt-2">
                <div className={cn("flex items-center justify-between p-4 rounded-3xl border transition-all", isSplit ? "bg-primary/5 border-primary/20 shadow-inner" : "bg-muted/10 border-border/40")}>
                  <div className="flex items-center gap-3"><div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-colors", isSplit ? "bg-primary text-white" : "bg-primary/10 text-primary")}><Users size={20} /></div><div><p className="text-xs font-black uppercase tracking-tight">{t("app.forms.split")}</p><p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">{t("app.split.subtitle")}</p></div></div>
                  <Switch checked={isSplit} onCheckedChange={setIsSplit} />
                </div>
                {isSplit && (
                  <div className="mt-3 p-4 bg-muted/5 rounded-3xl border border-dashed border-primary/20 space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex flex-col"><Label className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Split Distribution</Label><p className={cn("text-[10px] font-black uppercase mt-0.5", splitStats.isValid ? "text-emerald-600" : "text-rose-500")}>{splitStats.isValid ? <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Fully Allocated</span> : <span className="flex items-center gap-1"><AlertCircle size={10} /> Remainder: {splitStats.remainder.toFixed(2)}{splitMode === 'percent' ? '%' : ''}</span>}</p></div>
                      <div className="flex gap-1.5 items-center">
                        <div className="flex p-0.5 bg-muted/20 rounded-lg border border-border/40">
                          <button type="button" onClick={() => setSplitMode('percent')} title="Split by Percentage" className={cn("px-2.5 py-1 rounded-md text-[8px] font-black uppercase transition-all", splitMode === 'percent' ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-muted/50")}>%</button>
                          <button type="button" onClick={() => setSplitMode('amount')} title="Split by Fixed Amount" className={cn("px-2.5 py-1 rounded-md text-[8px] font-black uppercase transition-all", splitMode === 'amount' ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-muted/50")}>Amt</button>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => {
                          const count = splitParts.length;
                          if (count === 0) return;
                          const target = splitMode === 'percent' ? 100 : (parseFloat(amount) || 0);
                          const even = (target / count).toFixed(2);
                          const last = (target - (parseFloat(even) * (count - 1))).toFixed(2);
                          setSplitParticipants(splitParts.map((p, idx) => ({ ...p, value: idx === count - 1 ? last : even })));
                        }} className="h-7 px-2 text-[8px] font-black uppercase text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/10">Equal</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={addSplitPart} className="h-7 px-2 text-[8px] font-black uppercase text-primary border border-primary/20">+ Add</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {splitParts.map((p, i) => (
                        <div key={i} className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2 duration-300">
                          <Select value={p.person_id || "self"} onValueChange={v => updateSplitPart(i, "person_id", v === "self" ? null : v)}>
                            <SelectTrigger className="h-9 rounded-xl bg-background border-none shadow-sm text-[10px] font-black flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl"><SelectItem value="self">Me (Self)</SelectItem>{people.map(pe => (<SelectItem key={pe.id} value={pe.id}>{pe.name}</SelectItem>))}</SelectContent>
                          </Select>
                          <div className="w-24 relative"><Input type="number" step="0.01" value={p.value} onChange={e => updateSplitPart(i, "value", e.target.value)} className="h-9 rounded-xl bg-background border-none shadow-sm font-black text-[10px] pr-6" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black opacity-40">{splitMode === 'percent' ? '%' : ''}</span></div>
                          {splitParts.length > 1 && <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-500 hover:bg-rose-500/10 rounded-xl" onClick={() => removeSplitPart(i)}><Trash2 size={14} /></Button>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {linkedDebt && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-3xl space-y-3 animate-in zoom-in-95 duration-500">
                <div className="flex justify-between items-center"><p className="text-[10px] font-black uppercase tracking-widest text-primary">Debt Service Mode</p><Badge variant="outline" className="text-[8px] h-4 font-black">{linkedDebt.type.replace('_', ' ')}</Badge></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><p className="text-[9px] font-black uppercase text-muted-foreground ml-1">Pay Period</p>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}><SelectTrigger className="h-8 rounded-lg bg-background text-[10px] font-bold"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl max-h-[200px]">{Array.from({ length: 24 }, (_, i) => actualPaidCount + 1 + i).map(p => (<SelectItem key={p} value={String(p)}>Installment {p}</SelectItem>))}</SelectContent></Select>
                  </div>
                  <div className="text-right space-y-1"><p className="text-[9px] font-black uppercase text-muted-foreground mr-1">Principal Due</p><p className="h-8 flex items-center justify-end font-black text-xs text-rose-600">{new Intl.NumberFormat().format(linkedDebt.remaining_amount || 0)}</p></div>
                </div>
              </div>
            )}
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.forms.note")}</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t("app.forms.note")} className="rounded-2xl bg-muted/20 border-none shadow-inner text-sm resize-none" /></div>
          </div>
          <DialogFooter className="p-6 bg-muted/10 border-t border-border/50 gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase text-[10px]">{t("app.common.discard")}</Button>
            <Button onClick={submit} disabled={saving || (isSplit && !splitStats.isValid)} className="rounded-xl px-10 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-primary/20">{saving ? <Loader2 className="animate-spin h-4 w-4" /> : t("app.forms.commit")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <QuickAddSubDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} parent={selectedParent ?? null} onAdded={(id) => { onSaved(); setPendingSubId(id); }} />
    </>
  );
};

export default TransactionForm;
