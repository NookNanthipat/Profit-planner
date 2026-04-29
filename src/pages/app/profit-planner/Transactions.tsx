import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search, Filter, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import TransactionForm from "@/components/profit-planner/TransactionForm";
import { formatMoney, monthKey, type PPAccount, type PPCategory, type PPTransaction } from "@/lib/profitPlanner";

const Transactions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<PPAccount[]>([]);
  const [categories, setCategories] = useState<PPCategory[]>([]);
  const [txs, setTxs] = useState<PPTransaction[]>([]);
  const [splitIds, setSplitIds] = useState<Set<string>>(new Set());
  
  const [month, setMonth] = useState(monthKey(new Date()));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editTx, setEditTx] = useState<PPTransaction | null>(null);
  const [loading, setLoading] = useState(false);

  const MONTHS_LABELS = useMemo(() => [
    t("app.months.jan"), t("app.months.feb"), t("app.months.mar"), t("app.months.apr"),
    t("app.months.may"), t("app.months.jun"), t("app.months.jul"), t("app.months.aug"),
    t("app.months.sep"), t("app.months.oct"), t("app.months.nov"), t("app.months.dec")
  ], [t]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const parts = month.split("-");
      let start, end;
      
      if (parts.length === 1) {
        start = `${month}-01-01`;
        end = `${month}-12-31`;
      } else {
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        const lastDay = new Date(y, m, 0).getDate();
        start = `${month}-01`;
        end = `${month}-${String(lastDay).padStart(2, "0")}`;
      }

      const [a, c, t_data, s] = await Promise.all([
        supabase.from("pp_accounts").select("*").eq("user_id", user.id).order("name"),
        supabase.from("pp_categories").select("*").eq("user_id", user.id),
        supabase.from("pp_transactions").select("*").eq("user_id", user.id)
          .gte("occurred_on", start).lte("occurred_on", end).order("occurred_on", { ascending: false }),
        supabase.from("pp_splits").select("transaction_id").eq("user_id", user.id)
      ]);
      
      setAccounts((a.data as PPAccount[]) ?? []);
      setCategories((c.data as PPCategory[]) ?? []);
      setTxs((t_data.data as PPTransaction[]) ?? []);
      setSplitIds(new Set((s.data ?? []).map(x => x.transaction_id)));
    } catch (e: any) {
      console.error("Load failed:", e);
      toast({ title: t("app.common.error"), description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user, month]);

  const accMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    return txs.filter((t_item) => {
      if (!t_item.occurred_on?.startsWith(month)) return false;

      const isAccountMatch = accountFilter === "all" || t_item.account_id === accountFilter;
      const isTypeMatch = typeFilter === "all" || t_item.type === typeFilter;
      
      const cat = t_item.category_id ? catMap[t_item.category_id] : null;
      const searchLower = search.toLowerCase();
      const noteLower = (t_item.note || "").toLowerCase();
      const catNameLower = (cat?.name || "").toLowerCase();
      
      const isSearchMatch = !search || 
        noteLower.includes(searchLower) ||
        catNameLower.includes(searchLower);
      
      return isAccountMatch && isTypeMatch && isSearchMatch;
    });
  }, [txs, month, accountFilter, typeFilter, search, catMap]);

  const remove = async (tx: PPTransaction) => {
    if (!confirm(t("app.common.confirm"))) return;
    
    try {
      if (tx.debt_id) {
        const { data: debt } = await supabase.from("pp_debts").select("*").eq("id", tx.debt_id).maybeSingle();
        if (debt) {
          await supabase.from("pp_debts").update({
            remaining_amount: debt.remaining_amount + Number(tx.amount),
            paid_months: Math.max(0, debt.paid_months - 1),
            is_active: true
          }).eq("id", debt.id);
        }
      }

      const { error } = await supabase.from("pp_transactions").delete().eq("id", tx.id);
      if (error) throw error;

      toast({ title: t("app.common.success") });
      load();
    } catch (e: any) {
      toast({ title: t("app.common.error"), description: e.message, variant: "destructive" });
    }
  };

  const currentMonthLabel = useMemo(() => {
    const parts = month.split("-");
    if (parts.length === 1) return `${t("app.annual.period")} ${parts[0]}`;
    const mIndex = parseInt(parts[1]) - 1;
    return `${MONTHS_LABELS[mIndex] || ""} ${parts[0]}`;
  }, [month, MONTHS_LABELS, t]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter">{t("app.transactions.title")}</h1>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60">{t("app.transactions.subtitle")}</p>
        </div>
        <Button onClick={() => { setEditTx(null); setOpen(true); }} disabled={accounts.length === 0} className="rounded-2xl h-11 px-6 font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/30 hover:scale-105 transition-all">
          <Plus size={18} className="mr-2" /> {t("app.transactions.newEntry")}
        </Button>
      </div>

      <Card className="p-3 flex flex-wrap gap-3 items-center bg-muted/20 border-none shadow-sm ring-1 ring-border/40 rounded-[28px] backdrop-blur-sm">
        <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 px-4 rounded-xl bg-background border-border/50 shadow-sm font-black uppercase text-[10px] tracking-widest gap-2 min-w-[160px]">
              <CalendarIcon size={14} className="text-primary" />
              {currentMonthLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 rounded-[32px] shadow-2xl border-none" align="start">
            <div className="flex items-center justify-between mb-4 gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl shrink-0" onClick={() => {
                const parts = month.split("-");
                const newYear = parseInt(parts[0]) - 1;
                setMonth(parts.length > 1 ? `${newYear}-${parts[1]}` : `${newYear}`);
              }}><ChevronLeft size={16} /></Button>
              
              <Select 
                value={month.split("-")[0]} 
                onValueChange={(v) => {
                  const parts = month.split("-");
                  setMonth(parts.length > 1 ? `${v}-${parts[1]}` : v);
                }}
              >
                <SelectTrigger className="h-8 border-none bg-muted/50 font-black text-xs rounded-lg focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-xl max-h-[200px]">
                  {Array.from({ length: 11 }, (_, i) => {
                    const y = new Date().getFullYear() - 5 + i;
                    return <SelectItem key={y} value={String(y)} className="text-[10px] font-bold">{y}</SelectItem>;
                  })}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl shrink-0" onClick={() => {
                const parts = month.split("-");
                const newYear = parseInt(parts[0]) + 1;
                setMonth(parts.length > 1 ? `${newYear}-${parts[1]}` : `${newYear}`);
              }}><ChevronRight size={16} /></Button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <Button 
                variant={month.split("-").length === 1 ? "default" : "ghost"}
                className={cn("col-span-3 h-9 rounded-lg text-[10px] font-black uppercase tracking-widest p-0", month.split("-").length === 1 && "shadow-lg shadow-primary/20")}
                onClick={() => {
                  setMonth(month.split("-")[0]);
                  setMonthPickerOpen(false);
                }}
              >{t("app.annual.period")}</Button>
              {MONTHS_LABELS.map((m, i) => {
                const isSelected = month.split("-").length > 1 && parseInt(month.split("-")[1]) === i + 1;
                return (
                  <Button key={i} variant={isSelected ? "default" : "ghost"}
                    className={cn("h-9 rounded-lg text-[10px] font-black uppercase tracking-tight p-0", isSelected && "shadow-lg shadow-primary/20")}
                    onClick={() => {
                      setMonth(`${month.split("-")[0]}-${String(i + 1).padStart(2, "0")}`);
                      setMonthPickerOpen(false);
                    }}
                  >{m}</Button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1 min-w-[200px] relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder={t("app.transactions.searchPlaceholder")} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-xl pl-9 bg-background border-border/50 shadow-sm font-bold text-xs"
          />
        </div>

        <div className="flex gap-2">
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="h-10 w-[150px] rounded-xl bg-background border-border/50 shadow-sm text-[10px] font-black uppercase tracking-widest"><SelectValue placeholder={t("app.common.account")} /></SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-xl">
              <SelectItem value="all">{t("app.common.all")}</SelectItem>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-10 w-[110px] rounded-xl bg-background border-border/50 shadow-sm text-[10px] font-black uppercase tracking-widest"><SelectValue placeholder={t("app.common.type")} /></SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-xl">
              <SelectItem value="all">{t("app.common.all")}</SelectItem>
              <SelectItem value="income" className="text-emerald-600 font-black">{t("app.common.income")}</SelectItem>
              <SelectItem value="expense" className="text-rose-600 font-black">{t("app.common.expense")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">{t("app.common.loading")}</p>
        </div>
      ) : accounts.length === 0 ? (
        <Card className="p-16 text-center border-none bg-background shadow-sm ring-1 ring-border/40 rounded-[48px]">
          <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-6"><Filter size={32} className="text-muted-foreground opacity-30" /></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">{t("app.common.error")}</p>
          <p className="font-black text-lg">{t("app.common.noData")}</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-24 text-center border-none bg-background/50 ring-1 ring-border/40 rounded-[48px]">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 italic">{t("app.transactions.noTransactions")}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Mobile */}
          <div className="lg:hidden space-y-3">
            {filtered.map((t_item) => {
              const cat = t_item.category_id ? catMap[t_item.category_id] : null;
              const acc = accMap[t_item.account_id];
              return (
                <Card key={t_item.id} className="p-4 flex items-center gap-4 rounded-[32px] border-none shadow-sm ring-1 ring-border/50 bg-background hover:shadow-md transition-all group">
                  <span className="w-14 h-14 rounded-[22px] flex items-center justify-center text-2xl shrink-0 shadow-sm border border-border/10"
                    style={{ backgroundColor: (cat?.color ?? "#888") + "10", color: cat?.color ?? "#888" }}>
                    {cat?.icon ?? (t_item.type === "income" ? "💰" : "💸")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-black text-[10px] uppercase tracking-tight truncate">{cat?.name ?? t("app.common.uncategorized")}</p>
                      {splitIds.has(t_item.id) && <Users size={10} className="text-primary shrink-0" />}
                    </div>
                    <p className="text-[11px] font-black mt-0.5 tracking-tight text-foreground/80">{acc?.name}</p>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1 tracking-tighter opacity-60">{t_item.occurred_on}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-base font-black tracking-tighter ${t_item.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                      {t_item.type === "income" ? "+" : "-"}{formatMoney(Number(t_item.amount), acc?.currency ?? "THB")}
                    </p>
                    <div className="flex justify-end gap-1.5 mt-2">
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-2xl hover:bg-primary/10 transition-colors" onClick={() => { setEditTx(t_item); setOpen(true); }}><Pencil size={15} /></Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-2xl hover:bg-rose-500/10 text-rose-500 transition-colors" onClick={() => remove(t_item)}><Trash2 size={15} /></Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop */}
          <Card className="hidden lg:block overflow-hidden border-none shadow-sm ring-1 ring-border/40 rounded-[40px] bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 border-b border-border/40 hover:bg-muted/10">
                  <TableHead className="py-5 px-8 font-black uppercase text-[10px] tracking-widest text-muted-foreground">{t("app.common.date")}</TableHead>
                  <TableHead className="py-5 px-8 font-black uppercase text-[10px] tracking-widest text-muted-foreground">{t("app.common.category")}</TableHead>
                  <TableHead className="py-5 px-8 font-black uppercase text-[10px] tracking-widest text-muted-foreground">{t("app.forms.subCategory")}</TableHead>
                  <TableHead className="py-5 px-8 font-black uppercase text-[10px] tracking-widest text-muted-foreground">{t("app.common.account")}</TableHead>
                  <TableHead className="py-5 px-8 font-black uppercase text-[10px] tracking-widest text-muted-foreground">{t("app.common.note")}</TableHead>
                  <TableHead className="py-5 px-8 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right">{t("app.common.amount")}</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t_item) => {
                  const cat = t_item.category_id ? catMap[t_item.category_id] : null;
                  const acc = accMap[t_item.account_id];
                  const parentName = cat?.parent_id ? catMap[cat.parent_id]?.name : cat?.name;
                  const subName = cat?.parent_id ? cat.name : "—";

                  return (
                    <TableRow key={t_item.id} className="hover:bg-muted/10 transition-all border-b border-border/20 group">
                      <TableCell className="py-5 px-8 text-[10px] font-black uppercase tracking-widest opacity-60 font-mono">
                        <div className="flex items-center gap-2">
                          {t_item.occurred_on}
                          {splitIds.has(t_item.id) && <Users size={12} className="text-primary shrink-0" />}
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-8">
                        <span className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-tight">
                          <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/20 text-lg shadow-inner shrink-0">
                            {cat?.parent_id ? catMap[cat.parent_id]?.icon : cat?.icon ?? "•"}
                          </span>
                          {parentName ?? t("app.common.uncategorized")}
                        </span>
                      </TableCell>
                      <TableCell className="py-5 px-8 text-[10px] font-black uppercase tracking-widest opacity-70">
                        {subName}
                      </TableCell>
                      <TableCell className="py-5 px-8 text-[10px] font-black uppercase tracking-tighter opacity-70">{acc?.name}</TableCell>
                      <TableCell className="py-5 px-8 text-xs font-bold text-muted-foreground max-w-[200px] truncate italic">
                        {t_item.note ? `"${t_item.note}"` : "—"}
                      </TableCell>
                      <TableCell className="py-5 px-8 text-right">
                        <span className={`font-mono text-sm font-black tracking-tighter ${t_item.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                          {t_item.type === "income" ? "+" : "-"}{formatMoney(Number(t_item.amount), acc?.currency ?? "THB")}
                        </span>
                      </TableCell>
                      <TableCell className="py-5 px-8">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-2xl hover:bg-primary/10 transition-colors shadow-sm border border-border/10" onClick={() => { setEditTx(t_item); setOpen(true); }}><Pencil size={18} /></Button>
                          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-2xl hover:bg-rose-500/10 text-rose-500 transition-colors shadow-sm border border-border/10" onClick={() => remove(t_item)}><Trash2 size={18} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      <TransactionForm
        open={open}
        onOpenChange={setOpen}
        tx={editTx}
        accounts={accounts}
        categories={categories}
        onSaved={load}
      />
    </div>
  );
};

export default Transactions;
