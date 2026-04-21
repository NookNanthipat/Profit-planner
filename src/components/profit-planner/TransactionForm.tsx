import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { PPAccount, PPCategory, PPTransaction, TxType } from "@/lib/profitPlanner";

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive().max(9_999_999_999),
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  occurred_on: z.string().min(8),
  note: z.string().max(500).nullable(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tx?: PPTransaction | null;
  accounts: PPAccount[];
  categories: PPCategory[];
  onSaved: () => void;
}

const TransactionForm = ({ open, onOpenChange, tx, accounts, categories, onSaved }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<TxType>(tx?.type ?? "expense");
  const [amount, setAmount] = useState(String(tx?.amount ?? ""));
  const [accountId, setAccountId] = useState(tx?.account_id ?? accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState<string | "">(tx?.category_id ?? "");
  const [date, setDate] = useState(tx?.occurred_on ?? new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(tx?.note ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const filteredCats = categories.filter((c) => c.type === type);

  const submit = async () => {
    if (!user) return;
    if (!accountId) {
      toast({ title: "Add an account first", variant: "destructive" });
      return;
    }
    const parsed = schema.safeParse({
      type,
      amount: Number(amount),
      account_id: accountId,
      category_id: categoryId || null,
      occurred_on: date,
      note: note.trim() || null,
    });
    if (!parsed.success) {
      toast({ title: "Invalid input", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { ...parsed.data, user_id: user.id };
    const res = tx
      ? await supabase.from("pp_transactions").update(payload).eq("id", tx.id)
      : await supabase.from("pp_transactions").insert(payload);
    setSaving(false);
    if (res.error) {
      toast({ title: "Error", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: tx ? "Transaction updated" : "Transaction added" });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tx ? "Edit transaction" : "New transaction"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={type === "expense" ? "default" : "outline"}
              onClick={() => setType("expense")}
            >Expense</Button>
            <Button
              type="button"
              variant={type === "income" ? "default" : "outline"}
              onClick={() => setType("income")}
            >Income</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {filteredCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionForm;
