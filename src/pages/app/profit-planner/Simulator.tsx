import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { 
  TrendingUp, TrendingDown, Target, Zap, Plus, Pencil, Trash2, 
  RefreshCw, ChevronRight, ChevronDown, PieChart as PieIcon, LineChart, 
  BarChart2, Loader2, DollarSign, Info, Search, Filter, Save, History, Sparkles, AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatMoney, type PPSimulation } from "@/lib/profitPlanner";
import { format } from "date-fns";
import { 
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, 
  CartesianGrid, Legend
} from "recharts";

// ─── Constants ───────────────────────────────────────────────────────────────

const COMPOUND_FREQS = [
  { key: "yearly",   n: 1 },
  { key: "monthly",  n: 12 },
  { key: "daily",    n: 365 },
];
const CONTRIB_FREQS = [
  { key: "monthly",  factor: 12 },
  { key: "yearly",   factor: 1 },
];

const ASSET_PRESETS = [
  { key: "stock_th",   icon: "📈", color: "#6366f1", defaultRate: 8 },
  { key: "stock_us",   icon: "🌐", color: "#3b82f6", defaultRate: 10 },
  { key: "fund",       icon: "🏦", color: "#8b5cf6", defaultRate: 7 },
  { key: "gold",       icon: "🥇", color: "#f59e0b", defaultRate: 6 },
  { key: "crypto",     icon: "₿",  color: "#f97316", defaultRate: 20 },
  { key: "savings",    icon: "💵", color: "#14b8a6", defaultRate: 1.5 },
];

const numFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ─── Logic ───────────────────────────────────────────────────────────────────

