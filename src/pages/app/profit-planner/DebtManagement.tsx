import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus, Pencil, Trash2, Loader2,
  CreditCard, Home, Car, User, Package, ShoppingBag,
  AlertCircle, CheckCircle2, ChevronDown, Calendar as CalendarIcon
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { formatMoney, type PPAccount, type PPTransaction } from "@/lib/profitPlanner";
import confetti from "canvas-confetti";

// ─── Types ────────────────────────────────────────────────────────────────────
type DebtType = "credit_card" | "installment" | "mortgage" | "car" | "personal" | "other";
type PeriodStatus = "paid" | "overdue" | "future";

interface PPDebt {
  id: string;
  user_id: string;
  name: string;
  type: DebtType;
  lender: string | null;
  account_id: string | null;
  total_amount: number;
  remaining_amount: number;
  monthly_payment: number;
  annual_rate: number;
  start_date: string;
  due_day: number | null;
  total_months: number | null;
  paid_months: number;
  note: string | null;
  is_active: boolean;
  created_at: string;
}

interface AmortRow {
  period: number;
  dueDate: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  status: PeriodStatus;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DEBT_TYPES: { key: DebtType; icon: React.ElementType; color: string }[] = [
  { key: "credit_card",  icon: CreditCard,  color: "#ef4444" },
  { key: "mortgage",     icon: Home,        color: "#6366f1" },
  { key: "car",          icon: Car,         color: "#22c55e" },
  { key: "personal",     icon: User,        color: "#f59e0b" },
  { key: "installment",  icon: ShoppingBag, color: "#06b6d4" },
  { key: "other",        icon: Package,     color: "#9ca3af" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function fmtDate(iso: string, i18n: any) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(i18n.language, { day: "numeric", month: "short", year: "numeric" });
}

async function ensureDebtSubCategory(userId: string, debtName: string): Promise<string> {
  try {
    let parentId: string;
    const { data: parent } = await supabase.from("pp_categories").select("id").eq("user_id", userId).eq("name", "Debt Payment").is("parent_id", null).maybeSingle();
    if (parent?.id) { parentId = parent.id; } else {
      const { data: newParent, error: pErr } = await supabase.from("pp_categories").insert({ user_id: userId, name: "Debt Payment", type: "expense", icon: "💳", color: "#6366f1", sort_order: 99 }).select("id").single();
      if (pErr) throw pErr;
      parentId = newParent.id;
    }
    const { data: sub } = await supabase.from("pp_categories").select("id").eq("user_id", userId).eq("name", debtName).eq("parent_id", parentId).maybeSingle();
    if (sub?.id) return sub.id;
    const { data: newSub, error: sErr } = await supabase.from("pp_categories").insert({ user_id: userId, name: debtName, type: "expense", parent_id: parentId, icon: "📉", color: "#6366f1" }).select("id").single();
    if (sErr) throw sErr;
    return newSub.id;
  } catch (err) { throw err; }
}

function buildSchedule(debt: PPDebt, history: PPTransaction[] = [], max = 360): AmortRow[] {
  const { total_amount, annual_rate, monthly_payment, start_date, due_day } = debt;
  if (!total_amount || !monthly_payment) return [];
  const r = annual_rate / 100 / 12;
  let balance = total_amount;
  const [sy, sm] = start_date.split("-").map(Number);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const rows: AmortRow[] = [];
  
  for (let p = 1; p <= max; p++) {
    const interest  = r > 0 ? balance * r : 0;
    const principal = Math.min(monthly_payment - interest, balance);
    const targetMonthIndex = sm - 1 + (p - 1);
    
    const dd = new Date(sy, targetMonthIndex, due_day || 1);
    const intendedMonth = (targetMonthIndex % 12 + 12) % 12;
    if (dd.getMonth() !== intendedMonth) dd.setDate(0);
    
    const dueDate = format(dd, "yyyy-MM-dd");
    
    let status: PeriodStatus;
    if (p <= history.length) status = "paid";
    else if (dd < today) status = "overdue";
    else status = "future";

    rows.push({ 
      period: p, 
      dueDate, 
      payment: Math.round((principal + interest) * 100) / 100, 
      principal: Math.round(principal * 100) / 100, 
      interest: Math.round(interest * 100) / 100, 
      balance: Math.round(Math.max(0, balance - principal) * 100) / 100, 
      status 
    });
    
    balance = Math.max(0, balance - principal);
    if (balance <= 0.01) break;
    if (debt.total_months && p >= debt.total_months) break;
  }
  return rows;
}

// ─── Sub-Components ──────────────────────────────────────────────────────────
function PayModal({ debt, rows, onClose, onPaid }: { debt: PPDebt; rows: AmortRow[]; onClose: () => void; onPaid: () => void; }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth(); const { toast } = useToast(); const [saving, setSaving] = useState(false); const dt = DEBT_TYPES.find(t => t.key === debt.type)!;
  const actionable = useMemo(() => { const overdue = rows.filter(r => r.status === "overdue"); const next = rows.find(r => r.status === "future"); return next ? [...overdue, next] : overdue; }, [rows]);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(actionable[0]?.period ?? rows.find(r => r.status !== "paid")?.period ?? 1);
  const selectedRow = rows.find(r => r.period === selectedPeriod);
  const [customAmount, setCustomAmount] = useState<string>("");
  const payAmount = parseFloat(customAmount) || selectedRow?.payment || 0;
  const extraPrincipal = selectedRow ? Math.max(0, payAmount - selectedRow.payment) : 0;
  const handlePay = async () => {
    if (!user || !selectedRow || !debt.account_id) return; setSaving(true);
    try {
      const catId = await ensureDebtSubCategory(user.id, debt.name);
      const principalPaid = selectedRow.principal + extraPrincipal;
      await supabase.from("pp_transactions").insert({ user_id: user.id, account_id: debt.account_id, category_id: catId, debt_id: debt.id, type: "expense", amount: payAmount, occurred_on: selectedRow.dueDate, note: `${debt.name} — Period ${selectedRow.period}${extraPrincipal > 0 ? ` (+${formatMoney(extraPrincipal)})` : ""}` });
      const newRemaining = Math.max(0, debt.remaining_amount - principalPaid);
      await supabase.from("pp_debts").update({ paid_months: debt.paid_months + 1, remaining_amount: newRemaining, is_active: newRemaining > 0.01 }).eq("id", debt.id);
      if (newRemaining <= 0.01) fireCelebration(); toast({ title: t("app.common.success") }); onPaid(); onClose();
    } catch (e: any) { toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); } finally { setSaving(false); }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-[24px] p-6">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-base font-black uppercase tracking-tight"><dt.icon size={18} style={{ color: dt.color }} />{t("app.debt.makePayment")} — {debt.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("app.common.status")}</Label>
            <Select value={String(selectedPeriod)} onValueChange={v => { setSelectedPeriod(Number(v)); setCustomAmount(""); }}><SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{actionable.map(r => (<SelectItem key={r.period} value={String(r.period)}><span className="flex items-center gap-2 font-medium">{r.status === "overdue" ? "⚠️" : "⏰"} Period {r.period} — {fmtDate(r.dueDate, i18n)}</span></SelectItem>))}</SelectContent></Select>
          </div>
          {selectedRow && (
            <div className="bg-muted/40 rounded-2xl p-4 space-y-2 text-[11px] border border-border/50">
              <div className="flex justify-between font-medium"><span>Normal Payment</span><span>{formatMoney(selectedRow.payment)}</span></div>
              <div className="flex justify-between opacity-70"><span>Principal</span><span>{formatMoney(selectedRow.principal)}</span></div>
              <div className="flex justify-between opacity-70"><span>Interest</span><span>{formatMoney(selectedRow.interest)}</span></div>
              <div className="pt-2 mt-2 border-t border-border/50 flex justify-between font-black"><span className="text-muted-foreground">{t("app.debt.remaining")}</span><span className="text-rose-500">{formatMoney(Math.max(0, debt.remaining_amount - selectedRow.principal))}</span></div>
            </div>
          )}
          <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("app.common.amount")}</Label><Input type="number" step="0.01" value={customAmount} placeholder={String(selectedRow?.payment ?? "")} onChange={e => setCustomAmount(e.target.value)} className="rounded-xl h-10 font-bold" /></div>
        </div>
        <DialogFooter className="gap-2"><Button variant="ghost" onClick={onClose} className="rounded-xl font-bold uppercase text-[10px]">{t("app.common.cancel")}</Button><Button onClick={handlePay} disabled={saving || !debt.account_id || !selectedRow} className="rounded-xl font-black uppercase text-[10px] px-6" style={{ backgroundColor: dt.color, border: "none" }}>{t("app.common.confirm")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPaymentModal({ tx, debt, open, onClose, onSaved }: { tx: PPTransaction; debt: PPDebt; open: boolean; onClose: () => void; onSaved: () => void; }) {
  const { t } = useTranslation();
  const { toast } = useToast(); const [amount, setAmount] = useState(String(tx.amount)); const [date, setDate] = useState(tx.occurred_on); const [note, setNote] = useState(tx.note ?? ""); const [saving, setSaving] = useState(false);
  const submit = async () => {
    const newAmt = parseFloat(amount); if (isNaN(newAmt) || newAmt <= 0) return; setSaving(true);
    try {
      const diff = newAmt - Number(tx.amount);
      await supabase.from("pp_transactions").update({ amount: newAmt, occurred_on: date, note: note.trim() || null }).eq("id", tx.id);
      const { data: d } = await supabase.from("pp_debts").select("remaining_amount").eq("id", debt.id).single();
      if (d) { await supabase.from("pp_debts").update({ remaining_amount: Math.max(0, d.remaining_amount - diff) }).eq("id", debt.id); }
      toast({ title: t("app.common.success") }); onSaved(); onClose();
    } catch (e: any) { toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xs rounded-2xl p-6">
        <DialogHeader><DialogTitle className="text-sm font-black uppercase tracking-tight text-center">{t("app.common.edit")}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.common.amount")}</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-10 rounded-xl font-bold" /></div>
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.common.date")}</Label>
            <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full h-10 justify-start text-left font-bold rounded-xl bg-muted/20 border-none shadow-inner px-3"><CalendarIcon className="mr-2 h-4 w-4 opacity-50" />{date ? format(new Date(date + "T00:00:00"), "PPP") : <span>{t("app.common.date")}</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="start"><Calendar mode="single" selected={date ? new Date(date + "T00:00:00") : undefined} onSelect={d => d && setDate(format(d, "yyyy-MM-dd"))} initialFocus className="rounded-2xl" /></PopoverContent></Popover>
          </div>
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t("app.common.note")}</Label><Input value={note} onChange={e => setNote(e.target.value)} className="h-10 rounded-xl" /></div>
          <Button className="w-full mt-2 rounded-xl font-black uppercase text-[10px]" onClick={submit} disabled={saving}>{t("app.common.save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleModal({ debt, onClose, onPayClick, onRefresh }: { debt: PPDebt; onClose: () => void; onPayClick: () => void; onRefresh: () => void; }) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<"schedule" | "history">("schedule");
  const [history, setHistory] = useState<PPTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingTx, setEditingTx] = useState<PPTransaction | null>(null);
  const [showCount, setShowCount] = useState(12);
  const { toast } = useToast();
  
  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase.from("pp_transactions").select("*").eq("debt_id", debt.id).order("occurred_on", { ascending: false });
    setHistory((data ?? []) as PPTransaction[]); setLoadingHistory(false);
  };
  
  useEffect(() => { loadHistory(); }, [debt.id]);

  const deleteTx = async (tx: PPTransaction) => {
    if (!confirm(t("app.common.confirm"))) return;
    try {
      await supabase.from("pp_transactions").delete().eq("id", tx.id);
      const { data: d } = await supabase.from("pp_debts").select("paid_months, remaining_amount").eq("id", debt.id).single();
      if (d) {
        await supabase.from("pp_debts").update({ 
          paid_months: Math.max(0, d.paid_months - 1), 
          remaining_amount: d.remaining_amount + Number(tx.amount),
          is_active: true
        }).eq("id", debt.id);
      }
      toast({ title: t("app.common.success") }); loadHistory(); onRefresh();
    } catch (e: any) { toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); }
  };

  const rows = useMemo(() => buildSchedule(debt, history), [debt, history]);
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
  const dt = DEBT_TYPES.find(t => t.key === debt.type)!;
  const visible  = rows.slice(0, showCount);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] h-[85vh] md:h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[24px] md:rounded-[32px] border-none shadow-2xl">
        <div className="p-4 md:p-6 border-b border-border/50 shrink-0 bg-background" style={{ borderTop: `6px solid ${dt.color}` }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-5 gap-4">
            <div className="flex items-center gap-3"><div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: dt.color + "15", color: dt.color }}><dt.icon size={18} strokeWidth={3} /></div><h2 className="text-lg md:text-xl font-black uppercase tracking-tight truncate">{debt.name}</h2></div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
              <div className="bg-muted/50 p-1 rounded-xl flex border border-border/50 shrink-0"><button onClick={() => setTab("schedule")} className={`px-3 md:px-4 py-1 md:py-1.5 text-[9px] md:text-[10px] font-black uppercase rounded-lg transition-all ${tab === "schedule" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}>{t("app.debt.schedule")}</button><button onClick={() => setTab("history")} className={`px-3 md:px-4 py-1 md:py-1.5 text-[9px] md:text-[10px] font-black uppercase rounded-lg transition-all ${tab === "history" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}>{t("app.debt.history")}</button></div>
              <Button size="sm" onClick={onPayClick} className="h-8 md:h-10 px-4 md:px-6 rounded-xl font-black uppercase text-[9px] md:text-[10px] shadow-lg shrink-0" style={{ backgroundColor: dt.color, border: "none" }}>{t("app.debt.makePayment")}</Button>
            </div>
          </div>
          {tab === "schedule" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {[ { l: t("app.debt.remaining"), v: formatMoney(debt.remaining_amount), c: "text-rose-500" }, { l: t("app.recurring.monthlyBurn"), v: formatMoney(debt.monthly_payment), c: "" }, { l: "Terms", v: `${rows.length} Total`, c: "" }, { l: "Est. Interest", v: formatMoney(totalInterest), c: "text-amber-600" } ].map(s => (
                <div key={s.l} className="bg-muted/20 border border-border/30 rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-2.5"><p className="text-[7px] md:text-[8px] font-black text-muted-foreground uppercase mb-0.5">{s.l}</p><p className={`text-[10px] md:text-xs font-black truncate ${s.c}`}>{s.v}</p></div>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-hidden flex flex-col bg-muted/5">
          {tab === "schedule" ? (
            <div className="flex-1 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] md:text-[11px] whitespace-nowrap">
                  <thead className="sticky top-0 bg-background border-b border-border z-10"><tr className="bg-muted/30">{["#",t("app.common.date"),t("app.debt.makePayment"),"Principal","Interest",t("app.debt.remaining"),t("app.common.status")].map(h => (<th key={h} className="py-3 px-3 md:px-4 text-left font-black text-muted-foreground uppercase tracking-widest text-[8px] md:text-[9px]">{h}</th>))}</tr></thead>
                  <tbody className="divide-y divide-border/30">
                    {visible.map(row => (
                      <tr key={row.period} className={`transition-colors ${row.status === "paid" ? "bg-emerald-50/10" : row.status === "overdue" ? "bg-rose-50/10" : ""}`}>
                        <td className="py-2.5 px-3 md:px-4 font-mono font-bold opacity-50">{row.period}</td><td className="py-2.5 px-3 md:px-4 font-bold uppercase tracking-tight">{fmtDate(row.dueDate, i18n)}</td><td className="py-2.5 px-3 md:px-4 font-mono font-black">{formatMoney(row.payment)}</td><td className="py-2.5 px-3 md:px-4 font-mono font-bold text-primary">{formatMoney(row.principal)}</td><td className="py-2.5 px-3 md:px-4 font-mono font-bold text-amber-600">{formatMoney(row.interest)}</td><td className={`py-2.5 px-3 md:px-4 font-mono font-black ${row.balance < 1 ? "text-emerald-600" : "text-rose-500"}`}>{row.balance < 1 ? t("app.debt.cleared").toUpperCase() : formatMoney(row.balance)}</td><td className="py-2.5 px-3 md:px-4">{row.status === "paid" ? <Badge className="bg-emerald-500 text-white px-1.5 h-3.5 text-[8px] font-black">{t("app.debt.repaid").toUpperCase()}</Badge> : row.status === "overdue" ? <Badge className="bg-rose-500 text-white px-1.5 h-3.5 text-[8px] font-black animate-pulse">{t("app.debt.overdue").toUpperCase()}</Badge> : null}</td>
                      </tr>
                    ))}
                    {debt.remaining_amount <= 0.01 && (<tr><td colSpan={7} className="py-8 text-center bg-emerald-500/5"><div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2"><CheckCircle2 size={20} strokeWidth={3} /></div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">{t("app.debt.cleared")}</p></div></td></tr>)}
                  </tbody>
                </table>
              </div>
              {rows.length > showCount && (<button onClick={() => setShowCount(c => c + 12)} className="w-full py-4 text-[9px] md:text-[10px] font-black uppercase text-muted-foreground hover:text-foreground border-t border-border transition-all">Show More</button>)}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
              {loadingHistory ? (<div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>) : history.length === 0 ? (<div className="text-center py-12 opacity-50"><p className="text-[10px] font-black uppercase tracking-widest">{t("app.common.noData")}</p></div>) : (
                <div className="grid gap-2">{history.map(tx => (<div key={tx.id} className="flex items-center justify-between p-3 md:p-4 rounded-2xl md:rounded-[24px] border border-border/50 bg-background shadow-sm hover:shadow-md transition-all"><div className="min-w-0 flex-1"><p className="text-sm md:text-base font-black tracking-tight">{formatMoney(tx.amount)}</p><p className="text-[8px] md:text-[9px] font-black text-muted-foreground uppercase mt-0.5 tracking-widest truncate">{fmtDate(tx.occurred_on, i18n)} · {tx.note}</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" className="h-8 w-8 md:h-10 md:w-10 rounded-xl md:rounded-2xl hover:bg-primary/10 transition-colors" onClick={() => setEditingTx(tx)}><Pencil size={14} /></Button><Button size="icon" variant="ghost" className="h-8 w-8 md:h-10 md:w-10 rounded-xl md:rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-colors" onClick={() => deleteTx(tx)}><Trash2 size={14} /></Button></div></div>))}</div>
              )}
            </div>
          )}
        </div>
        {editingTx && <EditPaymentModal tx={editingTx} debt={debt} open={!!editingTx} onClose={() => setEditingTx(null)} onSaved={() => { loadHistory(); onRefresh(); }} />}
      </DialogContent>
    </Dialog>
  );
}

// ─── Summary Component ───────────────────────────────────────────────────────
function DebtSummary({ debts }: { debts: PPDebt[] }) {
  const { t } = useTranslation();
  const active   = debts.filter(d => d.is_active);
  const total    = active.reduce((s, d) => s + d.total_amount, 0);
  const left     = active.reduce((s, d) => s + d.remaining_amount, 0);
  const paid     = total - left;
  const monthly  = active.reduce((s, d) => s + d.monthly_payment, 0);
  const pct      = total > 0 ? (paid / total) * 100 : 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[ { l: t("app.debt.exposure"), v: formatMoney(total), s: `${active.length} active`, c: "" }, { l: t("app.debt.remaining"), v: formatMoney(left), s: `${pct.toFixed(0)}% Repaid`, c: "text-rose-600" }, { l: t("app.debt.principalPaid"), v: formatMoney(paid), s: "Reduction", c: "text-emerald-600" }, { l: t("app.debt.monthlyBurn"), v: formatMoney(monthly), s: "Req. Pay", c: "text-amber-600" } ].map(s => (
          <Card key={s.l} className="p-3 lg:p-5 border-none shadow-sm ring-1 ring-border/40 rounded-2xl lg:rounded-3xl bg-background hover:shadow-md transition-shadow"><p className="text-[8px] lg:text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 lg:mb-1.5 opacity-70">{s.l}</p><p className="text-sm lg:text-xl font-black tracking-tight leading-none lg:leading-normal truncate overflow-hidden" title={s.v}>{s.v}</p><p className="text-[8px] lg:text-[9px] font-bold text-muted-foreground mt-1 lg:mt-1.5 uppercase tracking-tighter">{s.s}</p></Card>
        ))}
      </div>
      <Card className="p-4 lg:p-6 border-none shadow-sm ring-1 ring-border/40 rounded-[24px] lg:rounded-[32px] bg-background"><div className="flex justify-between items-end mb-4"><div><p className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{t("app.debt.progress")}</p><p className="text-xl lg:text-2xl font-black text-emerald-600 tracking-tighter">{pct.toFixed(1)}%</p></div><div className="text-right text-[8px] lg:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{formatMoney(paid)} / {formatMoney(total)}</div></div><Progress value={pct} className="h-2 lg:h-3 rounded-full bg-emerald-50 dark:bg-emerald-950/20 [&>div]:bg-emerald-500 shadow-inner" /></Card>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
const BLANK = { name: "", type: "personal" as DebtType, lender: "", account_id: "", total_amount: "", remaining_amount: "", monthly_payment: "", annual_rate: "", start_date: new Date().toISOString().slice(0,10), due_day: "", total_months: "", paid_months: "0", note: "", is_active: true };

function DebtForm({ open, onOpenChange, item, accounts, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; item: PPDebt | null; accounts: PPAccount[]; onSaved: () => void; }) {
  const { t } = useTranslation();
  const { user } = useAuth(); const { toast } = useToast(); const [f, setF] = useState({ ...BLANK }); const [saving, setSaving] = useState(false); const [triedSubmit, setTriedSubmit] = useState(false);
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  useEffect(() => {
    if (!open) { setTriedSubmit(false); return; }
    setF(item ? { name: item.name, type: item.type, lender: item.lender ?? "", account_id: item.account_id ?? "", total_amount: String(item.total_amount), remaining_amount: String(item.remaining_amount), monthly_payment: String(item.monthly_payment), annual_rate: String(item.annual_rate), start_date: item.start_date, due_day: String(item.due_day ?? ""), total_months: String(item.total_months ?? ""), paid_months: String(item.paid_months), note: item.note ?? "", is_active: item.is_active } : { ...BLANK });
  }, [open, item]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return; setTriedSubmit(true);
    const total = parseFloat(f.total_amount), remaining = parseFloat(f.remaining_amount), monthly = parseFloat(f.monthly_payment);
    if (!f.name || isNaN(total) || isNaN(remaining) || isNaN(monthly)) { toast({ title: t("app.common.error"), variant: "destructive" }); return; }
    setSaving(true);
    try {
      const row = { user_id: user.id, name: f.name.trim(), type: f.type, lender: f.lender || null, account_id: f.account_id || null, total_amount: total, remaining_amount: remaining, monthly_payment: monthly, annual_rate: parseFloat(f.annual_rate) || 0, start_date: f.start_date, due_day: f.due_day ? parseInt(f.due_day) : null, total_months: f.total_months ? parseInt(f.total_months) : null, paid_months: parseInt(f.paid_months) || 0, note: f.note || null, is_active: f.is_active };
      const { data: newDebt, error } = item 
        ? await supabase.from("pp_debts").update(row).eq("id", item.id).select().single() 
        : await supabase.from("pp_debts").insert(row).select().single();
      
      if (error) throw error;
      const catId = await ensureDebtSubCategory(user.id, row.name);
      if (!item && row.paid_months > 0 && row.account_id) {
        const inserts = [];
        const [sy, sm] = row.start_date.split("-").map(Number);
        for (let i = 1; i <= row.paid_months; i++) {
          const d = new Date(sy, sm - 1 + (i - 1), row.due_day || 1);
          if (d.getMonth() !== (sm - 1 + (i - 1)) % 12) d.setDate(0);
          inserts.push({ user_id: user.id, account_id: row.account_id, category_id: catId, debt_id: newDebt.id, type: "expense", amount: row.monthly_payment, occurred_on: format(d, "yyyy-MM-dd"), note: `${row.name} — Initial History (Period ${i})`, });
        }
        await supabase.from("pp_transactions").insert(inserts);
      }
      toast({ title: t("app.common.success") }); onSaved(); onOpenChange(false);
    } catch (e: any) { toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); } finally { setSaving(false); }
  };
  const Field = (label: string, key: string, type = "text", placeholder = "", required = false) => {
    const val = (f as any)[key]; const isError = triedSubmit && required && (!val || (type === "number" && isNaN(parseFloat(val))));
    if (type === "date") { 
      const dObj = val ? new Date(val + "T00:00:00") : undefined;
      const isValid = dObj && !isNaN(dObj.getTime());
      return (
      <div className="space-y-1"><Label className={`text-[9px] font-black uppercase tracking-widest ${isError ? "text-rose-500" : "text-muted-foreground"}`}>{label} {required && "*"}</Label>
        <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full h-10 justify-start text-left font-bold rounded-xl bg-muted/20 border-none shadow-inner px-3", !val && "text-muted-foreground", isError && "ring-2 ring-rose-500")}><CalendarIcon className="mr-2 h-4 w-4 opacity-50" />{isValid ? format(dObj, "PPP") : <span>{t("app.common.date")}</span>}</Button></PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="start"><Calendar mode="single" selected={isValid ? dObj : undefined} onSelect={d => d && set(key, format(d, "yyyy-MM-dd"))} initialFocus className="rounded-2xl" /></PopoverContent></Popover>
      </div>
    ); }
    return (<div className="space-y-1"><Label className={`text-[9px] font-black uppercase tracking-widest ${isError ? "text-rose-500" : "text-muted-foreground"}`}>{label} {required && "*"}</Label><Input type={type} value={val} placeholder={placeholder} onChange={e => set(key, e.target.value)} className={`h-10 rounded-xl bg-muted/20 border-none shadow-inner ${isError ? "ring-2 ring-rose-500" : ""}`} /></div>);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto rounded-[24px] md:rounded-[32px] border-none shadow-2xl p-6 md:p-8">
        <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tighter text-center">{item ? t("app.common.edit") : t("app.debt.newLoan")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-6 mt-4">
          <div className="space-y-2.5"><Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">{t("app.common.category")}</Label><div className="flex flex-wrap gap-2">{DEBT_TYPES.map(tType => (<button type="button" key={tType.key} onClick={() => set("type", tType.key)} className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase transition-all shadow-sm ${f.type === tType.key ? "text-white scale-105" : "bg-muted/30 text-muted-foreground"}`} style={f.type === tType.key ? { backgroundColor: tType.color } : {}}><tType.icon size={14} />{t(`app.types.debt.${tType.key}`)}</button>))}</div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="md:col-span-2">{Field(t("app.common.name"), "name", "text", "e.g. Home Loan", true)}</div>{Field("Institution", "lender", "text", "e.g. JPMorgan")}{Field("APR %", "annual_rate", "number", "4.25")}{Field("Principal", "total_amount", "number", "0.00", true)}{Field("Balance", "remaining_amount", "number", "0.00", true)}{Field("Monthly Due", "monthly_payment", "number", "0.00", true)}{Field("Tenor", "total_months", "number", "360")}{Field("Completed", "paid_months", "number", "0")}{Field("Agreement Date", "start_date", "date")}{Field("Billing Day", "due_day", "number", "01")}</div>
          <div className="space-y-2"><Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">{t("app.common.account")}</Label><Select value={f.account_id || "none"} onValueChange={v => set("account_id", v === "none" ? "" : v)}><SelectTrigger className="h-10 rounded-xl bg-muted/20 border-none shadow-inner"><SelectValue placeholder={t("app.common.account")} /></SelectTrigger><SelectContent className="rounded-xl">{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}<SelectItem value="none">Manual Pay</SelectItem></SelectContent></Select></div>
          <div className="flex items-center justify-between bg-muted/10 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-border/30"><div><Label className="text-xs font-black uppercase tracking-widest">{t("app.common.status")}</Label></div><Switch checked={f.is_active} onCheckedChange={v => set("is_active", v)} /></div>
          <DialogFooter className="gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl md:rounded-2xl font-black uppercase text-[10px]">{t("app.common.discard")}</Button><Button type="submit" disabled={saving} className="rounded-xl md:rounded-2xl h-11 md:h-12 px-8 md:px-10 font-black uppercase text-[10px] md:text-[11px] tracking-widest" style={{ backgroundColor: DEBT_TYPES.find(tType => tType.key === f.type)?.color }}>{saving ? <Loader2 size={16} className="animate-spin" /> : item ? t("app.common.update") : t("app.common.add")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Card ───────────────────────────────────────────────────────────────
function DebtCard({ debt, history, onEdit, onDelete, onSchedule }: { debt: PPDebt; history: PPTransaction[]; onEdit: () => void; onDelete: () => void; onSchedule: () => void; }) {
  const { t, i18n } = useTranslation();
  const dt = DEBT_TYPES.find(tType => tType.key === debt.type)!; const isFinished = debt.remaining_amount <= 0.1; const paidPct = debt.total_amount > 0 ? ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100 : 0; const [confirm, setConfirm] = useState(false);
  const overdueCount = useMemo(() => { const rows = buildSchedule(debt, history, 24); return rows.filter(r => r.status === "overdue").length; }, [debt, history]);
  const nextDue = useMemo(() => {
    if (!debt.due_day) return null; const today = new Date(); today.setHours(0,0,0,0); const due = new Date(today.getFullYear(), today.getMonth(), debt.due_day);
    if (due < today) due.setMonth(due.getMonth() + 1);
    return { str: fmtDate(due.toISOString().slice(0,10), i18n), diff: Math.round((due.getTime()-today.getTime())/86400000) };
  }, [debt.due_day, i18n]);
  return (
    <Card className={`overflow-hidden relative transition-all duration-500 border-none bg-background shadow-sm ring-1 ring-border/40 hover:ring-primary/40 hover:shadow-xl rounded-[24px] lg:rounded-[32px] ${isFinished ? "ring-emerald-500/40 bg-emerald-50/5" : !debt.is_active ? "opacity-60" : ""}`}>
      {isFinished && <div className="absolute -right-12 top-8 rotate-45 bg-emerald-500 text-white text-[9px] font-black py-2 px-20 shadow-xl z-20 border-y-4 border-white/20 select-none pointer-events-none uppercase tracking-[0.3em]">{t("app.debt.cleared")}</div>}
      <div className="h-1.5 lg:h-2 w-full" style={{ backgroundColor: isFinished ? "#10b981" : dt.color }} />
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">
        <div className="flex items-start gap-3 lg:gap-4">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-border/20" style={{ backgroundColor: (isFinished ? "#10b981" : dt.color) + "10", color: isFinished ? "#10b981" : dt.color }}><dt.icon size={20} className="lg:w-6 lg:h-6" strokeWidth={3} /></div>
          <div className="flex-1 min-w-0"><p className={`font-black text-[11px] lg:text-sm uppercase tracking-tight truncate ${isFinished ? "text-emerald-700" : ""}`}>{debt.name}</p><p className="text-[8px] lg:text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-widest flex items-center gap-1.5 lg:gap-2 truncate">{debt.lender || t(`app.types.debt.${dt.key}`)} <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: dt.color + "40" }} /> {debt.annual_rate}% APR</p></div>
          <div className="text-right shrink-0">
            <p className={`text-sm lg:text-lg font-black truncate max-w-[80px] lg:max-w-none ${isFinished ? "text-emerald-600" : "text-rose-600"}`}>{isFinished ? "✓" : formatMoney(debt.remaining_amount)}</p>
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">{isFinished ? t("app.debt.cleared") : t("app.debt.remaining")}</p>
          </div>
        </div>
        {!isFinished && (overdueCount > 0 || (nextDue && nextDue.diff <= 7)) && (
          <div className="flex gap-1.5">{overdueCount > 0 && <Badge className="bg-rose-500 text-white border-none text-[8px] font-black uppercase h-5 px-2 animate-pulse rounded-full">⚠️ {overdueCount} {t("app.debt.overdue")}</Badge>}{overdueCount === 0 && nextDue && nextDue.diff <= 7 && <Badge className={`border-none text-[8px] font-black uppercase h-5 px-2 rounded-full text-white ${nextDue.diff <= 3 ? "bg-rose-500" : "bg-amber-500"}`}>Due in {nextDue.diff}d</Badge>}</div>
        )}
        <div className="space-y-1.5"><div className="flex justify-between text-[8px] lg:text-[9px] font-black uppercase tracking-widest opacity-60"><span>{paidPct.toFixed(0)}% {t("app.debt.repaid")}</span><span>{formatMoney(debt.total_amount)}</span></div><Progress value={paidPct} className={`h-1.5 lg:h-2.5 rounded-full bg-muted/40 shadow-inner ${isFinished ? "[&>div]:bg-emerald-500" : "[&>div]:bg-primary/80"}`} /></div>
        <div className="grid grid-cols-2 gap-2">{[{ label: t("app.recurring.monthlyBurn"), v: formatMoney(debt.monthly_payment) }, { label: "Completed", v: `${history.length} terms` }].map(s => (<div key={s.label} className="rounded-xl lg:rounded-2xl p-2.5 lg:p-3 border border-border/30 bg-muted/10"><p className="text-[8px] font-black text-muted-foreground uppercase mb-1">{s.label}</p><p className="text-[9px] lg:text-[10px] font-black uppercase tracking-tight truncate">{s.v}</p></div>))}</div>
        <div className="flex gap-2 pt-1 lg:pt-2"><Button size="sm" className="flex-1 h-9 lg:h-10 text-[8px] lg:text-[9px] font-black uppercase tracking-widest rounded-xl lg:rounded-2xl shadow-md hover:scale-105 transition-transform" onClick={onSchedule} style={{ backgroundColor: dt.color, border: "none" }}>{t("app.debt.makePayment")}</Button><Button size="icon" variant="ghost" className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl lg:rounded-2xl hover:bg-primary/10 transition-colors" onClick={onEdit}><Pencil size={16} /></Button>{!confirm ? <Button size="icon" variant="ghost" className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl lg:rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-colors" onClick={() => setConfirm(true)}><Trash2 size={16} /></Button> : <Button size="sm" variant="destructive" className="h-9 lg:h-10 px-3 lg:px-4 text-[8px] lg:text-[9px] font-black uppercase rounded-xl lg:rounded-2xl" onClick={onDelete}>{t("app.common.delete")}</Button>}</div>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const DebtManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth(); const { toast } = useToast(); 
  const [debts, setDebts] = useState<PPDebt[]>([]); 
  const [accounts, setAccounts] = useState<PPAccount[]>([]); 
  const [allHistory, setAllHistory] = useState<PPTransaction[]>([]);
  const [loading, setLoading] = useState(true); 
  const [formOpen, setFormOpen] = useState(false); 
  const [editItem, setEditItem] = useState<PPDebt | null>(null); 
  const [scheduleDebt, setScheduleDebt] = useState<PPDebt | null>(null); 
  const [payDebt, setPayDebt] = useState<PPDebt | null>(null); 
  const [filterType, setFilterType] = useState<"all"|DebtType>("all"); 
  const [showInactive, setShowInactive] = useState(false);
  
  const load = async () => { 
    if (!user) return; 
    setLoading(true); 
    const [{ data: d }, { data: a }, { data: h }] = await Promise.all([ 
      supabase.from("pp_debts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }), 
      supabase.from("pp_accounts").select("*").eq("user_id", user.id).order("name"),
      supabase.from("pp_transactions").select("*").eq("user_id", user.id).not("debt_id", "is", null)
    ]); 
    setDebts((d ?? []) as PPDebt[]); 
    setAccounts((a ?? []) as PPAccount[]); 
    setAllHistory((h ?? []) as PPTransaction[]);
    setLoading(false); 
  };
  
  useEffect(() => { load(); }, [user]);

  const handleDelete = async (id: string) => { 
    const { error } = await supabase.from("pp_debts").delete().eq("id", id); 
    if (error) toast({ title: t("app.common.error"), description: error.message, variant: "destructive" }); 
    else { toast({ title: t("app.common.success") }); load(); } 
  };
  
  const filtered = debts.filter(d => (filterType === "all" || d.type === filterType) && (showInactive || d.is_active));
  const overdueDebts = debts.filter(d => {
    if (!d.is_active) return false;
    const history = allHistory.filter(h => h.debt_id === d.id);
    return buildSchedule(d, history, 24).some(r => r.status === "overdue");
  });
  return (
    <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter text-foreground">{t("app.debt.title")}</h1><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60">{t("app.debt.subtitle")}</p></div>
        <Button onClick={() => { setEditItem(null); setFormOpen(true); }} className="rounded-xl lg:rounded-[20px] h-11 lg:h-12 px-6 lg:px-8 font-black uppercase text-[10px] lg:text-[11px] tracking-widest shadow-xl shadow-primary/30 hover:scale-105 transition-all w-full sm:w-auto"><Plus size={18} className="mr-2" /> {t("app.debt.newLoan")}</Button>
      </div>
      {overdueDebts.length > 0 && (<Card className="p-4 lg:p-5 border-none bg-rose-600 text-white shadow-2xl shadow-rose-500/30 rounded-2xl lg:rounded-[32px] flex gap-4 lg:gap-5 items-center animate-in slide-in-from-top-10 duration-700"><div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-3xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-md border border-white/20"><AlertCircle className="w-6 h-6 lg:w-8 lg:h-8" strokeWidth={3} /></div><div className="flex-1 min-w-0"><p className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Delinquency Alert</p><p className="text-sm lg:text-lg font-bold tracking-tight truncate">{overdueDebts.length} {t("app.debt.overdue")}</p></div><Button variant="outline" className="bg-white/10 border-white/30 hover:bg-white/20 text-white h-9 lg:h-11 px-4 lg:px-6 rounded-xl lg:rounded-2xl font-black uppercase text-[9px] lg:text-[10px] hidden xs:flex" onClick={() => setFilterType("all")}>{t("app.common.actions")}</Button></Card>)}
      {debts.length > 0 && <DebtSummary debts={debts} />}
      <div className="flex flex-col gap-4 bg-muted/20 p-3 rounded-2xl lg:rounded-[32px] border border-border/40 backdrop-blur-sm">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button onClick={() => setFilterType("all")} className={`px-4 lg:px-5 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterType === "all" ? "bg-background shadow-md text-primary ring-1 ring-border/50" : "text-muted-foreground hover:bg-muted/40"}`}>{t("app.common.all")} ({debts.length})</button>
          {DEBT_TYPES.filter(tType => debts.some(d => d.type === tType.key)).map(tType => (<button key={tType.key} onClick={() => setFilterType(tType.key)} className={`px-4 lg:px-5 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all border border-transparent whitespace-nowrap ${filterType === tType.key ? "text-white shadow-lg scale-105" : "text-muted-foreground hover:bg-muted/40"}`} style={filterType === tType.key ? { backgroundColor: tType.color } : {}}>{t(`app.types.debt.${tType.key}`)}</button>))}
        </div>
        <div className="flex items-center justify-between px-2 pt-2 border-t border-border/20 md:border-none md:pt-0 md:justify-end md:gap-4 md:border-l md:px-4">
          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Historical View</Label>
          <Switch checked={showInactive} onCheckedChange={setShowInactive} />
        </div>
      </div>
      {loading ? (<div className="flex flex-col items-center justify-center py-32 gap-6"><div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border-4 lg:border-8 border-primary/10 border-t-primary animate-spin shadow-2xl" /><p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground animate-pulse">{t("app.common.loading")}</p></div>) : filtered.length === 0 ? (<Card className="p-16 lg:p-24 text-center border-none bg-background/50 backdrop-blur-sm ring-1 ring-border/40 rounded-[32px] lg:rounded-[48px] shadow-sm flex flex-col items-center"><div className="w-16 h-16 lg:w-24 lg:h-24 bg-emerald-500/10 rounded-[24px] lg:rounded-[40px] flex items-center justify-center mb-6 lg:mb-8 border border-emerald-500/20 shadow-inner"><CheckCircle2 className="w-8 h-8 lg:w-12 lg:h-12 text-emerald-500" strokeWidth={3} /></div><p className="font-black text-xl lg:text-2xl uppercase tracking-tighter mb-2">{t("app.debt.cleared")}</p><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Your portfolio is free of outstanding debt</p></Card>) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {filtered.map(d => (
            <DebtCard key={d.id} debt={d} history={allHistory.filter(h => h.debt_id === d.id)} onEdit={() => { setEditItem(d); setFormOpen(true); }} onDelete={() => handleDelete(d.id)} onSchedule={() => setScheduleDebt(d)} />
          ))}
        </div>
      )}
      <DebtForm open={formOpen} onOpenChange={setFormOpen} item={editItem} accounts={accounts} onSaved={load} />
      {scheduleDebt && <ScheduleModal debt={scheduleDebt} onClose={() => setScheduleDebt(null)} onPayClick={() => { setPayDebt(scheduleDebt); setScheduleDebt(null); }} onRefresh={load} />}
      {payDebt && <PayModal debt={payDebt} rows={buildSchedule(payDebt, allHistory.filter(h => h.debt_id === payDebt.id))} onClose={() => setPayDebt(null)} onPaid={load} />}
    </div>
  );
};

export default DebtManagement;
