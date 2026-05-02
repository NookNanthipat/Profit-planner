import React, { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Users, Receipt, HandCoins, ArrowUpRight, ArrowDownLeft, Plus, MoreVertical, CheckCircle2, Calendar as CalendarIcon, Loader2, Trash2, Pencil, Search, History, AlertCircle, ChevronRight, RefreshCw, Sparkles, Filter, ChevronLeft, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatMoney, monthKey, type PPTransaction, type PPPerson, type PPSplit } from "@/lib/profitPlanner";

// ─── Sub-components ──────────────────────────────────────────────────────────

function SettleAllModal({ open, onOpenChange, person, bills, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; person: PPPerson; bills: any[]; onSaved: () => void; }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const total = bills.reduce((sum, b) => {
    const part = b.participants.find((p: any) => p.person_id === person.id);
    return sum + (Number(part?.actual_amount || 0) - Number(part?.paid_total || 0));
  }, 0);

  const submit = async () => {
    if (!user || bills.length === 0) return;
    setSaving(true);
    try {
      const inserts = bills.map(b => {
        const part = b.participants.find((p: any) => p.person_id === person.id);
        return {
          user_id: user.id, split_id: b.id, person_id: person.id,
          amount: Number(part.actual_amount) - Number(part.paid_total),
          paid_on: format(new Date(), "yyyy-MM-dd"),
          note: `Bulk settlement for ${bills.length} bills`
        };
      });
      const { error } = await supabase.from("pp_split_payments").insert(inserts);
      if (error) throw error;
      toast({ title: t("app.common.success") });
      onSaved(); onOpenChange(false);
    } catch (e: any) { toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[32px] p-8 shadow-2xl border-none">
        <DialogHeader><DialogTitle className="font-black uppercase tracking-tight text-emerald-600 flex items-center gap-2"><Sparkles size={24} /> {t("app.split.fullSettlement")}</DialogTitle></DialogHeader>
        <div className="mt-4 space-y-6">
          <div className="text-center p-6 bg-emerald-500/10 rounded-[32px] border border-emerald-500/20 shadow-inner">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 opacity-60 mb-2">Total Outstanding from {person.name}</p>
            <p className="text-4xl font-black tracking-tighter text-emerald-700">{formatMoney(total)}</p>
          </div>
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase text-muted-foreground ml-1">Included in this action:</p>
            <div className="max-h-[30vh] overflow-y-auto space-y-1.5 pr-1">
              {bills.map(b => {
                const part = b.participants.find((p: any) => p.person_id === person.id);
                return (
                  <div key={b.id} className="flex justify-between items-center p-3 rounded-xl bg-muted/20 border border-border/40">
                    <span className="text-[10px] font-black uppercase truncate max-w-[180px]">{b.transaction?.note || 'Bill'}</span>
                    <span className="text-[10px] font-black">{formatMoney(part.actual_amount - part.paid_total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-6 flex gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase text-[10px]">{t("app.common.discard")}</Button>
          <Button onClick={submit} disabled={saving} className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20">{saving ? "Processing..." : t("app.common.confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentHistoryModal({ open, onOpenChange, split, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; split: any; onSaved: () => void; }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editing, setEditing] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const remove = async (id: string) => {
    if (!confirm(t("app.common.confirm"))) return;
    const { error } = await supabase.from("pp_split_payments").delete().eq("id", id);
    if (error) toast({ title: t("app.common.error"), description: error.message }); else { toast({ title: t("app.common.success") }); onSaved(); }
  };
  const saveEdit = async () => {
    if (!editing || !amount) return;
    setSaving(true);
    const { error } = await supabase.from("pp_split_payments").update({ amount: parseFloat(amount) }).eq("id", editing.id);
    if (error) toast({ title: t("app.common.error"), description: error.message }); else { toast({ title: t("app.common.success") }); setEditing(null); onSaved(); }
    setSaving(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[32px] p-6 shadow-2xl border-none">
        <DialogTitle className="font-black uppercase tracking-tight flex items-center gap-2"><History size={20} /> {t("app.debt.history")}</DialogTitle>
        <div className="mt-4 space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {!split?.payments || split.payments.length === 0 ? (<p className="py-8 text-center text-[10px] font-black uppercase opacity-30 italic">{t("app.common.noData")}</p>) : split.payments.map((p: any) => {
            const person = (split.participants ?? []).find((pt: any) => pt.person_id === p.person_id)?.person;
            return (
              <div key={p.id} className="p-4 rounded-2xl bg-muted/10 border border-border/40 flex items-center justify-between group">
                <div><p className="text-[10px] font-black uppercase tracking-tight">{person?.name || 'Self'}</p><p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">{p.paid_on}</p></div>
                <div className="flex items-center gap-3">
                  {editing?.id === p.id ? (<div className="flex gap-2"><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-8 w-24 text-[10px] font-black" /><Button size="sm" className="h-8 px-3 rounded-lg text-[9px] font-black" onClick={saveEdit} disabled={saving}>{t("app.common.save")}</Button></div>) : (<p className="text-sm font-black tracking-tight text-emerald-600">{formatMoney(Number(p.amount))}</p>)}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => { setEditing(p); setAmount(String(p.amount)); }}><Pencil size={12} /></Button><Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-rose-500" onClick={() => remove(p.id)}><Trash2 size={12} /></Button></div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentModal({ open, onOpenChange, split, participant, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; split: any; participant: any; onSaved: () => void; }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open && participant) { const remaining = Number(participant.actual_amount || 0) - Number(participant.paid_total || 0); setAmount(String(Math.max(0, remaining).toFixed(2))); } }, [open, participant]);
  const submit = async () => {
    if (!user || !amount || parseFloat(amount) <= 0) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("pp_split_payments").insert({
        user_id: user.id, split_id: split.id, person_id: participant.person_id,
        amount: parseFloat(amount), paid_on: date, note: `Reimbursement: ${split.transaction?.note || 'bill'}`
      });
      if (error) throw error;
      toast({ title: t("app.common.success") }); onSaved(); onOpenChange(false);
    } catch (e: any) { toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-sm rounded-[32px] p-6 shadow-2xl border-none">
        <DialogTitle className="font-black uppercase tracking-tight text-emerald-600 flex items-center gap-2"><HandCoins size={20} /> {t("app.split.collectFunds")}</DialogTitle>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">From {participant?.person?.name || "Participant"}</p>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.common.amount")}</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-black text-lg text-emerald-600" /></div>
          <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">{t("app.common.date")}</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full h-12 justify-start text-left font-bold rounded-2xl bg-muted/20 border-none shadow-inner px-3"><CalendarIcon className="mr-2 h-4 w-4 opacity-50" />{date ? format(new Date(date + "T00:00:00"), "PPP") : <span>{t("app.common.date")}</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="start"><Calendar mode="single" selected={date ? new Date(date + "T00:00:00") : undefined} onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))} initialFocus className="rounded-2xl" /></PopoverContent></Popover></div>
        </div>
        <Button onClick={submit} disabled={saving} className="w-full mt-6 h-12 rounded-2xl font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-lg">{t("app.split.collectFunds")}</Button>
      </DialogContent>
    </Dialog>
  );
}

function PersonAvatar({ person, onUpload, size = "md" }: { person: PPPerson; onUpload: (id: string, base64: string) => void; size?: "sm" | "md" | "lg" }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dim = size === "sm" ? "w-5 h-5 lg:w-6 lg:h-6" : size === "md" ? "w-8 h-8 lg:w-10 lg:h-10" : "w-12 h-12 lg:w-20 lg:h-20";
  const iconSize = size === "sm" ? 12 : size === "md" ? 18 : 32;

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
    <div className={cn("relative group/avatar shrink-0 overflow-hidden rounded-full lg:rounded-[18px] flex items-center justify-center text-white font-black", dim)} style={{ backgroundColor: !person.avatar_url ? (person.color || "#888") : "transparent" }}>
      {person.avatar_url ? (
        <img src={person.avatar_url} alt={person.name} className="w-full h-full object-cover" />
      ) : (
        <UserIcon size={iconSize} className="opacity-80" />
      )}
      
      <div 
        onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer z-20"
      >
        <Plus size={16} className="text-white" />
      </div>
      <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleFile} />
    </div>
  );
}

// ─── Main Module ─────────────────────────────────────────────────────────────

const SplitPayment = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<PPPerson[]>([]);
  const [splits, setSplits] = useState<any[]>([]);
  const [historySplit, setHistorySplit] = useState<any>(null);
  const [payTarget, setPayTarget] = useState<{ split: any, part: any } | null>(null);
  const [settleTarget, setSettleTarget] = useState<{ person: PPPerson, bills: any[] } | null>(null);
  
  const [month, setMonth] = useState(monthKey(new Date()));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: p } = await supabase.from("pp_people").select("*").eq("user_id", user.id).order("name");
      const peopleList = (p ?? []) as PPPerson[];
      setPeople(peopleList);
      
      const { data: s } = await supabase.from("pp_splits").select(`*, transaction:pp_transactions(*), participants:pp_split_participants(*), payments:pp_split_payments(*)`).eq("user_id", user.id).order("created_at", { ascending: false });
      
      const hydrated = (s ?? []).map(split => {
        const parts = (split.participants ?? []).map((p: any) => {
          const person = p.person_id ? peopleList.find(pp => pp.id === p.person_id) : null;
          const paid_total = (split.payments ?? []).filter((pm: any) => pm.person_id === p.person_id).reduce((sum: number, pm: any) => sum + Number(pm.amount), 0) || 0;
          return { ...p, person, paid_total };
        });
        const total_owed = parts.filter((p: any) => p.person_id !== null).reduce((sum: number, p: any) => sum + Number(p.actual_amount || 0), 0);
        const total_collected = (split.payments ?? []).filter((pm: any) => pm.person_id !== null).reduce((sum: number, pm: any) => sum + Number(pm.amount || 0), 0) || 0;
        return { ...split, participants: parts, total_owed, total_collected };
      });
      setSplits(hydrated);
      if (historySplit) { const updated = hydrated.find(x => x.id === historySplit.id); if (updated) setHistorySplit(updated); }
    } catch (e: any) { toast({ title: t("app.common.error"), description: e.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const filteredSplits = useMemo(() => {
    return splits.filter(s => {
      if (s.transaction?.occurred_on) return s.transaction.occurred_on.startsWith(month);
      return s.due_date?.startsWith(month); // pending splits without transaction yet
    });
  }, [splits, month]);

  const stats = useMemo(() => {
    return filteredSplits.reduce((acc, s) => {
      acc.totalOwed += (s.total_owed || 0); acc.totalCollected += (s.total_collected || 0);
      if ((s.total_collected || 0) < (s.total_owed || 0) - 0.1) acc.activeCount++;
      return acc;
    }, { totalOwed: 0, totalCollected: 0, activeCount: 0 });
  }, [filteredSplits]);

  const activeSplits = filteredSplits.filter(s => (s.total_collected || 0) < (s.total_owed || 0) - 0.1);
  const settledSplits = filteredSplits.filter(s => (s.total_collected || 0) >= (s.total_owed || 0) - 0.1 && (s.total_owed || 0) > 0);

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

  const currentMonthLabel = useMemo(() => {
    const d = new Date(month + "-01T00:00:00");
    return d.toLocaleDateString(i18n.language, { month: "long", year: "numeric" });
  }, [month, i18n.language]);

  const MONTHS_SHORT = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(2024, i, 1);
      return d.toLocaleDateString(i18n.language, { month: "short" });
    });
  }, [i18n.language]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div><h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter">{t("app.split.title")}</h1><p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">{t("app.split.subtitle")}</p></div>
        <div className="flex gap-2">
          <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 px-4 rounded-xl bg-background border-border/50 shadow-sm font-black uppercase text-[10px] tracking-widest gap-2 min-w-[160px]">
                <CalendarIcon size={14} className="text-primary" />
                {currentMonthLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 rounded-[32px] shadow-2xl border-none" align="end">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => {
                  const parts = month.split("-");
                  setMonth(`${parseInt(parts[0]) - 1}-${parts[1]}`);
                }}><ChevronLeft size={16} /></Button>
                <span className="font-black text-sm tracking-tighter">{month.split("-")[0]}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => {
                  const parts = month.split("-");
                  setMonth(`${parseInt(parts[0]) + 1}-${parts[1]}`);
                }}><ChevronRight size={16} /></Button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS_SHORT.map((m, i) => {
                  const isSelected = parseInt(month.split("-")[1]) === i + 1;
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
          <Button variant="outline" className="rounded-xl h-10 px-4 font-black uppercase text-[10px] tracking-widest gap-2" onClick={load}><RefreshCw size={14} /> {t("app.common.sync")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        <Card className="p-5 lg:p-7 bg-primary text-white border-none shadow-2xl rounded-[32px] lg:rounded-[40px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="relative z-10"><p className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest opacity-60">{t("app.split.receivable")}</p><p className="text-2xl lg:text-4xl font-black mt-1 lg:mt-2 tracking-tighter truncate">{formatMoney(stats.totalOwed - stats.totalCollected)}</p></div>
        </Card>
        <Card className="p-5 lg:p-7 bg-muted/10 border-none ring-1 ring-border/50 rounded-[32px] lg:rounded-[40px] backdrop-blur-sm">
          <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest opacity-40">{t("app.split.progress")}</p>
          <p className="text-2xl lg:text-4xl font-black mt-1 lg:mt-2 tracking-tighter text-emerald-600 truncate">{formatMoney(stats.totalCollected)}</p>
          <div className="mt-3 lg:mt-4 flex items-center gap-2"><Progress value={stats.totalOwed > 0 ? (stats.totalCollected / stats.totalOwed) * 100 : 0} className="h-1 lg:h-1.5 flex-1" /></div>
        </Card>
        <Card className="p-5 lg:p-7 bg-muted/10 border-none ring-1 ring-border/50 rounded-[32px] lg:rounded-[40px] backdrop-blur-sm">
          <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest opacity-40">{t("app.split.activeSplits")}</p>
          <p className="text-2xl lg:text-4xl font-black mt-1 lg:mt-2 tracking-tighter truncate">{stats.activeCount}</p>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-muted/30 p-1 rounded-2xl lg:rounded-[22px] h-10 lg:h-12 w-full justify-start overflow-x-auto no-scrollbar whitespace-nowrap">
          <TabsTrigger value="all" className="rounded-xl lg:rounded-2xl px-4 lg:px-8 font-black uppercase text-[9px] lg:text-[10px] tracking-widest">{t("app.common.all")}</TabsTrigger>
          <TabsTrigger value="people" className="rounded-xl lg:rounded-2xl px-4 lg:px-8 font-black uppercase text-[9px] lg:text-[10px] tracking-widest">{t("app.split.byPerson")}</TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl lg:rounded-2xl px-4 lg:px-8 font-black uppercase text-[9px] lg:text-[10px] tracking-widest">{t("app.split.settled")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 lg:mt-8 space-y-4">
          {loading ? (<div className="py-24 text-center"><Loader2 size={32} className="animate-spin mx-auto text-primary opacity-20" /></div>) : activeSplits.length === 0 ? (
            <Card className="p-16 lg:p-24 text-center border-none bg-background/50 ring-1 ring-border/40 rounded-[32px] lg:rounded-[64px] shadow-sm"><p className="font-black text-xl lg:text-2xl uppercase tracking-tighter mb-2 text-muted-foreground opacity-40 italic text-center">{t("app.split.noSplits")} {currentMonthLabel}</p></Card>
          ) : (
            <div className="grid gap-4 lg:gap-6">
              {activeSplits.map(s => {
                const progress = (s.total_collected / s.total_owed) * 100;
                return (
                  <Card key={s.id} className="p-4 lg:p-6 rounded-[24px] lg:rounded-[36px] border-none shadow-sm ring-1 ring-border/50 bg-background hover:shadow-xl transition-all overflow-hidden relative group/split">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 lg:gap-6 relative z-10">
                      <div className="flex gap-3 lg:gap-4 min-w-0 flex-1">
                        <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-[24px] bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0"><Receipt size={20} className="lg:w-6 lg:h-6" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1"><h3 className="font-black text-xs lg:text-sm uppercase tracking-tight truncate">{s.transaction?.note || s.note || 'Unnamed Bill'}</h3>
                            {s.transaction?.occurred_on
                              ? <Badge variant="secondary" className="text-[7px] lg:text-[8px] font-black uppercase py-0 px-1.5">{s.transaction.occurred_on}</Badge>
                              : <Badge className="text-[7px] lg:text-[8px] font-black uppercase py-0 px-1.5 bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse">PENDING • {s.due_date}</Badge>
                            }
                          </div>
                          <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-1"><p className="text-[8px] lg:text-[9px] font-bold text-muted-foreground uppercase opacity-60">Total: {formatMoney(Number(s.transaction?.amount || s.total_owed || 0))} • Owed: {formatMoney(s.total_owed || 0)}</p><Badge variant="outline" className="text-[7px] lg:text-[8px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5 px-1.5">{progress.toFixed(0)}% Collected</Badge></div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {(s.participants ?? []).filter((p: any) => p.person_id !== null).map((p: any, i: number) => {
                              const isPaid = (p.paid_total || 0) >= (p.actual_amount || 0) - 0.1;
                              return (
                                <button key={i} onClick={() => !isPaid && setPayTarget({ split: s, part: p })} className={cn("px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg lg:rounded-xl flex items-center gap-1.5 lg:gap-2 border transition-all text-[8px] lg:text-[10px] font-black uppercase tracking-tight whitespace-nowrap", isPaid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 pointer-events-none" : "bg-muted/50 border-border/50 hover:bg-background hover:shadow-md")}>
                                  <PersonAvatar person={p.person} size="sm" onUpload={handleAvatarUpload} />
                                  {p.person?.name || ' Someone'} — {formatMoney((p.actual_amount || 0) - (p.paid_total || 0))}
                                  {!isPaid && <HandCoins size={10} className="text-primary opacity-60" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row lg:flex-col justify-between items-end lg:items-end shrink-0 border-t border-border/20 pt-3 lg:border-none lg:pt-0">
                        <div className="text-left lg:text-right">
                          <p className="text-[8px] lg:text-[9px] font-black uppercase text-muted-foreground opacity-60 mb-0.5">Remaining</p>
                          <p className="text-xl lg:text-2xl font-black tracking-tighter text-primary truncate max-w-[120px]">{formatMoney((s.total_owed || 0) - (s.total_collected || 0))}</p>
                        </div>
                        <div className="mt-0 lg:mt-4 flex gap-1.5 justify-end">
                           <Button variant="ghost" size="sm" className="rounded-lg lg:rounded-xl text-[8px] lg:text-[9px] font-black uppercase tracking-widest h-7 lg:h-8 bg-muted/20 hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors px-2 lg:px-3" onClick={() => {
                             const peopleOwed = s.participants.filter((p:any) => p.person_id !== null && p.paid_total < p.actual_amount - 0.1);
                             if (peopleOwed.length === 0) return;
                             if (!confirm(t("app.common.confirm"))) return;
                             (async () => {
                               const inserts = peopleOwed.map((p:any) => ({
                                 user_id: user.id, split_id: s.id, person_id: p.person_id,
                                 amount: p.actual_amount - p.paid_total,
                                 paid_on: format(new Date(), "yyyy-MM-dd"),
                                 note: `Full bill settlement for ${s.transaction?.note || 'shared bill'}`
                               }));
                               const { error } = await supabase.from("pp_split_payments").insert(inserts);
                               if (error) toast({ title: t("app.common.error"), description: error.message }); else { toast({ title: t("app.common.success") }); load(); }
                             })();
                           }}><CheckCircle2 size={10} className="mr-1 hidden sm:inline" /> {t("app.split.payAll")}</Button>
                           <Button variant="ghost" size="sm" className="rounded-lg lg:rounded-xl text-[8px] lg:text-[9px] font-black uppercase tracking-widest h-7 lg:h-8 px-2 lg:px-3" onClick={() => setHistorySplit(s)}><History size={10} className="mr-1 hidden sm:inline" /> {t("app.debt.history")}</Button>
                        </div>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 h-1 bg-muted/20 w-full"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progress}%` }} /></div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="people" className="mt-6 lg:mt-8">
          <div className="grid gap-4 lg:gap-6">
            {people.map(p => {
              const myAllBills = splits.filter(s => (s.participants ?? []).some((pt: any) => pt.person_id === p.id));
              const myActiveBills = myAllBills.filter(s => {
                const part = s.participants.find((pt: any) => pt.person_id === p.id);
                return (part?.paid_total || 0) < (part?.actual_amount || 0) - 0.1;
              });
              
              const myTotalOwed = splits.reduce((sum, s) => {
                const part = s.participants.find((pt: any) => pt.person_id === p.id);
                return sum + (part ? Number(part.actual_amount || 0) : 0);
              }, 0);
              const myTotalPaid = splits.reduce((sum, s) => {
                const part = s.participants.find((pt: any) => pt.person_id === p.id);
                return sum + (part ? Number(part.paid_total || 0) : 0);
              }, 0);
              const myRemaining = Math.max(0, myTotalOwed - myTotalPaid);
              const progress = myTotalOwed > 0 ? (myTotalPaid / myTotalOwed) * 100 : 0;

              return (
                <Card key={p.id} className="p-5 lg:p-8 rounded-[24px] lg:rounded-[48px] border-none shadow-sm ring-1 ring-border/50 bg-background overflow-hidden relative group">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 lg:gap-8">
                    <div className="flex gap-4 lg:gap-6 min-w-0 flex-1">
                      <PersonAvatar person={p} size="lg" onUpload={handleAvatarUpload} />
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                           <div><h3 className="font-black text-lg lg:text-xl uppercase tracking-tight truncate">{p.name}</h3><p className="text-[8px] lg:text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-widest">{myActiveBills.length} {t("app.split.activeSplits")}</p></div>
                           {myRemaining > 0 && <Button variant="ghost" size="sm" className="h-9 rounded-xl bg-emerald-500/10 text-emerald-600 font-black uppercase text-[8px] lg:text-[10px] px-4 lg:px-6 shadow-sm hover:bg-emerald-500 hover:text-white transition-all self-start sm:self-auto" onClick={() => setSettleTarget({ person: p, bills: myActiveBills })}><Sparkles size={12} className="mr-2" /> {t("app.split.payAll")}</Button>}
                        </div>
                        
                        {myAllBills.length === 0 ? (
                          <div className="py-8 lg:py-12 text-center bg-muted/5 rounded-2xl lg:rounded-[32px] border border-dashed border-border/40">
                             <p className="text-[9px] lg:text-[10px] font-black uppercase text-muted-foreground opacity-40 tracking-widest italic">{t("app.split.noSplits")}</p>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mb-6">
                              <div className="p-3 lg:p-4 rounded-xl lg:rounded-3xl bg-muted/10 border border-border/40">
                                  <p className="text-[8px] lg:text-[9px] font-black text-muted-foreground uppercase opacity-60 mb-0.5 lg:mb-1">Outstanding</p>
                                  <p className="text-xl lg:text-2xl font-black tracking-tighter text-primary truncate">{formatMoney(myRemaining)}</p>
                              </div>
                              <div className="p-3 lg:p-4 rounded-xl lg:rounded-3xl bg-emerald-500/5 border border-emerald-500/20">
                                  <p className="text-[8px] lg:text-[9px] font-black text-emerald-600 uppercase opacity-60 mb-0.5 lg:mb-1">{t("app.split.progress")}</p>
                                  <div className="flex items-center gap-3">
                                    <p className="text-xl lg:text-2xl font-black tracking-tighter text-emerald-600">{progress.toFixed(0)}%</p>
                                    <Progress value={progress} className="h-1 lg:h-1.5 flex-1" />
                                  </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-[8px] lg:text-[9px] font-black uppercase text-muted-foreground opacity-40 ml-1">Open Items</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
                                {myActiveBills.length === 0 ? (<p className="text-[9px] lg:text-[10px] font-black uppercase opacity-20 py-2 lg:py-4 italic">No open bills</p>) : myActiveBills.map(s => {
                                  const part = (s.participants ?? []).find((pt: any) => pt.person_id === p.id);
                                  return (
                                    <div key={s.id} className="p-2.5 lg:p-3.5 rounded-xl lg:rounded-2xl bg-muted/10 border border-border/30 flex items-center justify-between group/bill">
                                      <div className="min-w-0 flex-1"><p className="text-[9px] lg:text-[10px] font-black uppercase truncate">{s.transaction?.note || 'Bill'}</p><p className="text-[8px] lg:text-[9px] text-muted-foreground font-bold">{formatMoney((part?.actual_amount || 0) - (part?.paid_total || 0))}</p></div>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 lg:h-8 lg:w-8 rounded-lg lg:rounded-xl opacity-100 lg:opacity-0 group-hover/bill:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary shrink-0 ml-2" onClick={() => setPayTarget({ split: s, part })}><HandCoins size={12} className="lg:w-4 lg:h-4" /></Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6 lg:mt-8">
          <Card className="overflow-hidden border-none shadow-sm ring-1 ring-border/40 rounded-[24px] lg:rounded-[40px] bg-background">
            <div className="p-5 lg:p-8 border-b border-border/40 bg-muted/5 flex items-center justify-between">
              <div className="flex items-center gap-2 lg:gap-3"><History size={16} className="text-muted-foreground opacity-40 lg:w-5 lg:h-5" /><p className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("app.debt.history")}</p></div>
              <p className="text-[8px] lg:text-[9px] font-black text-muted-foreground uppercase opacity-40">{settledSplits.length} Records</p>
            </div>
            <div className="divide-y divide-border/20">
              {settledSplits.length === 0 ? (<div className="p-16 text-center text-[10px] font-black uppercase text-muted-foreground opacity-30 italic">{t("app.common.noData")}</div>) : settledSplits.map(s => (
                <div key={s.id} className="p-4 lg:p-6 flex items-center justify-between hover:bg-muted/5 transition-colors">
                  <div className="flex items-center gap-3 lg:gap-4"><div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner shrink-0"><CheckCircle2 size={16} className="lg:w-[18px] lg:h-[18px]" /></div><div className="min-w-0"><p className="font-black text-[11px] lg:text-xs uppercase tracking-tight truncate max-w-[150px] lg:max-w-none">{s.transaction?.note || 'Settled Bill'}</p><p className="text-[8px] lg:text-[9px] font-bold text-muted-foreground uppercase opacity-60">{s.transaction?.occurred_on} • {t("app.split.settled")}</p></div></div>
                  <div className="text-right shrink-0 ml-4"><p className="text-base lg:text-lg font-black tracking-tighter text-emerald-600">{formatMoney(s.total_owed || 0)}</p><button onClick={() => setHistorySplit(s)} className="text-[8px] lg:text-[9px] font-black uppercase text-primary hover:underline">Verify</button></div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {historySplit && <PaymentHistoryModal open={!!historySplit} onOpenChange={(v) => !v && setHistorySplit(null)} split={historySplit} onSaved={load} />}
      {payTarget && <PaymentModal open={!!payTarget} onOpenChange={(v) => !v && setPayTarget(null)} split={payTarget.split} participant={payTarget.part} onSaved={load} />}
      {settleTarget && <SettleAllModal open={!!settleTarget} onOpenChange={(v) => !v && setSettleTarget(null)} person={settleTarget.person} bills={settleTarget.bills} onSaved={load} />}
    </div>
  );
};

export default SplitPayment;
