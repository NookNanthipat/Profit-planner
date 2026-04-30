import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  TrendingUp, TrendingDown, Wallet, Briefcase, Plus, Pencil, Trash2, 
  RefreshCw, ChevronRight, ChevronDown, PieChart as PieIcon, LineChart, 
  BarChart2, Loader2, DollarSign, ExternalLink, Info, Search, Filter, Clock, Globe, Image as ImageIcon, CheckCircle2, AlertCircle, Database, CalendarIcon, Bug, FilterX, Layers, Layout, 
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { format, subHours, isAfter, parseISO, subDays, subMonths, subYears, startOfYear, eachDayOfInterval, isSameDay, min, isBefore, differenceInDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatMoney, type PPAsset, type PPAssetLot, type AssetType } from "@/lib/profitPlanner";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const USD_RATE = 36.5; 
const CHART_COLORS = ['#6366f1', '#3b82f6', '#8b5cf6', '#f59e0b', '#f97316', '#22c55e', '#14b8a6', '#ec4899', '#9ca3af'];

// ─── Precision Engine V2.2 ──────────────────────────────────────────────────

async function fetchAssetMarketData(symbol: string, type: AssetType, addLog: (m: string) => void) {
  const cleanSym = symbol.trim().toUpperCase();
  if (!cleanSym) return null;

  try {
    addLog(`Step 1: Checking local persistence...`);
    const { data: cache } = await supabase.from("pp_market_cache").select("*").eq("symbol", cleanSym).single();
    if (cache && isAfter(new Date(cache.updated_at), subHours(new Date(), 1))) {
       addLog(`[CACHE HIT] Fresh data found (${format(new Date(cache.updated_at), "HH:mm")})`);
       return { price: cache.price, source: cache.source, logo: cache.logo_url, fullName: cache.name, displaySymbol: cleanSym, time: cache.updated_at };
    }

    let result = null;

    if (type === "crypto") {
       addLog("Step 2: Connecting to Binance Global...");
       const pair = cleanSym.endsWith('USDT') ? cleanSym : `${cleanSym}USDT`;
       const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
       const data = await res.json();
       if (data.price) {
          result = { price: parseFloat(data.price), source: "Binance Real-time", logo: `https://api.dicebear.com/7.x/initials/svg?seed=${cleanSym}&backgroundColor=f3ba2f`, fullName: `${cleanSym} / USDT`, displaySymbol: cleanSym };
       }
    }

    if (!result) {
       addLog(`Step 3: Accessing Global Markets via Hybrid Bridge for ${cleanSym}...`);
       const tickerCandidates = [cleanSym];
       if (type === "stock") tickerCandidates.unshift(`${cleanSym}.BK`);

       for (const t of tickerCandidates) {
          try {
            const proxies = [
              (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&cb=${Math.random().toString(36).substring(7)}`,
              (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
            ];
            const endpoints = [
              `https://query2.finance.yahoo.com/v8/finance/chart/${t}?interval=1d&range=1d`,
              `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${t}`
            ];

            for (const proxyFn of proxies) {
              for (const endpoint of endpoints) {
                try {
                  const res = await fetch(proxyFn(endpoint));
                  const wrapper = await res.json();
                  const data = typeof wrapper.contents === 'string' ? JSON.parse(wrapper.contents) : wrapper;
                  
                  if (data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
                    const meta = data.chart.result[0].meta;
                    addLog(`[SUCCESS] Yahoo v8 verified: ${t}`);
                    result = {
                      price: meta.regularMarketPrice,
                      source: meta.exchangeName || "Global Market",
                      logo: `https://logo.clearbit.com/${t.split('.')[0].toLowerCase()}.com`,
                      fullName: meta.symbol || cleanSym,
                      displaySymbol: meta.symbol,
                      currency: meta.currency || (type === "stock_us" ? "USD" : "THB")
                    };
                    break;
                  }
                  
                  const quote = data?.quoteResponse?.result?.[0];
                  if (quote && quote.regularMarketPrice) {
                    addLog(`[SUCCESS] Yahoo v7 verified: ${quote.longName || t}`);
                    result = {
                      price: quote.regularMarketPrice,
                      source: quote.fullExchangeName || "Global Market",
                      logo: `https://logo.clearbit.com/${t.split('.')[0].toLowerCase()}.com`,
                      fullName: quote.longName || quote.shortName || cleanSym,
                      displaySymbol: quote.symbol,
                      currency: quote.currency || (type === "stock_us" ? "USD" : "THB")
                    };
                    break;
                  }
                } catch (e) { continue; }
              }
              if (result) break;
            }
            if (result) break;
          } catch (e) { continue; }
       }
    }

    if (!result) {
       addLog("Step 4: Attempting Emergency Fallback (Finnhub)...");
       const tokens = [import.meta.env.VITE_FINNHUB_TOKEN as string, "sandbox_c8v7lka23idfeqf1u9v0"].filter(Boolean);
       for (const token of tokens) {
         try {
           const fRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${cleanSym}&token=${token}`);
           const fData = await fRes.json();
           if (fData.c && fData.c !== 0) {
              addLog(`[SUCCESS] Finnhub verified: ${cleanSym}`);
              result = { price: fData.c, source: "Finnhub Emergency", logo: "", fullName: cleanSym, displaySymbol: cleanSym };
              break;
           }
         } catch (e) { continue; }
       }
    }

    if (result) {
       addLog(`Memorizing data for ${cleanSym}...`);
       await supabase.from("pp_market_cache").upsert({
         symbol: cleanSym, price: result.price, name: result.fullName, logo_url: result.logo, source: result.source, updated_at: new Date().toISOString()
       });
       return { ...result, time: new Date().toISOString() };
    }

    addLog("CRITICAL: All data sources exhausted.");
    return null;
  } catch (e: any) {
    addLog(`Engine Error: ${e.message}`);
    return null;
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AssetFormModal({ open, onOpenChange, asset, portfolios, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; asset?: any | null; portfolios: string[]; onSaved: () => void; }) {
  const { t } = useTranslation();
  const { user } = useAuth(); const { toast } = useToast();
  const [f, setF] = useState({ name: "", full_name: "", type: "stock_us" as AssetType, currency: "USD", logo_url: "", data_source: "", sub_portfolio: "Main Portfolio" });
  const [lookupLoading, setLookupLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isNewPort, setIsNewPort] = useState(false);

  useEffect(() => {
    if (asset) setF({ name: asset.name, full_name: asset.full_name || "", type: asset.type, currency: asset.currency, logo_url: asset.logo_url || "", data_source: asset.data_source || "", sub_portfolio: asset.sub_portfolio || "Main Portfolio" });
    else setF({ name: "", full_name: "", type: "stock_us", currency: "USD", logo_url: "", data_source: "", sub_portfolio: portfolios[0] || "Main Portfolio" });
    setPreview(null); setLogs([]); setShowLogs(false); setIsNewPort(false);
  }, [asset, open, portfolios]);

  const addLog = (m: string) => setLogs(prev => [...prev, `${format(new Date(), "HH:mm:ss")} - ${m}`]);

  const handleLookup = async () => {
    if (!f.name) return; setLookupLoading(true); setPreview(null); setLogs([]);
    addLog(`Initiating lookup for [${f.name}]...`);
    const data = await fetchAssetMarketData(f.name, f.type, addLog);
    if (data) {
       setPreview(data);
       setF(prev => ({ ...prev, name: data.displaySymbol || prev.name, full_name: data.fullName || prev.full_name, logo_url: data.logo || "", data_source: data.source, currency: data.currency || prev.currency }));
    } else {
       setShowLogs(true);
       toast({ title: t("app.common.error"), variant: "destructive" });
    }
    setLookupLoading(false);
  };

  const submit = async () => {
    if (!user || !f.name) return; setSaving(true);
    try {
      const row = { ...f, user_id: user.id, current_price: preview?.price || asset?.current_price || 0, last_price_updated_at: preview?.time || asset?.last_price_updated_at || new Date().toISOString() };
      const { error } = asset ? await supabase.from("pp_assets").update(row).eq("id", asset.id) : await supabase.from("pp_assets").insert(row);
      if (error) throw error; toast({ title: t("app.common.success") }); onSaved(); onOpenChange(false);
    } catch (e: any) { toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); } finally { setSaving(false); }
  };

  const ASSET_TYPES: AssetType[] = ["stock", "stock_us", "fund", "gold", "crypto", "bond", "cash", "property", "other"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[32px] p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 pb-0"><DialogTitle className="font-black uppercase tracking-tight flex items-center gap-2">{asset ? t("app.common.edit") : t("app.portfolio.newAsset")}</DialogTitle></DialogHeader>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase opacity-60">Portfolio Group</Label>
              <button onClick={() => setIsNewPort(!isNewPort)} className="h-6 text-[9px] font-black uppercase tracking-widest text-primary p-0 hover:bg-transparent">
                {isNewPort ? t("app.common.all") : "+ " + t("app.common.add")}
              </button>
            </div>
            {isNewPort ? (
              <Input value={f.sub_portfolio} onChange={e => setF({ ...f, sub_portfolio: e.target.value })} placeholder="New Portfolio Name..." className="h-11 rounded-xl bg-muted/20 border-none font-bold" />
            ) : (
              <Select value={f.sub_portfolio} onValueChange={v => setF({ ...f, sub_portfolio: v })}>
                <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none font-bold"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {portfolios.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  {portfolios.length === 0 && <SelectItem value="Main Portfolio">Main Portfolio</SelectItem>}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase opacity-60">{t("app.common.type")}</Label>
              <Select value={f.type} onValueChange={(v: AssetType) => setF({ ...f, type: v })}><SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none font-bold"><SelectValue /></SelectTrigger><SelectContent className="rounded-2xl shadow-xl">{ASSET_TYPES.map(k => (<SelectItem key={k} value={k}>{t(`app.types.asset.${k}`)}</SelectItem>))}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase opacity-60">{t("app.common.currency")}</Label><Select value={f.currency} onValueChange={v => setF({ ...f, currency: v })}><SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none font-bold"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="THB">฿ THB</SelectItem><SelectItem value="USD">$ USD</SelectItem></SelectContent></Select></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 relative"><Label className="text-[10px] font-black uppercase opacity-60">Symbol</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value.toUpperCase() })} placeholder="e.g. NVDA" className="h-11 rounded-xl bg-muted/20 border-none font-black uppercase" /><button type="button" onClick={handleLookup} disabled={lookupLoading} className="absolute right-2 top-[30px] p-1.5 hover:bg-primary/10 rounded-lg text-primary">{lookupLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}</button></div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase opacity-60">{t("app.common.name")}</Label>
              <Input value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} placeholder="Company Name" className="h-11 rounded-xl bg-muted/20 border-none font-bold" />
            </div>
          </div>

          {preview && (
            <Card className="p-4 rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 animate-in zoom-in-95">
               <div className="flex items-center justify-between">
                 <div><p className="text-[10px] font-black uppercase opacity-60">{t("app.portfolio.currentPrice")}</p><p className="text-xl font-black text-emerald-700 tracking-tighter">{formatMoney(preview.price, f.currency)}</p></div>
                 <Badge variant="outline" className="text-[8px] uppercase font-black">{preview.source}</Badge>
               </div>
            </Card>
          )}
        </div>
        <DialogFooter className="p-6 bg-muted/10 border-t border-border/40 flex justify-between gap-2"><Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase text-[10px]">{t("app.common.discard")}</Button><Button onClick={submit} disabled={saving} className="rounded-xl px-10 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">{saving ? t("app.common.save") + "..." : t("app.common.save")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssetLotModal({ open, onOpenChange, asset, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; asset: any; onSaved: () => void; }) {
  const { t } = useTranslation();
  const { user } = useAuth(); const { toast } = useToast();
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [f, setF] = useState({ qty: "", cost_per_unit: "", occurred_on: format(new Date(), "yyyy-MM-dd"), note: "" });
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState<Date>(new Date());

  useEffect(() => {
    if (open) { setF({ qty: "", cost_per_unit: "", occurred_on: format(new Date(), "yyyy-MM-dd"), note: "" }); setDate(new Date()); setMode("buy"); }
  }, [open]);

  const submit = async () => {
    if (!user || !f.qty || !f.cost_per_unit) return;
    setSaving(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const multiplier = mode === "sell" ? -1 : 1;
      
      const { error: lotErr } = await supabase.from("pp_asset_lots").insert({
        user_id: user.id, 
        asset_id: asset.id, 
        qty: Number(f.qty) * multiplier, 
        cost_per_unit: Number(f.cost_per_unit), 
        occurred_on: dateStr, 
        note: f.note
      });
      if (lotErr) throw lotErr;

      // Also upsert a price history point for this date to ensure graph has data
      await supabase.from("pp_asset_price_history").upsert({
        user_id: user.id,
        asset_id: asset.id,
        price: Number(f.cost_per_unit),
        recorded_at: dateStr
      }, { onConflict: "asset_id,recorded_at" });

      toast({ title: t("app.common.success") }); onSaved(); onOpenChange(false);
    } catch (e: any) { toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[32px] p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-black uppercase tracking-tight flex items-center justify-between">
            <div className="flex items-center gap-2">{mode === "buy" ? t("app.portfolio.addLot") : "Sell Asset"} <Badge variant="secondary" className="text-[8px] bg-primary/10 text-primary border-none">{asset?.name}</Badge></div>
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-5">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
             <button onClick={() => setMode("buy")} className={cn("flex-1 h-9 rounded-lg text-[10px] font-black uppercase transition-all", mode === "buy" ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-500")}>Buy</button>
             <button onClick={() => setMode("sell")} className={cn("flex-1 h-9 rounded-lg text-[10px] font-black uppercase transition-all", mode === "sell" ? "bg-white dark:bg-slate-800 text-rose-500 shadow-sm" : "text-slate-500")}>Sell</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase opacity-60">Quantity</Label><Input type="number" value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} placeholder="0.00" className="h-11 rounded-xl bg-muted/20 border-none font-bold" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase opacity-60">Price Per Unit ({asset?.currency})</Label><Input type="number" value={f.cost_per_unit} onChange={e => setF({ ...f, cost_per_unit: e.target.value })} placeholder="0.00" className="h-11 rounded-xl bg-muted/20 border-none font-bold" /></div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase opacity-60">{t("app.common.date")}</Label>
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" className={cn("w-full h-11 rounded-xl bg-muted/20 border-none font-bold justify-start text-left", !date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "PPP") : <span>{t("app.common.date")}</span>}</Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl" align="start"><Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="rounded-2xl" /></PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase opacity-60">{t("app.common.note")}</Label><Input value={f.note} onChange={e => setF({ ...f, note: e.target.value })} placeholder="e.g. Bought on dip" className="h-11 rounded-xl bg-muted/20 border-none font-bold" /></div>
        </div>
        <DialogFooter className="p-6 bg-muted/10 border-t border-border/40 flex justify-between gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase text-[10px]">{t("app.common.cancel")}</Button>
          <Button onClick={submit} disabled={saving} className={cn("rounded-xl px-10 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20", mode === "sell" && "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20 text-white")}>{saving ? t("app.common.save") + "..." : (mode === "buy" ? "Confirm Buy" : "Confirm Sell")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LotManagerModal({ open, onOpenChange, asset, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; asset: any; onSaved: () => void; }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [lots, setLots] = useState<any[]>([]);
  const [editingLot, setEditLot] = useState<any>(null);

  const load = async () => {
    if (!asset) return; setLoading(true);
    const { data, error } = await supabase.from("pp_asset_lots").select("*").eq("asset_id", asset.id).order("occurred_on", { ascending: false });
    if (data) setLots(data);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open, asset]);

  const deleteLot = async (id: string) => {
    if (!confirm("Delete this lot?")) return;
    const { error } = await supabase.from("pp_asset_lots").delete().eq("id", id);
    if (!error) { toast({ title: t("app.common.success") }); load(); onSaved(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[32px] p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-black uppercase tracking-tight flex items-center justify-between">
            <div className="flex items-center gap-2">Manage Lots <Badge variant="secondary" className="bg-primary/10 text-primary border-none">{asset?.name}</Badge></div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-[9px] font-black uppercase">Date</TableHead>
                  <TableHead className="text-right text-[9px] font-black uppercase">Qty</TableHead>
                  <TableHead className="text-right text-[9px] font-black uppercase">Cost</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Note</TableHead>
                  <TableHead className="text-right text-[9px] font-black uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                ) : lots.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-[10px] font-bold opacity-30 uppercase">No records found</TableCell></TableRow>
                ) : lots.map(l => (
                  <TableRow key={l.id} className="border-slate-50">
                    <TableCell className="text-[10px] font-bold">{l.occurred_on}</TableCell>
                    <TableCell className="text-right text-[10px] font-black">{l.qty.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-[10px] font-black">{formatMoney(l.cost_per_unit, asset.currency)}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground italic truncate max-w-[100px]">{l.note || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500" onClick={() => deleteLot(l.id)}><Trash2 size={10} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter className="p-6 bg-muted/5 border-t flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl font-black uppercase text-[10px]">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Module ─────────────────────────────────────────────────────────────

const Portfolio = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth(); const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  const [assets, setAssets] = useState<any[]>([]); 
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState(""); 
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [portFilter, setPortFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false); 
  const [editItem, setEditItem] = useState<any | null>(null); 
  const [lotModalAsset, setLotModalAsset] = useState<any | null>(null); 
  const [lotManagerAsset, setLotManagerAsset] = useState<any | null>(null);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [chartMode, setChartMode] = useState<"total" | "separate">("separate");
  const [timeRange, setTimeRange] = useState<string>("ALL");
  const [usdRate, setUsdRate] = useState(36.5);

  const load = async () => {
    if (!user) return; setLoading(true);
    try {
      const [assetsRes, historyRes, rateRes] = await Promise.all([
        supabase.from("pp_assets").select(`*, lots:pp_asset_lots(*)`).eq("user_id", user.id).order("name"),
        supabase.from("pp_asset_price_history").select("*").eq("user_id", user.id).order("recorded_at", { ascending: true }),
        fetch("https://open.er-api.com/v6/latest/USD").then(res => res.json()).catch(() => ({ rates: { THB: 36.5 } }))
      ]);
      
      if (assetsRes.error) throw assetsRes.error;
      if (historyRes.error) throw historyRes.error;
      
      setAssets(assetsRes.data ?? []);
      setHistory(historyRes.data ?? []);
      if (rateRes?.rates?.THB) setUsdRate(rateRes.rates.THB);
    } catch (e: any) { toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [user]);

  const portfoliosList = useMemo(() => Array.from(new Set(assets.map(a => a.sub_portfolio || "Main Portfolio"))).sort(), [assets]);

  const totalStats = useMemo(() => {
    let totalValueTHB = 0; let totalCostTHB = 0;
    const byType: Record<string, number> = {};
    const byPort: Record<string, number> = {};

    assets.forEach(a => {
      const totalQty = (a.lots ?? []).reduce((s: any, l: any) => s + Number(l.qty), 0);
      const totalCost = (a.lots ?? []).reduce((s: any, l: any) => s + (Number(l.qty) * Number(l.cost_per_unit)), 0);
      const rate = a.currency === "USD" ? usdRate : 1; 
      const marketValueTHB = (a.current_price || 0) * totalQty * rate;
      const subName = a.sub_portfolio || "Main Portfolio";
      
      totalValueTHB += marketValueTHB;
      totalCostTHB += (totalCost * rate);

      if (!byType[a.type]) byType[a.type] = 0;
      byType[a.type] += marketValueTHB;

      if (!byPort[subName]) byPort[subName] = 0;
      byPort[subName] += marketValueTHB;
    });

    const typeAllocation = Object.entries(byType).map(([k, v]) => ({ 
      name: t(`app.types.asset.${k}`), 
      value: v,
      pct: totalValueTHB > 0 ? (v / totalValueTHB) * 100 : 0,
      fill: CHART_COLORS[Object.keys(byType).indexOf(k) % CHART_COLORS.length]
    }));

    const portAllocation = Object.entries(byPort).map(([k, v], i) => ({
      name: k,
      value: v,
      pct: totalValueTHB > 0 ? (v / totalValueTHB) * 100 : 0,
      fill: CHART_COLORS[i % CHART_COLORS.length]
    }));

    return { totalValueTHB, totalCostTHB, gain: totalValueTHB - totalCostTHB, gainPct: totalCostTHB > 0 ? ((totalValueTHB - totalCostTHB) / totalCostTHB) * 100 : 0, typeAllocation, portAllocation };
  }, [assets, t, usdRate]);

  const filteredData = useMemo(() => {
    let totalValueTHB = 0;
    const bySub: Record<string, any> = {};
    const detailWeights: Record<string, number> = {};

    const items = assets.filter(a => {
      const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.full_name || "").toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || a.type === typeFilter;
      const matchPort = portFilter === "all" || (a.sub_portfolio || "Main Portfolio") === portFilter;
      return matchSearch && matchType && matchPort;
    });

    items.forEach(a => {
      const subName = a.sub_portfolio || "Main Portfolio";
      const totalQty = (a.lots ?? []).reduce((s: any, l: any) => s + Number(l.qty), 0);
      const totalCost = (a.lots ?? []).reduce((s: any, l: any) => s + (Number(l.qty) * Number(l.cost_per_unit)), 0);
      const rate = a.currency === "USD" ? usdRate : 1; 
      const marketValue = (a.current_price || 0) * totalQty;
      const marketValueTHB = marketValue * rate;
      
      totalValueTHB += marketValueTHB;

      const weightKey = typeFilter === "all" ? a.type : a.name;
      if (!detailWeights[weightKey]) detailWeights[weightKey] = 0;
      detailWeights[weightKey] += marketValueTHB;

      if (!bySub[subName]) bySub[subName] = { totalValue: 0, types: {} };
      bySub[subName].totalValue += marketValueTHB;

      if (!bySub[subName].types[a.type]) bySub[subName].types[a.type] = { name: t(`app.types.asset.${a.type}`), totalValue: 0, assets: [] };
      bySub[subName].types[a.type].totalValue += marketValueTHB;
      bySub[subName].types[a.type].assets.push({ ...a, totalQty, totalCost, marketValue, rate });
    });

    const allocation = Object.entries(detailWeights).map(([k, v], i) => {
      return {
        name: k.length < 20 ? k : t(`app.types.asset.${k}`) || k,
        value: v,
        pct: totalValueTHB > 0 ? (v / totalValueTHB) * 100 : 0,
        fill: CHART_COLORS[i % CHART_COLORS.length]
      };
    });

    return { totalValueTHB, bySub, allocation, items };
  }, [assets, search, typeFilter, portFilter, t, usdRate]);

  const chartData = useMemo(() => {
    if (assets.length === 0) return [];
    
    // 1. Find earliest date among all lots
    let allLotDates: Date[] = [];
    assets.forEach(a => {
      (a.lots || []).forEach((l: any) => {
        allLotDates.push(parseISO(l.occurred_on));
      });
    });
    
    const startDate = allLotDates.length > 0 ? min(allLotDates) : subDays(new Date(), 30);
    const today = new Date();
    
    // 2. Generate each day from startDate to today
    const days = eachDayOfInterval({ start: startDate, end: today });
    
    // 3. For each day, calculate cumulative total value
    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      let dayTotalTHB = 0;
      let dayGainTHB = 0;

      assets.forEach(a => {
        const rate = a.currency === "USD" ? usdRate : 1;
        
        // Qty up to this day
        const qtyUpToDay = (a.lots || []).reduce((sum: number, lot: any) => {
          if (isBefore(parseISO(lot.occurred_on), day) || isSameDay(parseISO(lot.occurred_on), day)) {
            return sum + Number(lot.qty);
          }
          return sum;
        }, 0);

        // Price at or before this day
        // Find price history points for this asset before or on this day
        const assetHistory = history
          .filter(h => h.asset_id === a.id && (isBefore(parseISO(h.recorded_at), day) || isSameDay(parseISO(h.recorded_at), day)))
          .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
        
        // Use history price if found, else use initial cost of earliest lot, else 0
        let priceAtDay = 0;
        if (assetHistory.length > 0) {
          priceAtDay = assetHistory[0].price;
        } else {
          // Fallback to earliest lot price if no history recorded yet for that day
          const earliestLot = (a.lots || []).sort((a: any, b: any) => a.occurred_on.localeCompare(b.occurred_on))[0];
          if (earliestLot && (isBefore(parseISO(earliestLot.occurred_on), day) || isSameDay(parseISO(earliestLot.occurred_on), day))) {
            priceAtDay = Number(earliestLot.cost_per_unit);
          }
        }

        const valueTHB = qtyUpToDay * priceAtDay * rate;
        dayTotalTHB += valueTHB;
        
        // Gain logic: (Price - AvgCost) * Qty
        const avgCost = (a.lots || []).reduce((s: any, l: any) => s + (Number(l.qty) * Number(l.cost_per_unit)), 0) / (a.lots || []).reduce((s: any, l: any) => s + Number(l.qty), 1);
        dayGainTHB += (priceAtDay - avgCost) * qtyUpToDay * rate;
      });

      return {
        date: format(day, "MMM d"),
        fullDate: dateStr,
        total: dayTotalTHB,
        gain: dayGainTHB
      };
    });
  }, [history, assets, usdRate]);

  const updateAllPrices = async () => {
    if (assets.length === 0) return; setUpdatingPrices(true);
    toast({ title: t("app.common.sync"), description: "Executing precision sync chain..." });
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      for (const asset of assets) {
        if (["property", "bond", "other", "cash", "fund"].includes(asset.type)) continue;
        const market = await fetchAssetMarketData(asset.name, asset.type, () => {});
        if (market) {
          await supabase.from("pp_assets").update({ 
            current_price: market.price, 
            last_price_updated_at: market.time, 
            data_source: market.source, 
            logo_url: market.logo || asset.logo_url 
          }).eq("id", asset.id);
          
          await supabase.from("pp_asset_price_history").upsert({
            user_id: user.id,
            asset_id: asset.id,
            price: market.price,
            recorded_at: today
          }, { onConflict: "asset_id,recorded_at" });
        }
      }
      toast({ title: t("app.common.success") }); load();
    } catch (e: any) { toast({ title: t("app.common.error") }); } finally { setUpdatingPrices(false); }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{payload[0].name}</p>
          <p className="text-lg font-black text-slate-800 dark:text-white">฿{payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-[11px] font-bold text-primary">{payload[0].payload.pct?.toFixed(1) || 0}%</p>
        </div>
      );
    }
    return null;
  };

  const GrowthTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const gain = data.gain;
      const isPositive = gain >= 0;

      return (
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2 border-b pb-1">{label}</p>
          <div className="space-y-1.5">
            {payload.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-[10px] font-black uppercase text-slate-500">{p.name}</span>
                </div>
                <span className="text-xs font-black text-slate-800 dark:text-white">฿{p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
            <div className="pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500">Net Return</span>
              <span className={cn("text-xs font-black", isPositive ? "text-emerald-600" : "text-rose-600")}>
                {isPositive ? "+" : ""}
                {gain.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-20 w-full max-w-6xl mx-auto overflow-x-hidden">
      {!disclaimerDismissed && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-sm">
          <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="flex-1 text-muted-foreground leading-relaxed">
            <strong className="text-foreground">{i18n.language === "th" ? "ไม่ใช่คำแนะนำการลงทุน" : "Not financial advice."}</strong>
            {" "}
            {i18n.language === "th"
              ? "ข้อมูลพอร์ตนี้มีไว้เพื่อการติดตามและการศึกษาเท่านั้น ProfitPlanner ไม่ใช่ที่ปรึกษาทางการเงินที่ได้รับใบอนุญาต ราคาตลาดอาจมีความล่าช้า"
              : "Portfolio data is for tracking and educational purposes only. ProfitPlanner is not a licensed financial advisor. Market prices may be delayed."}
          </p>
          <button
            onClick={() => setDisclaimerDismissed(true)}
            className="text-muted-foreground hover:text-foreground shrink-0 text-lg leading-none"
            aria-label="Dismiss"
          >×</button>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap animate-in fade-in duration-500">
        <div className="min-w-0"><h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter !text-slate-900 dark:!text-white truncate">{t("app.portfolio.title")}</h1><p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">Global Precision Management V2.2</p></div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl h-11 px-4 border-none flex items-center gap-2 whitespace-nowrap">
            <span className="text-[8px] font-black uppercase opacity-40">Rate</span>
            <span className="font-bold text-[10px]">1 USD = ฿{usdRate.toFixed(2)}</span>
          </Badge>
          <Button variant="outline" onClick={updateAllPrices} disabled={updatingPrices || assets.length === 0} className="rounded-2xl h-11 px-4 lg:px-6 font-black uppercase text-[10px] tracking-widest border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground shadow-sm gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 shrink-0">
            {updatingPrices ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} className="text-primary" />} {t("app.common.sync")}
          </Button>
          <Button onClick={() => { setEditItem(null); setFormOpen(true); }} className="rounded-2xl h-11 px-4 lg:px-6 font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all text-white shrink-0"><Plus size={18} className="mr-2" /> {t("app.portfolio.newAsset")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="md:col-span-2 p-6 lg:p-8 bg-slate-900 text-white border-none shadow-2xl rounded-[32px] lg:rounded-[40px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
          <div className="relative z-10 space-y-6">
            <div>
              <p className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.2em] opacity-50 mb-2">{t("app.portfolio.totalValue")}</p>
              <h2 className="text-3xl lg:text-5xl font-black tracking-tighter">฿{totalStats.totalValueTHB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/5 backdrop-blur-md rounded-[20px] lg:rounded-[24px] p-3 lg:p-4 flex-1 border border-white/10 shadow-inner">
                <p className="text-[8px] lg:text-[9px] font-black uppercase opacity-40 mb-1">{t("app.portfolio.netGain")}</p>
                <p className={cn("text-base lg:text-xl font-black tracking-tighter", totalStats.gain >= 0 ? "text-emerald-400" : "text-rose-400")}>{totalStats.gain >= 0 ? "+" : ""}{formatMoney(Math.abs(totalStats.gain))}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-[20px] lg:rounded-[24px] p-3 lg:p-4 flex-1 border border-white/10 shadow-inner">
                <p className="text-[8px] lg:text-[9px] font-black uppercase opacity-40 mb-1">{t("app.portfolio.dayChange")}</p>
                <p className={cn("text-base lg:text-xl font-black tracking-tighter", totalStats.gainPct >= 0 ? "text-emerald-400" : "text-rose-400")}>{totalStats.gainPct >= 0 ? "+" : ""}{totalStats.gainPct.toFixed(2)}%</p>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 lg:p-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-[32px] lg:rounded-[40px] flex flex-col justify-center items-center relative overflow-hidden shadow-sm h-64 lg:h-auto">
          <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2 absolute top-6 text-center text-slate-500">{t("app.portfolio.allocation")}</p>
          <div className="w-full h-40 lg:h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={totalStats.typeAllocation} innerRadius={30} outerRadius={45} paddingAngle={4} dataKey="value">
                  {totalStats.typeAllocation.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 lg:p-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-[32px] lg:rounded-[40px] flex flex-col justify-center items-center relative overflow-hidden shadow-sm h-64 lg:h-auto">
          <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2 absolute top-6 text-center text-slate-500">{t("app.portfolio.allocation")}</p>
          <div className="w-full h-40 lg:h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={totalStats.portAllocation} innerRadius={30} outerRadius={45} paddingAngle={4} dataKey="value">
                  {totalStats.portAllocation.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center animate-in fade-in duration-700">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder={t("app.common.search")} 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="h-12 rounded-2xl pl-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm font-bold text-xs focus:ring-primary/20" 
          />
        </div>
        
        <Select value={portFilter} onValueChange={setPortFilter}>
          <SelectTrigger className="h-12 rounded-2xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm font-black uppercase text-[10px] tracking-widest shrink-0">
            <div className="flex items-center gap-2">
              <Briefcase size={14} className="text-primary" />
              <SelectValue placeholder={t("app.common.all")} />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-none shadow-2xl">
            <SelectItem value="all" className="font-black text-[10px] uppercase tracking-widest">Global Portfolio</SelectItem>
            {portfoliosList.map(p => <SelectItem key={p} value={p} className="font-bold text-[10px] uppercase">{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter} className="flex-1">
            <SelectTrigger className="h-12 flex-1 rounded-2xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm font-black uppercase text-[10px] tracking-widest shrink-0">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-primary" />
                <SelectValue placeholder={t("app.common.type")} />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-2xl">
              <SelectItem value="all" className="font-black text-[10px] uppercase tracking-widest">{t("app.common.all")}</SelectItem>
              {["stock", "stock_us", "fund", "gold", "crypto", "bond", "cash", "property", "other"].map(k => (
                <SelectItem key={k} value={k} className="font-bold text-[10px] uppercase">
                  {t(`app.types.asset.${k}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || typeFilter !== "all" || portFilter !== "all") && (
            <button 
              onClick={() => { setSearch(""); setTypeFilter("all"); setPortFilter("all"); }} 
              className="h-12 w-12 rounded-2xl p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-black transition-all shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700"
            >
              <FilterX size={18} />
            </button>
          )}
        </div>
      </div>

      {loading ? (<div className="py-32 text-center flex flex-col items-center gap-6"><div className="w-16 h-16 rounded-full border-8 border-primary/10 border-t-primary animate-spin" /><p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground animate-pulse">{t("app.common.loading")}</p></div>) : Object.keys(filteredData.bySub).length === 0 ? (<Card className="p-24 lg:p-32 text-center border-dashed border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-[32px] lg:rounded-[40px] shadow-sm"><div className="w-16 h-16 lg:w-24 lg:h-24 bg-primary/5 rounded-[24px] lg:rounded-[32px] flex items-center justify-center mx-auto mb-6 lg:mb-8 border border-primary/10 shadow-inner text-primary opacity-30"><Briefcase size={48} strokeWidth={1} /></div><p className="font-black text-xl lg:text-2xl uppercase tracking-tighter text-muted-foreground opacity-30 italic">{t("app.common.noData")}</p></Card>) : (
        <div className="space-y-8 lg:space-y-12">
          {Object.entries(filteredData.bySub).map(([subName, data]: [string, any]) => {
            const subPortTotal = data.totalValue;
            return (
              <div key={subName} className="space-y-4">
                <div className="flex items-end justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-slate-900 dark:bg-primary flex items-center justify-center text-white shadow-lg"><Layers size={18} className="lg:w-5 lg:h-5" /></div>
                    <div>
                      <h3 className="text-lg lg:text-xl font-black uppercase tracking-tight text-white">{subName}</h3>
                      <p className="text-[8px] lg:text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Port Group</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] lg:text-[10px] font-black uppercase text-slate-400 mb-0.5 tracking-widest">{t("app.portfolio.totalValue")}</p>
                    <p className="text-base lg:text-lg font-black tracking-tighter text-white">฿{subPortTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {Object.entries(data.types).map(([typeKey, typeData]: [string, any]) => (
                    <div key={typeKey} className="bg-white dark:bg-slate-800 rounded-[24px] lg:rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all hover:shadow-md">
                      <div className="px-6 lg:px-8 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <span className="text-xs lg:text-sm font-black text-slate-600 dark:text-slate-300 uppercase tracking-tighter">{typeData.name}</span>
                        </div>
                        <span className="text-[10px] lg:text-[11px] font-black text-slate-500 dark:text-slate-400">฿{typeData.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>

                      {/* Desktop Table View */}
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-700 h-10">
                              <TableHead className="w-[140px] text-[8px] font-black uppercase tracking-widest text-slate-400 py-2 pl-6">Symbol</TableHead>
                              <TableHead className="text-right text-[8px] font-black uppercase tracking-widest text-slate-400 py-2">Qty</TableHead>
                              <TableHead className="text-right text-[8px] font-black uppercase tracking-widest text-slate-400 py-2">Avg</TableHead>
                              <TableHead className="text-right text-[8px] font-black uppercase tracking-widest text-slate-400 py-2">Price</TableHead>
                              <TableHead className="text-right text-[8px] font-black uppercase tracking-widest text-slate-400 py-2">Value</TableHead>
                              <TableHead className="text-right text-[8px] font-black uppercase tracking-widest text-slate-400 py-2">P&L</TableHead>
                              <TableHead className="text-right text-[8px] font-black uppercase tracking-widest text-slate-400 py-2 pr-6">{t("app.common.actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {typeData.assets.map((a: any) => {
                              const isUp = (a.current_price * a.totalQty) >= a.totalCost;
                              const pnl = (a.current_price * a.totalQty) - a.totalCost;
                              const pnlPct = a.totalCost > 0 ? (pnl / a.totalCost) * 100 : 0;
                              return (
                                <TableRow key={a.id} className="group border-slate-50 dark:border-slate-700 hover:bg-slate-50/30 dark:hover:bg-slate-700/30 transition-colors whitespace-nowrap">
                                  <TableCell className="py-3 pl-6">
                                    <div className="flex flex-col">
                                      <span className="font-black text-slate-800 dark:text-white tracking-tight leading-tight text-xs">{a.name}</span>
                                      <span className="text-[8px] font-bold text-slate-400 truncate max-w-[100px]">{a.full_name || "—"}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-slate-600 dark:text-slate-300 tabular-nums text-[10px]">{a.totalQty.toLocaleString(undefined, { maximumFractionDigits: 4 })}</TableCell>
                                  <TableCell className="text-right font-bold text-slate-600 dark:text-slate-300 tabular-nums text-[10px]">{formatMoney(a.totalQty > 0 ? a.totalCost / a.totalQty : 0, a.currency)}</TableCell>
                                  <TableCell className="text-right font-bold text-slate-900 dark:text-white tabular-nums text-[10px]">{formatMoney(a.current_price || 0, a.currency)}</TableCell>
                                  <TableCell className="text-right font-black text-slate-900 dark:text-white tabular-nums text-[10px]">{formatMoney(a.marketValue, a.currency)}</TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    <div className={cn("flex flex-col items-end", isUp ? "text-emerald-600" : "text-rose-600")}>
                                      <span className="font-black text-[10px]">{isUp ? "+" : ""}{formatMoney(pnl, a.currency)}</span>
                                      <span className="text-[8px] font-black">{isUp ? "▲" : "▼"} {Math.abs(pnlPct).toFixed(1)}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right pr-6">
                                    <div className="flex justify-end gap-1">
                                      <Button size="icon" variant="ghost" title="Manage Lots" className="h-6 w-6 rounded-lg text-primary" onClick={() => setLotManagerAsset(a)}><Clock size={10} /></Button>
                                      <Button size="icon" variant="ghost" title="Add Lot" className="h-6 w-6 rounded-lg" onClick={() => setLotModalAsset(a)}><Plus size={10} /></Button>
                                      <Button size="icon" variant="ghost" title="Edit Asset" className="h-6 w-6 rounded-lg" onClick={() => { setEditItem(a); setFormOpen(true); }}><Pencil size={10} /></Button>
                                      <Button size="icon" variant="ghost" title="Delete Asset" className="h-6 w-6 rounded-lg text-rose-500" onClick={() => { if(confirm("Delete?")) supabase.from("pp_assets").delete().eq("id", a.id).then(() => load()); }}><Trash2 size={10} /></Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <AssetFormModal open={formOpen} onOpenChange={setFormOpen} asset={editItem} portfolios={portfoliosList} onSaved={load} />
      {lotManagerAsset && <LotManagerModal open={!!lotManagerAsset} onOpenChange={(v) => !v && setLotManagerAsset(null)} asset={lotManagerAsset} onSaved={load} />}
      {lotModalAsset && <AssetLotModal open={!!lotModalAsset} onOpenChange={(v) => !v && setLotModalAsset(null)} asset={lotModalAsset} onSaved={load} />}
      
      <div className="pt-10 text-center py-4 rounded-3xl border border-slate-100 bg-slate-50/50"><p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 animate-pulse">PRECISION CORE V2.2 ACTIVE</p></div>
    </div>
  );
};

export default Portfolio;
