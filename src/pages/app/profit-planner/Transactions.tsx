import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import TransactionForm from "@/components/profit-planner/TransactionForm";
import { formatMoney, monthKey, type PPAccount, type PPCategory, type PPTransaction } from "@/lib/profitPlanner";

const Transactions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<PPAccount[]>([]);
  const [categories, setCategories] = useState<PPCategory[]>([]);
  const [txs, setTxs] = useState<PPTransaction[]>([]);
  const [month, setMonth] = useState(monthKey(new Date()));
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editTx, setEditTx] = useState<PPTransaction | null>(null);

  const load = async () => {
    if (!user) return;
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
    const end = new Date(y, m, 0).toISOString().slice(0, 10);
    const [a, c, t] = await Promise.all([
      supabase.from("pp_accounts").select("*").eq("user_id", user.id).order("name"),
      supabase.from("pp_categories").select("*").eq("user_id", user.id),
      supabase.from("pp_transactions").select("*").eq("user_id", user.id)
        .gte("occurred_on", start).lte("occurred_on", end).order("occurred_on", { ascending: false }),
    ]);
    setAccounts((a.data as PPAccount[]) ?? []);
    setCategories((c.data as PPCategory[]) ?? []);
    setTxs((t.data as PPTransaction[]) ?? []);
  };

  useEffect(() => { load(); }, [user, month]);

  const accMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const filtered = txs.filter((t) =>
    (accountFilter === "all" || t.account_id === accountFilter) &&
    (typeFilter === "all" || t.type === typeFilter)
  );

  const remove = async (id: string) => {
    if (!confirm("Delete transaction?")) return;
    const { error } = await supabase.from("pp_transactions").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">Log income and expenses.</p>
        </div>
        <Button onClick={() => { setEditTx(null); setOpen(true); }} disabled={accounts.length === 0}>
          <Plus size={14} /> Add
        </Button>
      </div>

      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Account" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {accounts.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Create an account in Setup before adding transactions.
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No transactions in this view.</Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {filtered.map((t) => {
              const cat = t.category_id ? catMap[t.category_id] : null;
              const acc = accMap[t.account_id];
              return (
                <Card key={t.id} className="p-3 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-md flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: (cat?.color ?? "#888") + "22" }}>
                    {cat?.icon ?? (t.type === "income" ? "💰" : "💸")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{cat?.name ?? "Uncategorized"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.occurred_on} · {acc?.name}{t.note ? ` · ${t.note}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                      {t.type === "income" ? "+" : "-"}{formatMoney(Number(t.amount), acc?.currency ?? "THB")}
                    </p>
                    <div className="flex justify-end gap-0.5 mt-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditTx(t); setOpen(true); }}>
                        <Pencil size={12} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(t.id)}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop table */}
          <Card className="hidden lg:block overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const cat = t.category_id ? catMap[t.category_id] : null;
                  const acc = accMap[t.account_id];
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.occurred_on}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span>{cat?.icon ?? "•"}</span>{cat?.name ?? "Uncategorized"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{acc?.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">{t.note}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={t.type === "income" ? "default" : "secondary"} className="font-mono">
                          {t.type === "income" ? "+" : "-"}{formatMoney(Number(t.amount), acc?.currency ?? "THB")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5 justify-end">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditTx(t); setOpen(true); }}>
                            <Pencil size={13} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(t.id)}>
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
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
