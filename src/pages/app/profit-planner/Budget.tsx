import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft, ChevronRight, Copy, Loader2,
  TrendingDown, TrendingUp, Wallet, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  formatMoney, monthKey,
  type PPCategory, type PPBudgetSummaryRow,
  fetchBudgets, upsertBudget, fetchBudgetSummary, copyBudgetFromMonth,
  type PPBudget,
} from "@/lib/profitPlanner";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend,
} from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function prevMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthDisplay(key: string, i18n: any) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(i18n.language, { month: "long", year: "numeric" });
}

const PCT_COLOR = (pct: number) =>
  pct >= 100 ? "bg-destructive" : pct >= 85 ? "bg-amber-500" : "bg-primary";

// ─── Budget Edit Dialog ───────────────────────────────────────────────────────
interface EditDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: PPBudgetSummaryRow | null;
  month: string;
  onSaved: () => void;
}

function BudgetEditDialog({ open, onOpenChange, row, month, onSaved }: EditDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [note, setNote]     = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && row) {
      setAmount(row.planned_amount > 0 ? String(row.planned_amount) : "");
      setNote("");
    }
  }, [open, row]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !row) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) {
      toast({ title: t("app.common.error"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await upsertBudget(user.id, month, row.category_id, amt, note || undefined);
      toast({ title: t("app.common.success") });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("app.common.error"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-tight">
            <span className="text-xl">{row?.category_icon}</span> {t("app.budget.setBudget")}
          </DialogTitle>
          <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">{row?.category_name}</p>
        </DialogHeader>
        <form onSubmit={handle} className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase opacity-60">{t("app.budget.planned")} (THB)</Label>
            <Input
              type="number" min="0" step="0.01"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00" autoFocus
              className="h-11 rounded-xl bg-muted/20 border-none font-bold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase opacity-60">{t("app.common.note")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("app.common.note")} className="h-11 rounded-xl bg-muted/20 border-none font-bold" />
          </div>
          {row && row.actual_amount > 0 && (
            <div className="text-[10px] font-bold text-muted-foreground bg-muted/20 rounded-xl px-4 py-3 uppercase">
              {t("app.budget.actual")}: <span className="font-black text-foreground">{formatMoney(row.actual_amount, "THB")}</span>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase text-[10px]">{t("app.common.cancel")}</Button>
            <Button type="submit" disabled={saving} className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
              {saving ? <Loader2 className="animate-spin" /> : t("app.budget.deploy")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Quick-add for unbudgeted category ───────────────────────────────────────
interface QuickAddProps {
  categories: PPCategory[];
  budgetedIds: Set<string | null>;
  month: string;
  onSaved: () => void;
}

function QuickAdd({ categories, budgetedIds, month, onSaved }: QuickAddProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [catId, setCatId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const unbudgeted = categories.filter(
    (c) => c.type === "expense" && !budgetedIds.has(c.id)
  );

  if (!unbudgeted.length) return null;

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !catId) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast({ title: t("app.common.error"), variant: "destructive" }); return; }
    setSaving(true);
    try {
      await upsertBudget(user.id, month, catId, amt);
      toast({ title: t("app.common.success") });
      setCatId(""); setAmount("");
      onSaved();
    } catch (e: any) {
      toast({ title: t("app.common.error"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 lg:p-6 border-dashed border-amber-400/40 bg-amber-50/20 rounded-[24px] lg:rounded-[32px]">
      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2 mb-4">
        <AlertTriangle size={14} /> {unbudgeted.length} {t("app.budget.unbudgeted")}
      </p>
      <form onSubmit={handle} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label className="text-[9px] font-black uppercase opacity-60">{t("app.common.category")}</Label>
          <Select value={catId} onValueChange={setCatId}>
            <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-800 border-none font-bold text-xs shadow-sm dark:text-white">
              <SelectValue placeholder={t("app.common.category")} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-2xl">
              {unbudgeted.map((c) => (
                <SelectItem key={c.id} value={c.id} className="font-bold text-xs">{c.icon} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label className="text-[9px] font-black uppercase opacity-60">{t("app.budget.planned")} (THB)</Label>
          <Input className="h-10 rounded-xl bg-white dark:bg-slate-800 border-none font-bold text-xs shadow-sm dark:text-white" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <Button type="submit" disabled={saving || !catId} className="h-10 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-500/10">
          {saving ? <Loader2 size={14} className="animate-spin" /> : t("app.budget.deploy")}
        </Button>
      </form>
    </Card>
  );
}

// ─── Budget Row ───────────────────────────────────────────────────────────────
function BudgetRow({ row, onEdit }: { row: PPBudgetSummaryRow; onEdit: () => void }) {
  const { t } = useTranslation();
  const pct = row.planned_amount > 0
    ? Math.min(Math.round((row.actual_amount / row.planned_amount) * 100), 999)
    : row.actual_amount > 0 ? 100 : 0;

  const over = row.actual_amount > row.planned_amount && row.planned_amount > 0;
  const warn = !over && pct >= 85;

  return (
    <div
      className="flex items-center gap-3 py-3 px-3 lg:px-4 rounded-xl hover:bg-muted/30 cursor-pointer transition-all group"
      onClick={onEdit}
    >
      <span
        className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm"
        style={{ backgroundColor: (row.category_color ?? "#888") + "15" }}
      >
        {row.category_icon ?? "🏷️"}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <span className="text-[11px] lg:text-sm font-black uppercase tracking-tight truncate">{row.category_name}</span>
          <div className="flex items-center gap-2 shrink-0">
            {over && <Badge variant="destructive" className="text-[8px] py-0 font-black uppercase px-1">OVER</Badge>}
            {warn && !over && <Badge className="text-[8px] py-0 bg-amber-500/10 text-amber-600 border-none font-black uppercase px-1">WARN</Badge>}
            <div className="flex flex-col items-end leading-none">
              <span className={`text-[10px] lg:text-xs font-black tabular-nums ${over ? "text-rose-600" : warn ? "text-amber-600" : "text-slate-800"}`}>
                {formatMoney(row.actual_amount, "THB")}
              </span>
              {row.planned_amount > 0 && <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">{t("app.budget.planned")} {formatMoney(row.planned_amount, "THB")}</span>}
            </div>
          </div>
        </div>
        {row.planned_amount > 0 ? (
          <Progress value={Math.min(pct, 100)} className={`h-1.5 ${over ? "[&>div]:bg-rose-500" : warn ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary/80"}`} />
        ) : (
          <p className="text-[9px] font-bold uppercase text-muted-foreground opacity-50">
            {row.actual_amount > 0
              ? <span className="text-amber-600">{t("app.budget.unbudgeted")} · {t("app.budget.actual")} {formatMoney(row.actual_amount, "THB")}</span>
              : <span className="italic opacity-40">{t("app.budget.setBudget")}</span>}
          </p>
        )}
      </div>

      {row.planned_amount > 0 && (
        <span className={`text-[10px] font-black w-10 text-right shrink-0 tabular-nums ${over ? "text-rose-600" : warn ? "text-amber-600" : "text-slate-500"}`}>
          {pct}%
        </span>
      )}
    </div>
  );
}

// ─── Summary KPI Cards ────────────────────────────────────────────────────────
function BudgetKPIs({ rows }: { rows: PPBudgetSummaryRow[] }) {
  const { t } = useTranslation();
  const expenseRows = rows.filter((r) => r.category_type === "expense");
  const totalPlanned = expenseRows.reduce((s, r) => s + r.planned_amount, 0);
  const totalActual  = expenseRows.reduce((s, r) => s + r.actual_amount, 0);
  const overCount    = expenseRows.filter((r) => r.actual_amount > r.planned_amount && r.planned_amount > 0).length;
  const remaining    = Math.max(0, totalPlanned - totalActual);
  const pct          = totalPlanned > 0 ? Math.min(Math.round((totalActual / totalPlanned) * 100), 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {[
        { label: t("app.budget.totalBudget"), value: formatMoney(totalPlanned, "THB"), icon: Wallet, color: "text-primary", bg: "bg-primary/5" },
        { label: t("app.budget.totalSpent"), value: formatMoney(totalActual, "THB"), icon: TrendingDown, color: totalActual > totalPlanned ? "text-rose-600" : "text-slate-800 dark:text-slate-200", bg: "bg-muted/30" },
        { label: t("app.budget.remaining"), value: formatMoney(remaining, "THB"), icon: TrendingUp, color: remaining > 0 ? "text-emerald-600" : "text-rose-600", bg: "bg-emerald-500/5" },
        { label: t("app.budget.overTargets"), value: `${overCount} ${t("app.common.category")}`, icon: AlertTriangle, color: overCount > 0 ? "text-rose-600" : "text-muted-foreground", bg: overCount > 0 ? "bg-rose-500/5" : "bg-muted/30" },
      ].map((s) => (
        <Card key={s.label} className="p-4 lg:p-5 border-none shadow-sm ring-1 ring-border/40 rounded-[20px] lg:rounded-[24px] bg-white dark:bg-slate-900/50">
          <div className="flex items-start justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">{s.label}</span>
            <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center shadow-sm`}>
              <s.icon size={14} className={s.color} />
            </div>
          </div>
          <div className={`text-sm lg:text-xl font-black tabular-nums tracking-tight ${s.color}`}>{s.value}</div>
          {s.label === t("app.budget.totalBudget") && totalPlanned > 0 && (
            <div className="mt-3">
              <Progress value={pct} className={`h-1.5 ${pct >= 100 ? "[&>div]:bg-rose-500" : pct >= 85 ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary/80"}`} />
              <p className="text-[8px] font-black uppercase text-muted-foreground mt-1.5 opacity-50">{pct}% {t("app.budget.utilization")}</p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────
function SpendingPie({ rows }: { rows: PPBudgetSummaryRow[] }) {
  const { t } = useTranslation();
  const data = rows
    .filter((r) => r.category_type === "expense" && r.actual_amount > 0)
    .sort((a, b) => b.actual_amount - a.actual_amount)
    .slice(0, 8);

  if (!data.length) return (
    <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-white/50 rounded-[24px] lg:rounded-[32px] shadow-sm flex flex-col items-center justify-center">
      <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center mb-4 text-primary opacity-30"><TrendingDown size={24} /></div>
      <p className="text-[10px] font-black text-muted-foreground uppercase opacity-40 italic tracking-widest">{t("app.budget.noSpending")}</p>
    </Card>
  );

  return (
    <Card className="p-6 lg:p-8 border-none shadow-sm ring-1 ring-border/40 rounded-[24px] lg:rounded-[32px]">
      <h3 className="text-[10px] lg:text-sm font-black text-muted-foreground uppercase tracking-widest mb-6">{t("app.budget.spendingDist")}</h3>
      <div className="h-[240px] lg:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data} dataKey="actual_amount" nameKey="category_name"
              cx="50%" cy="50%" innerRadius={55} outerRadius={85}
              paddingAngle={4}
            >
              {data.map((r, i) => (
                <Cell key={i} fill={r.category_color ?? `hsl(${i * 45},70%,60%)`} />
              ))}
            </Pie>
            <ReTooltip
              formatter={(v: number) => formatMoney(v, "THB")}
              contentStyle={{ fontSize: 10, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
            />
            <Legend
              iconType="circle" iconSize={6}
              wrapperStyle={{ fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase', marginTop: '10px' }}
              formatter={(v) => <span className="text-slate-500">{v}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ─── Main Budget Page ─────────────────────────────────────────────────────────
const Budget = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [month, setMonth]         = useState(monthKey(new Date()));
  const [rows, setRows]           = useState<PPBudgetSummaryRow[]>([]);
  const [categories, setCategories] = useState<PPCategory[]>([]);
  const [loading, setLoading]     = useState(true);
  const [copying, setCopying]     = useState(false);

  const [editRow, setEditRow]     = useState<PPBudgetSummaryRow | null>(null);
  const [editOpen, setEditOpen]   = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        supabase.from("pp_categories").select("*").eq("user_id", user.id).order("sort_order"),
        fetchBudgetSummary(user.id, month),
      ]);
      setCategories((c.data ?? []) as PPCategory[]);
      setRows(s);
    } catch (e: any) {
      toast({ title: t("app.common.error"), description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user, month]);

  const handleCopyFromPrev = async () => {
    if (!user) return;
    const from = prevMonth(month);
    setCopying(true);
    try {
      await copyBudgetFromMonth(user.id, from, month);
      toast({ title: t("app.common.success") });
      load();
    } catch (e: any) {
      toast({ title: t("app.common.error"), description: e.message, variant: "destructive" });
    } finally {
      setCopying(false);
    }
  };

  const budgetedIds = useMemo(() => new Set(rows.filter((r) => r.planned_amount > 0).map((r) => r.category_id)), [rows]);
  const expenseRows = rows.filter((r) => r.category_type === "expense");
  const incomeRows  = rows.filter((r) => r.category_type === "income");

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter !text-slate-900 dark:!text-white">{t("app.budget.title")}</h1>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">
            {t("app.budget.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-2xl border border-border/50 self-start sm:self-auto">
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => setMonth(prevMonth(month))}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-xs font-black min-w-[100px] text-center uppercase tracking-tighter">{monthDisplay(month, i18n)}</span>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => setMonth(nextMonth(month))}>
            <ChevronRight size={16} />
          </Button>
          <div className="w-px h-4 bg-border/50 mx-1" />
          <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px] font-black uppercase tracking-widest gap-1.5" onClick={handleCopyFromPrev} disabled={copying}>
            {copying ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
            <span className="hidden sm:inline">{t("app.budget.copyPrev")}</span>
          </Button>
        </div>
      </div>

      <BudgetKPIs rows={rows} />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-primary w-10 h-10" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">{t("app.common.loading")}</p>
        </div>
      ) : (
        <>
          <QuickAdd categories={categories} budgetedIds={budgetedIds} month={month} onSaved={load} />

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 lg:order-2">
              <SpendingPie rows={rows} />
            </div>

            <div className="lg:col-span-3 space-y-4 lg:order-1">
              <Card className="p-4 lg:p-6 border-none shadow-sm ring-1 ring-border/40 rounded-[24px] lg:rounded-[32px]">
                <h3 className="text-[10px] lg:text-sm font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                  <TrendingDown size={14} /> {t("app.common.expense")}
                  <Badge variant="secondary" className="ml-auto bg-primary/5 text-primary border-none text-[10px]">{expenseRows.length}</Badge>
                </h3>
                {expenseRows.length === 0 ? (
                  <p className="text-xs font-bold text-muted-foreground py-12 text-center uppercase opacity-40">{t("app.common.noData")}</p>
                ) : (
                  <div className="divide-y divide-border/20">
                    {expenseRows.map((r, i) => (
                      <BudgetRow key={r.category_id ?? i} row={r} onEdit={() => { setEditRow(r); setEditOpen(true); }} />
                    ))}
                  </div>
                )}
              </Card>

              {incomeRows.length > 0 && (
                <Card className="p-4 lg:p-6 border-none shadow-sm ring-1 ring-border/40 rounded-[24px] lg:rounded-[32px]">
                  <h3 className="text-[10px] lg:text-sm font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <TrendingUp size={14} /> {t("app.common.income")} ({t("app.budget.actual")})
                  </h3>
                  <div className="divide-y divide-border/20">
                    {incomeRows.map((r, i) => (
                      <BudgetRow key={r.category_id ?? i} row={r} onEdit={() => { setEditRow(r); setEditOpen(true); }} />
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      <BudgetEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        row={editRow}
        month={month}
        onSaved={load}
      />
    </div>
  );
};

export default Budget;
