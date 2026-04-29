import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { AccountType, PPAccount } from "@/lib/profitPlanner";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  type: z.enum(["cash", "bank", "credit", "ewallet"]),
  currency: z.string().trim().min(2).max(6),
  opening_balance: z.number().min(-9_999_999_999).max(9_999_999_999),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  account?: PPAccount | null;
  onSaved: () => void;
}

const AccountForm = ({ open, onOpenChange, account, onSaved }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "bank");
  const [currency, setCurrency] = useState(account?.currency ?? "THB");
  const [opening, setOpening] = useState(String(account?.opening_balance ?? "0"));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) return;
    const parsed = schema.safeParse({
      name, type, currency, opening_balance: Number(opening) || 0,
    });
    if (!parsed.success) {
      toast({ title: t("app.common.error"), description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { ...parsed.data, user_id: user.id };
    const res = account
      ? await supabase.from("pp_accounts").update(payload).eq("id", account.id)
      : await supabase.from("pp_accounts").insert(payload);
    setSaving(false);
    if (res.error) {
      toast({ title: t("app.common.error"), description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("app.common.success") });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? t("app.common.edit") : t("app.setup.newSource")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("app.forms.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SCB Main" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("app.forms.type")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cash", "bank", "credit", "ewallet"].map(k => (
                    <SelectItem key={k} value={k}>{t(`app.types.account.${k}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("app.forms.currency")}</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={6} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("app.forms.openingBalance")}</Label>
            <Input type="number" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("app.common.cancel")}</Button>
          <Button onClick={submit} disabled={saving}>{saving ? t("app.common.save") + "..." : t("app.common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AccountForm;