function calcCompound(plan: any) {
  try {
    const p = Math.max(0, parseFloat(String(plan.principal)) || 0);
    const rateRaw = parseFloat(String(plan.annualRate)) || 0;
    const r = rateRaw / 100;
    const add = Math.max(0, parseFloat(String(plan.additionalAmount)) || 0);
    const inc = (parseFloat(String(plan.annualIncreaseRate || 0)) || 0) / 100;
    const n = COMPOUND_FREQS.find(f => f.key === (plan.compoundFreq || 'yearly'))?.n || 1;
    const factor = CONTRIB_FREQS.find(f => f.key === (plan.additionalFreq || 'monthly'))?.factor || 12;
    const yearsInput = parseInt(String(plan.years));
    const totalYears = isNaN(yearsInput) ? 0 : Math.max(0, Math.min(100, yearsInput));

    let balance = p;
    let totalContrib = p;
    let totalInterest = 0;
    const rows: any[] = [];

    rows.push({ year: 0, startBalance: p, contribution: 0, interest: 0, endBalance: p, totalContrib: p, totalInterest: 0 });

    for (let y = 1; y <= totalYears; y++) {
      const startBalance = balance;

      // Per-period contribution adjusted for annual growth rate
      const contribPerPeriod = add * Math.pow(1 + inc, y - 1);
      const currentYearContrib = contribPerPeriod * factor;

      // Compound existing balance for one full year
      const balanceAfterCompound = balance * Math.pow(1 + r / n, n);

      // FV of ordinary annuity: derive per-contribution-period rate from annual compounding rate
      // This gives the correct FV whether contributions are monthly, yearly, etc.
      const rPerContrib = r > 0 && factor > 0 ? Math.pow(1 + r / n, n / factor) - 1 : 0;
      const contribFV = rPerContrib > 1e-10
        ? contribPerPeriod * (Math.pow(1 + rPerContrib, factor) - 1) / rPerContrib
        : currentYearContrib;

      const interest = (balanceAfterCompound - balance) + (contribFV - currentYearContrib);
      balance = balanceAfterCompound + contribFV;
      totalContrib += currentYearContrib;
      totalInterest += Math.max(0, interest);

      if (!isFinite(balance) || balance > 1e18) break;

      rows.push({
        year: y,
        startBalance: Math.round(startBalance),
        contribution: Math.round(currentYearContrib),
        interest: Math.round(Math.max(0, interest)),
        endBalance: Math.round(balance),
        totalContrib: Math.round(totalContrib),
        totalInterest: Math.round(totalInterest),
      });
    }
    return rows;
  } catch (e) {
    return [{ year: 0, startBalance: 0, contribution: 0, interest: 0, endBalance: 0, totalContrib: 0, totalInterest: 0 }];
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AssetPanel({ asset, onChange, onRemove, canRemove }: { asset: any; onChange: (v: any) => void; onRemove: () => void; canRemove: boolean; }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [localState, setLocalState] = useState({ principal: String(asset.principal), years: String(asset.years), additionalAmount: String(asset.additionalAmount), annualIncreaseRate: String(asset.annualIncreaseRate ?? 0) });

  useEffect(() => {
    setLocalState({ principal: String(asset.principal), years: String(asset.years), additionalAmount: String(asset.additionalAmount), annualIncreaseRate: String(asset.annualIncreaseRate ?? 0) });
  }, [asset.id]);

  const update = (k: string, v: any) => onChange({ ...asset, [k]: v });
  const handleBlur = (k: string) => {
    let val = parseFloat(localState[k as keyof typeof localState]);
    if (isNaN(val)) val = 0;
    if (k === "years") val = Math.max(0, Math.min(100, val));
    if (k === "annualIncreaseRate") val = Math.max(0, Math.min(50, val));
    update(k, val);
    setLocalState(p => ({ ...p, [k]: String(val) }));
  };

  return (
    <Card className="rounded-[32px] border-none shadow-sm ring-1 ring-border/40 bg-background overflow-hidden transition-all duration-300">
      <div className={cn("p-5 flex items-center justify-between cursor-pointer hover:bg-muted/10", !expanded && "pb-5")} onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-muted/20">{asset.icon || "📈"}</div>
          <div><h4 className="font-black uppercase text-xs tracking-tight">{asset.name || t("app.simulator.strategy")}</h4><p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">{asset.annualRate}% return · {asset.years} years</p></div>
        </div>
        <div className="flex items-center gap-2">
          {canRemove && <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-500/10" onClick={(e) => { e.stopPropagation(); onRemove(); }}><Trash2 size={16} /></Button>}
          <div className={cn("transition-transform duration-300", expanded && "rotate-180")}><ChevronDown size={18} className="text-muted-foreground" /></div>
        </div>
      </div>

      {expanded && (
        <div className="p-6 pt-0 space-y-6 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.common.name")}</Label><Input value={asset.name} onChange={e => update("name", e.target.value)} className="h-10 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.forms.icon")}</Label><Input value={asset.icon} onChange={e => update("icon", e.target.value)} placeholder="🚀" className="h-10 rounded-xl bg-muted/20 border-none shadow-inner text-center text-lg" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">Initial Value</Label><Input value={localState.principal} onChange={e => setLocalState({...localState, principal: e.target.value})} onBlur={() => handleBlur("principal")} className="h-10 rounded-xl bg-muted/20 border-none shadow-inner font-black text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.simulator.years")}</Label><Input value={localState.years} onChange={e => setLocalState({...localState, years: e.target.value})} onBlur={() => handleBlur("years")} className="h-10 rounded-xl bg-muted/20 border-none shadow-inner font-black text-xs" /></div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-end mb-1"><Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.simulator.rate")} (%)</Label><span className="text-xs font-black text-primary">{asset.annualRate}%</span></div>
            <Slider value={[asset.annualRate || 0]} onValueChange={v => update("annualRate", v[0])} max={30} step={0.5} className="py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.simulator.dca")}</Label><Input value={localState.additionalAmount} onChange={e => setLocalState({...localState, additionalAmount: e.target.value})} onBlur={() => handleBlur("additionalAmount")} className="h-10 rounded-xl bg-muted/20 border-none shadow-inner font-black text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">Interval</Label><Select value={asset.additionalFreq || 'monthly'} onValueChange={v => update("additionalFreq", v)}><SelectTrigger className="h-10 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-xs"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{CONTRIB_FREQS.map(f => (<SelectItem key={f.key} value={f.key}>{t(`app.types.frequency.${f.key}`)}</SelectItem>))}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">DCA Growth /yr <span className="opacity-50">(Optional)</span></Label>
              <div className="relative">
                <Input value={localState.annualIncreaseRate} onChange={e => setLocalState({...localState, annualIncreaseRate: e.target.value})} onBlur={() => handleBlur("annualIncreaseRate")} placeholder="0" className="h-10 rounded-xl bg-muted/20 border-none shadow-inner font-black text-xs pr-6" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-40">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">Compounding</Label>
              <Select value={asset.compoundFreq || 'yearly'} onValueChange={v => update("compoundFreq", v)}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {COMPOUND_FREQS.map(f => (<SelectItem key={f.key} value={f.key}>{f.key.charAt(0).toUpperCase() + f.key.slice(1)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Main Module ─────────────────────────────────────────────────────────────

const Simulator = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth(); const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  const [plans, setPlans] = useState<any[]>([{ id: "p1", name: "Strategic Growth", icon: "📈", principal: 100000, annualRate: 10, additionalAmount: 10000, additionalFreq: "monthly", years: 20, annualIncreaseRate: 0, compoundFreq: "yearly", color: "#6366f1" }]);
  const [savedSims, setSavedSims] = useState<PPSimulation[]>([]);
  const [simName, setSimName] = useState("Wealth Forecast");

  const loadSaved = useCallback(async () => {
    if (!user) return;
    try { const { data } = await supabase.from("pp_simulations").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }); setSavedSims((data ?? []) as PPSimulation[]); } catch (e) {}
  }, [user]);
  useEffect(() => { loadSaved(); }, [loadSaved]);

  const computed = useMemo(() => (plans || []).map(p => ({ ...p, rows: calcCompound(p) })), [plans]);

  const chartData = useMemo(() => {
    if (!computed || computed.length === 0) return [];
    const maxYears = Math.max(0, ...computed.map(p => Number(p.years) || 0));
    const data = [];
    for (let y = 0; y <= maxYears; y++) {
      const entry: any = { year: `Year ${y}` }; let total = 0;
      computed.forEach(p => {
        const rows = p.rows || []; const row = rows[y] || rows[rows.length - 1];
        if (row) { const val = Number(row.endBalance) || 0; entry[p.name] = val; total += val; }
      });
      entry.Total = total; data.push(entry);
    }
    return data;
  }, [computed]);

  const stats = useMemo(() => {
    let totalTarget = 0; let totalInvested = 0;
    computed.forEach(p => {
      const rows = p.rows || []; const last = rows[rows.length - 1];
      if (last) { totalTarget += (Number(last.endBalance) || 0); totalInvested += (Number(last.totalContrib) || 0); }
    });
    return { totalTarget, totalInvested, totalGain: totalTarget - totalInvested };
  }, [computed]);

  const saveSimulation = async () => {
    if (!user) return; setLoading(true);
    try {
      const { error } = await supabase.from("pp_simulations").insert({ user_id: user.id, name: simName.trim() || "Untitled", config: { plans } });
      if (error) throw error; toast({ title: t("app.common.success") }); loadSaved();
    } catch (e: any) { toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  const isTh = i18n.language === "th";

  return (
    <div className="space-y-6 pb-20">
      {!disclaimerDismissed && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-sm">
          <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="flex-1 text-muted-foreground leading-relaxed">
            <strong className="text-foreground">{isTh ? "ไม่ใช่คำแนะนำการลงทุน" : "Not financial advice."}</strong>
            {" "}
            {isTh
              ? "การจำลองนี้มีไว้เพื่อการศึกษาเท่านั้น ProfitPlanner ไม่ใช่ที่ปรึกษาทางการเงินที่ได้รับใบอนุญาต อย่าตัดสินใจลงทุนโดยอิงจากผลลัพธ์นี้เพียงอย่างเดียว"
              : "Simulations are for educational purposes only. ProfitPlanner is not a licensed financial advisor. Do not base investment decisions solely on these results."}
          </p>
          <button
            onClick={() => setDisclaimerDismissed(true)}
            className="text-muted-foreground hover:text-foreground shrink-0 text-lg leading-none"
            aria-label="Dismiss"
          >×</button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-500">
        <div><h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter">{t("app.simulator.title")}</h1><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">{t("app.simulator.subtitle")}</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPlans([...plans, { id: Math.random().toString(36).slice(2,9), name: `${t("app.simulator.nodes")} ${plans.length+1}`, icon: "🔮", principal: 50000, annualRate: 7, additionalAmount: 5000, additionalFreq: "monthly", years: 10, annualIncreaseRate: 0, compoundFreq: "yearly", color: ASSET_PRESETS[plans.length % ASSET_PRESETS.length].color }])} className="rounded-xl lg:rounded-2xl h-10 lg:h-11 px-3 lg:px-4 font-black uppercase text-[9px] lg:text-[10px] tracking-widest border-border/50 bg-background shadow-sm gap-2 flex-1 sm:flex-none"><Plus size={16} className="text-primary" /> {t("app.simulator.scenario")}</Button>
          <div className="flex bg-muted/20 p-1 rounded-xl lg:rounded-2xl ring-1 ring-border/50 backdrop-blur-sm flex-1 sm:flex-none">
             <Input value={simName} onChange={e => setSimName(e.target.value)} className="h-8 lg:h-9 w-24 lg:w-40 bg-transparent border-none font-bold text-[9px] lg:text-[10px] uppercase tracking-widest focus-visible:ring-0 px-2" placeholder={t("app.common.name")} />
             <Button onClick={saveSimulation} disabled={loading} className="rounded-lg lg:rounded-xl h-8 lg:h-9 px-3 lg:px-4 font-black uppercase text-[9px] lg:text-[10px] tracking-widest shadow-xl shadow-primary/20"><Save size={14} className="mr-1.5" /> {t("app.common.save")}</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="lg:col-span-3 p-6 lg:p-8 bg-[#0f172a] text-white border-none shadow-2xl rounded-[32px] lg:rounded-[48px] relative overflow-hidden group min-h-[300px] lg:min-h-[400px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          <div className="relative z-10 space-y-6 lg:space-y-8 h-full flex flex-col justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.2em] opacity-40 mb-2 lg:mb-3 whitespace-nowrap">{t("app.simulator.projected")}</p>
                <h2 className="text-3xl sm:text-4xl lg:text-[5.5vw] xl:text-7xl font-black tracking-tighter text-emerald-400 mb-6 whitespace-nowrap overflow-visible">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "THB", minimumFractionDigits: 2 }).format(stats.totalTarget)}
                </h2>
                <div className="flex gap-3 lg:gap-4">
                  <div className="bg-white/5 rounded-2xl lg:rounded-3xl p-3 lg:p-4 flex-1 border border-white/10 shadow-inner min-w-0">
                    <p className="text-[8px] lg:text-[9px] font-black uppercase opacity-40 mb-1">{t("app.simulator.invested")}</p>
                    <p className="text-sm lg:text-lg font-black tracking-tighter truncate" title={formatMoney(stats.totalInvested)}>{formatMoney(stats.totalInvested)}</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl lg:rounded-3xl p-3 lg:p-4 flex-1 border border-white/10 shadow-inner min-w-0">
                    <p className="text-[8px] lg:text-[9px] font-black uppercase opacity-40 mb-1">{t("app.simulator.growth")}</p>
                    <p className="text-sm lg:text-lg font-black tracking-tighter text-emerald-400 truncate" title={formatMoney(Math.max(0, stats.totalGain))}>+{formatMoney(Math.max(0, stats.totalGain))}</p>
                  </div>
                </div>
              </div>
              <div className="h-48 lg:h-64 pt-4 -ml-4 lg:ml-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs><linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="year" hide />
                    <YAxis hide />
                    <Tooltip formatter={(v: any) => isFinite(Number(v)) ? numFmt.format(Number(v)) : "0"} contentStyle={{ borderRadius: '20px', backgroundColor: '#1e293b', border: 'none', color: '#fff', fontSize: '10px', fontWeight: 'bold', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} itemStyle={{ color: '#fff' }} />
                    <Area type="monotone" dataKey="Total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#simGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-6 lg:p-8 border-none bg-muted/20 backdrop-blur-sm ring-1 ring-border/50 rounded-[32px] lg:rounded-[48px] overflow-hidden flex flex-col min-h-[300px] lg:min-h-[400px]">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 lg:mb-6 flex items-center gap-2"><History size={14} /> {t("app.simulator.forecastHistory")}</p>
          <div className="space-y-2 lg:space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-hide">
            {savedSims.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <Sparkles size={24} className="mb-2" />
                <p className="text-[9px] font-black uppercase tracking-tight">{t("app.common.noData")}</p>
              </div>
            ) : savedSims.map(s => (
              <div key={s.id} className="p-3 lg:p-4 rounded-2xl lg:rounded-3xl bg-background shadow-sm ring-1 ring-border/40 group hover:ring-primary/40 transition-all cursor-pointer" onClick={() => { setPlans(s.config.plans); setSimName(s.name); }}>
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-[9px] lg:text-[10px] uppercase truncate">{s.name}</p>
                    <p className="text-[8px] lg:text-[9px] text-muted-foreground font-bold mt-0.5">{format(new Date(s.updated_at), "MMM d, yyyy")}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded-lg text-rose-500 opacity-100 lg:opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); supabase.from("pp_simulations").delete().eq("id", s.id).then(() => loadSaved()); }}>
                    <Trash2 size={10} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-1 space-y-4 lg:space-y-6">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] lg:text-sm font-black uppercase tracking-widest text-muted-foreground opacity-60">{t("app.simulator.scenario")}</h3>
            <Badge variant="secondary" className="rounded-lg h-5 font-black text-[8px] lg:text-[9px] bg-primary/10 text-primary border-none">{plans.length} {t("app.simulator.nodes")}</Badge>
          </div>
          <div className="space-y-3 lg:space-y-4">
            {plans.map((p, i) => (<AssetPanel key={p.id} asset={p} onChange={updated => setPlans(plans.map(x => x.id === p.id ? updated : x))} onRemove={() => setPlans(plans.filter(x => x.id !== p.id))} canRemove={plans.length > 1} />))}
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          <div className="flex items-center justify-between pl-1"><h3 className="text-[10px] lg:text-sm font-black uppercase tracking-widest text-muted-foreground opacity-60">Growth Comparison</h3></div>
          <Card className="p-4 lg:p-8 rounded-[32px] lg:rounded-[48px] border-none shadow-sm ring-1 ring-border/40 bg-background overflow-hidden h-[350px] lg:h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>{computed.map((p, i) => (<linearGradient key={p.id} id={`grad_${p.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={p.color} stopOpacity={0.1}/><stop offset="95%" stopColor={p.color} stopOpacity={0}/></linearGradient>))}</defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000005" vertical={false} />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} minTickGap={30} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} tickFormatter={v => `฿${(v/1e6).toFixed(1)}M`} />
                <Tooltip formatter={(v: any) => isFinite(Number(v)) ? numFmt.format(Number(v)) : "0"} contentStyle={{ borderRadius: '20px', backgroundColor: '#fff', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', textTransform: 'uppercase', fontSize: '8px', fontWeight: '900', letterSpacing: '0.1em' }} />
                {computed.map((p, i) => (<Area key={p.id} type="monotone" dataKey={p.name} stroke={p.color} strokeWidth={2.5} fillOpacity={1} fill={`url(#grad_${p.id})`} />))}
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Simulator;
