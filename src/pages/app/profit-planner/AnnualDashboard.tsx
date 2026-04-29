import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank,
  AlertTriangle, Award, ChevronLeft, ChevronRight, Zap, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatMoney, type PPCategory } from "@/lib/profitPlanner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MonthlyRow {
  month: string;       // "YYYY-MM"
  label: string;       // Localized month name
  income: number;
  expense: number;
  net: number;
  saving: number;
}

interface CategoryTotal {
  name: string;
  icon: string | null;
  color: string | null;
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pct(a: number, b: number) {
  if (!b) return 0;
  return ((a - b) / Math.abs(b)) * 100;
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-xl shadow-xl p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono font-semibold">{formatMoney(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

interface InsightProps {
  icon: React.ElementType;
  title: string;
  body: string;
  color: string;
  badge?: string;
}
function InsightCard({ icon: Icon, title, body, color, badge }: InsightProps) {
  return (
    <div className={`flex gap-3 p-4 rounded-xl border bg-card`} style={{ borderColor: color + "33" }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "18" }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold">{title}</p>
          {badge && <Badge variant="secondary" className="text-[10px] py-0">{badge}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

interface KPIProps {
  label: string;
  value: string;
  prev?: string;
  change?: number;
  icon: React.ElementType;
  positiveGood?: boolean;
  sub?: string;
  valueColor?: string;
}
function KPICard({ label, value, prev, change, icon: Icon, positiveGood = true, sub, valueColor }: KPIProps) {
  const isGood = change === undefined ? null : positiveGood ? change >= 0 : change <= 0;
  return (
    <Card className="p-4 space-y-2 border-none shadow-sm ring-1 ring-border/50">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={15} className="text-primary" />
        </div>
      </div>
      <p className={`text-xl font-display font-black ${valueColor ?? "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">{sub}</p>}
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${isGood ? "text-emerald-600" : "text-rose-600"}`}>
          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {fmtPct(change)} <span className="font-bold opacity-60 ml-0.5">YoY</span>
        </div>
      )}
    </Card>
  );
}

const AnnualDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthly, setMonthly]       = useState<MonthlyRow[]>([]);
  const [prevMonthly, setPrevMonthly] = useState<MonthlyRow[]>([]);
  const [catTotals, setCatTotals]   = useState<CategoryTotal[]>([]);
  const [loading, setLoading]       = useState(true);

  const MONTH_LABELS = useMemo(() => [
    t("app.months.jan"), t("app.months.feb"), t("app.months.mar"), t("app.months.apr"),
    t("app.months.may"), t("app.months.jun"), t("app.months.jul"), t("app.months.aug"),
    t("app.months.sep"), t("app.months.oct"), t("app.months.nov"), t("app.months.dec")
  ], [t]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: cats } = await supabase.from("pp_categories").select("*").eq("user_id", user.id);
      const categories = (cats ?? []) as PPCategory[];

      const fetchYearData = async (y: number) => {
        const start = `${y}-01-01`;
        const end   = `${y}-12-31`;
        const { data: txs, error } = await supabase
          .from("pp_transactions")
          .select("type, amount, occurred_on, category_id")
          .eq("user_id", user.id)
          .gte("occurred_on", start)
          .lte("occurred_on", end);
        
        if (error) throw error;
        return txs || [];
      };

      const [thisYearTxs, prevYearTxs] = await Promise.all([
        fetchYearData(year),
        fetchYearData(year - 1)
      ]);

      const processTxs = (txs: any[], y: number): MonthlyRow[] => {
        const rows: MonthlyRow[] = MONTH_LABELS.map((label, i) => ({
          month: `${y}-${String(i + 1).padStart(2, "0")}`,
          label, income: 0, expense: 0, net: 0, saving: 0
        }));

        txs.forEach(t => {
          if (!t.occurred_on) return;
          const parts = t.occurred_on.split("-");
          if (parts.length < 2) return;
          const m = parseInt(parts[1]) - 1;
          if (m >= 0 && m < 12) {
            const amt = Number(t.amount) || 0;
            if (t.type === "income") rows[m].income += amt;
            else rows[m].expense += amt;
          }
        });

        return rows.map(r => ({
          ...r,
          net: r.income - r.expense,
          saving: Math.max(0, r.income - r.expense)
        }));
      };

      const curMonthly = processTxs(thisYearTxs, year);
      const prevMonthlyArr = processTxs(prevYearTxs, year - 1);
      
      setMonthly(curMonthly);
      setPrevMonthly(prevMonthlyArr);

      const catMap: Record<string, number> = {};
      thisYearTxs.filter(t => t.type === "expense").forEach(t => {
        const k = t.category_id ?? "uncategorized";
        catMap[k] = (catMap[k] ?? 0) + (Number(t.amount) || 0);
      });

      const catArr: CategoryTotal[] = Object.entries(catMap)
        .map(([id, total]) => {
          const cat = categories.find(c => c.id === id);
          return { 
            name: cat?.name || (id === "uncategorized" ? t("app.common.uncategorized") : t("app.common.deletedCategory")), 
            icon: cat?.icon ?? null, 
            color: cat?.color ?? null, 
            total 
          };
        })
        .sort((a, b) => b.total - a.total);
      setCatTotals(catArr);

    } catch (e: any) {
      console.error("Error loading annual data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user, year, MONTH_LABELS]);

  const annual = useMemo(() => ({
    income:  monthly.reduce((s,m) => s + m.income, 0),
    expense: monthly.reduce((s,m) => s + m.expense, 0),
    net:     monthly.reduce((s,m) => s + m.net, 0),
    saving:  monthly.reduce((s,m) => s + m.saving, 0),
  }), [monthly]);

  const prevAnnual = useMemo(() => ({
    income:  prevMonthly.reduce((s,m) => s + m.income, 0),
    expense: prevMonthly.reduce((s,m) => s + m.expense, 0),
    net:     prevMonthly.reduce((s,m) => s + m.net, 0),
    saving:  prevMonthly.reduce((s,m) => s + m.saving, 0),
  }), [prevMonthly]);

  const savingsRate  = annual.income > 0 ? (annual.saving / annual.income) * 100 : 0;
  const expenseRatio = annual.income > 0 ? (annual.expense / annual.income) * 100 : 0;
  const activeMonths = monthly.filter(m => m.income > 0 || m.expense > 0);
  const bestMonth    = activeMonths.length ? activeMonths.reduce((a,b) => b.net > a.net ? b : a) : null;

  const yoyData = MONTH_LABELS.map((label, i) => ({
    label,
    [`${year} Inc`]:  monthly[i]?.income ?? 0,
    [`${year-1} Inc`]: prevMonthly[i]?.income ?? 0,
    [`${year} Exp`]: monthly[i]?.expense ?? 0,
    [`${year-1} Exp`]: prevMonthly[i]?.expense ?? 0,
  }));

  const radarData = catTotals.slice(0, 6).map(c => ({
    subject: c.name,
    value: c.total,
    fullMark: catTotals[0]?.total ?? 1,
  }));

  let cumSaving = 0;
  const cumulativeData = monthly.map(m => {
    cumSaving += m.saving;
    return { label: m.label, cumulative: cumSaving };
  });

  const insights = useMemo(() => {
    const list: InsightProps[] = [];
    if (savingsRate >= 20) list.push({ icon: Award, title: "Healthy Savings!", body: `You saved ${savingsRate.toFixed(1)}% of your income. Target maintained.`, color: "#10b981", badge: "🏆" });
    if (annual.income > 0 && pct(annual.income, prevAnnual.income) > 10) list.push({ icon: TrendingUp, title: "Income Growth", body: `Revenue up ${fmtPct(pct(annual.income, prevAnnual.income))} YoY.`, color: "#10b981" });
    if (annual.expense > 0 && pct(annual.expense, prevAnnual.expense) > 15) list.push({ icon: AlertTriangle, title: "Spending Surge", body: `Expenses climbed ${fmtPct(pct(annual.expense, prevAnnual.expense))} vs last year.`, color: "#ef4444" });
    if (bestMonth) list.push({ icon: Zap, title: `${t("app.annual.period")}: ${bestMonth.label}`, body: `Surplus of ${formatMoney(bestMonth.net)} recorded.`, color: "#6366f1" });
    return list;
  }, [annual, prevAnnual, savingsRate, bestMonth, t]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">{t("app.annual.loading")}</p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">{t("app.annual.title")}</h1>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">{t("app.annual.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => load()} disabled={loading} className="h-10 w-10 rounded-2xl shadow-sm">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </Button>
          <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-2xl border border-border/50">
            <button onClick={() => setYear(y => y - 1)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-background transition-all shadow-sm"><ChevronLeft size={16} /></button>
            <span className="text-sm font-black w-14 text-center tracking-tighter">{year}</span>
            <button onClick={() => setYear(y => Math.min(y + 1, new Date().getFullYear()))} disabled={year >= new Date().getFullYear()} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-background transition-all shadow-sm disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <KPICard label={t("app.annual.totalInflow")} value={formatMoney(annual.income)} valueColor="text-emerald-500" change={prevAnnual.income ? pct(annual.income, prevAnnual.income) : undefined} icon={TrendingUp} />
        <KPICard label={t("app.annual.totalOutflow")} value={formatMoney(annual.expense)} valueColor="text-rose-500" change={prevAnnual.expense ? pct(annual.expense, prevAnnual.expense) : undefined} icon={TrendingDown} positiveGood={false} />
        <KPICard label={t("app.annual.netSurplus")} value={formatMoney(annual.net)} valueColor={annual.net >= 0 ? "text-emerald-500" : "text-rose-500"} change={prevAnnual.net ? pct(annual.net, prevAnnual.net) : undefined} icon={Wallet} />
        <KPICard label={t("app.annual.savingsYield")} value={`${savingsRate.toFixed(1)}%`} sub={`${t("app.common.expense")}: ${expenseRatio.toFixed(1)}%`} icon={PiggyBank} />
      </div>

      <Card className="p-4 lg:p-6 border-none shadow-sm ring-1 ring-border/40 rounded-[24px] lg:rounded-[32px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <h3 className="text-[10px] lg:text-sm font-black uppercase tracking-widest text-slate-500">{t("app.annual.monthlyLiquidity")} — {year}</h3>
          <div className="flex gap-4 text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-muted-foreground">
             <span className="flex items-center gap-1.5"><span className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-emerald-500" />{t("app.common.income")}</span>
             <span className="flex items-center gap-1.5"><span className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-rose-500" />{t("app.common.expense")}</span>
          </div>
        </div>
        <div className="h-64 lg:h-72 -ml-4 lg:ml-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={9} fontWeight="bold" />
              <YAxis axisLine={false} tickLine={false} fontSize={9} fontWeight="bold" tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fill="url(#gIn)" />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fill="url(#gOut)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        <Card className="p-4 lg:p-6 border-none shadow-sm ring-1 ring-border/40 rounded-[24px] lg:rounded-[32px]">
          <h3 className="text-[10px] lg:text-sm font-black uppercase tracking-widest mb-6 text-slate-500">{t("app.annual.yoyInflow")}</h3>
          <div className="h-48 lg:h-60 -ml-4 lg:ml-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yoyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={9} fontWeight="bold" />
                <YAxis axisLine={false} tickLine={false} fontSize={9} fontWeight="bold" tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey={`${year} Inc`} fill="#10b981" radius={[4,4,0,0]} maxBarSize={12} />
                <Bar dataKey={`${year-1} Inc`} fill="#10b98130" radius={[4,4,0,0]} maxBarSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 lg:p-6 border-none shadow-sm ring-1 ring-border/40 rounded-[24px] lg:rounded-[32px]">
          <h3 className="text-[10px] lg:text-sm font-black uppercase tracking-widest mb-6 text-slate-500">{t("app.annual.cumulativeSurplus")}</h3>
          <div className="h-48 lg:h-60 -ml-4 lg:ml-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={9} fontWeight="bold" />
                <YAxis axisLine={false} tickLine={false} fontSize={9} fontWeight="bold" tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="cumulative" stroke="#6366f1" strokeWidth={3} dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        <Card className="p-4 lg:p-6 border-none shadow-sm ring-1 ring-border/40 rounded-[24px] lg:rounded-[32px]">
          <h3 className="text-[10px] lg:text-sm font-black uppercase tracking-widest mb-6 text-slate-500">{t("app.annual.allocation")}</h3>
          {catTotals.length === 0 ? <p className="text-xs font-bold text-center py-12 uppercase opacity-40">{t("app.annual.noOutflow")}</p> : (
            <div className="space-y-4">
              {catTotals.slice(0, 6).map((c, i) => {
                const p = annual.expense > 0 ? (c.total / annual.expense) * 100 : 0;
                return (
                  <div key={i} className="group">
                    <div className="flex items-center justify-between text-[10px] lg:text-[11px] mb-2 font-black uppercase">
                      <span className="flex items-center gap-2 lg:gap-3"><span className="text-base lg:text-lg">{c.icon || "📦"}</span><span className="truncate max-w-[80px] lg:max-w-none">{c.name}</span></span>
                      <div className="flex items-center gap-2 lg:gap-3"><span className="opacity-40">{p.toFixed(0)}%</span><span className="font-mono text-[10px] lg:text-xs text-slate-700">{formatMoney(c.total)}</span></div>
                    </div>
                    <Progress value={p} className="h-1 lg:h-1.5 rounded-full bg-muted/40 [&>div]:bg-primary/60 group-hover:[&>div]:bg-primary transition-all" />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4 lg:p-6 border-none shadow-sm ring-1 ring-border/40 rounded-[24px] lg:rounded-[32px]">
          <h3 className="text-[10px] lg:text-sm font-black uppercase tracking-widest mb-2 text-slate-500">{t("app.annual.spendingSignature")}</h3>
          <p className="text-[8px] lg:text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mb-6">{t("app.annual.subtitle")}</p>
          {radarData.length < 3 ? <p className="text-xs font-bold text-center py-12 uppercase opacity-40">{t("app.annual.insufficientData")}</p> : (
            <div className="h-56 lg:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fontWeight: "bold" }} />
                  <Radar name="Intensity" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card className="border-none shadow-lg ring-1 ring-border/40 rounded-[24px] lg:rounded-[32px] overflow-hidden">
         <div className="p-4 lg:p-6 bg-muted/10 border-b border-border/40"><h3 className="text-[10px] lg:text-sm font-black uppercase tracking-widest text-slate-500">{t("app.annual.temporalBreakdown")}</h3></div>
         
         {/* Mobile List View */}
         <div className="lg:hidden divide-y divide-border/20">
           {monthly.map((m, i) => {
             const hasData = m.income > 0 || m.expense > 0;
             if (!hasData) return null;
             const isGood = m.net >= 0;
             const rate = m.income > 0 ? (m.saving / m.income) * 100 : 0;
             return (
               <div key={i} className="p-4 space-y-3">
                 <div className="flex justify-between items-center">
                   <span className="font-black uppercase tracking-tighter text-sm">{m.label}</span>
                   <Badge className={`text-[8px] font-black border-none uppercase ${isGood ? "bg-emerald-500" : "bg-rose-500"}`}>{isGood ? t("app.annual.surplus") : t("app.annual.deficit")}</Badge>
                 </div>
                 <div className="grid grid-cols-2 gap-y-2 text-[10px]">
                   <div className="flex flex-col">
                     <span className="text-muted-foreground font-bold uppercase tracking-widest text-[8px]">{t("app.common.income")}</span>
                     <span className="font-mono font-bold text-emerald-600">{formatMoney(m.income)}</span>
                   </div>
                   <div className="flex flex-col items-end">
                     <span className="text-muted-foreground font-bold uppercase tracking-widest text-[8px]">{t("app.common.expense")}</span>
                     <span className="font-mono font-bold text-rose-600">{formatMoney(m.expense)}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-muted-foreground font-bold uppercase tracking-widest text-[8px]">{t("app.common.net")}</span>
                     <span className={`font-mono font-black ${isGood ? "text-emerald-600" : "text-rose-600"}`}>{formatMoney(m.net)}</span>
                   </div>
                   <div className="flex flex-col items-end">
                     <span className="text-muted-foreground font-bold uppercase tracking-widest text-[8px]">{t("app.annual.savingsYield")}</span>
                     <span className="font-black opacity-60">{rate.toFixed(1)}%</span>
                   </div>
                 </div>
               </div>
             );
           })}
           {monthly.filter(m => m.income > 0 || m.expense > 0).length === 0 && (
             <div className="p-8 text-center opacity-40 italic text-xs font-bold uppercase">{t("app.common.noData")}</div>
           )}
         </div>

         {/* Desktop Table View */}
         <div className="hidden lg:block overflow-x-auto">
           <table className="w-full text-xs">
             <thead>
               <tr className="bg-muted/30 border-b border-border/40">
                 {[t("app.annual.period"), t("app.common.income"), t("app.common.expense"), t("app.annual.surplus"), t("app.annual.savingsYield"), t("app.annual.health")].map(h => (
                   <th key={h} className="text-left py-4 px-4 lg:px-6 font-black uppercase tracking-widest text-[8px] lg:text-[10px] opacity-60">{h}</th>
                 ))}
               </tr>
             </thead>
             <tbody className="divide-y divide-border/20">
               {monthly.map((m, i) => {
                 const hasData = m.income > 0 || m.expense > 0;
                 const rate = m.income > 0 ? (m.saving / m.income) * 100 : 0;
                 const isGood = m.net >= 0;
                 return (
                   <tr key={i} className={`${!hasData ? "opacity-30" : ""} hover:bg-muted/20 transition-colors whitespace-nowrap`}>
                     <td className="py-4 px-4 lg:px-6 font-black uppercase tracking-tighter text-xs lg:text-sm">{m.label}</td>
                     <td className="py-4 px-4 lg:px-6 font-mono font-bold text-emerald-600">{hasData ? formatMoney(m.income) : "—"}</td>
                     <td className="py-4 px-4 lg:px-6 font-mono font-bold text-rose-600">{hasData ? formatMoney(m.expense) : "—"}</td>
                     <td className={`py-4 px-4 lg:px-6 font-mono font-black ${isGood ? "text-emerald-600" : "text-rose-600"}`}>{hasData ? formatMoney(m.net) : "—"}</td>
                     <td className="py-4 px-4 lg:px-6 font-black opacity-60">{hasData ? `${rate.toFixed(1)}%` : "—"}</td>
                     <td className="py-4 px-4 lg:px-6">{hasData && <Badge className={`text-[8px] lg:text-[9px] font-black border-none uppercase ${isGood ? "bg-emerald-500" : "bg-rose-500"}`}>{isGood ? t("app.annual.surplus") : t("app.annual.deficit")}</Badge>}</td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
         </div>
      </Card>

      {insights.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Zap size={18} className="text-primary" /> {t("app.annual.coreInsights")}</h3>
          <div className="grid sm:grid-cols-2 gap-4">{insights.map((ins, i) => <InsightCard key={i} {...ins} />)}</div>
        </div>
      )}
    </div>
  );
};

export default AnnualDashboard;
