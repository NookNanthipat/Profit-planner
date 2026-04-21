import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import AccountForm from "@/components/profit-planner/AccountForm";
import CategoryForm from "@/components/profit-planner/CategoryForm";
import { ACCOUNT_TYPE_LABEL, formatMoney, type PPAccount, type PPCategory } from "@/lib/profitPlanner";

const Setup = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<PPAccount[]>([]);
  const [categories, setCategories] = useState<PPCategory[]>([]);
  const [accFormOpen, setAccFormOpen] = useState(false);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [editAcc, setEditAcc] = useState<PPAccount | null>(null);
  const [editCat, setEditCat] = useState<PPCategory | null>(null);

  const load = async () => {
    if (!user) return;
    const [a, c] = await Promise.all([
      supabase.from("pp_accounts").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("pp_categories").select("*").eq("user_id", user.id).order("type").order("sort_order"),
    ]);
    setAccounts((a.data as PPAccount[]) ?? []);
    setCategories((c.data as PPCategory[]) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const removeAccount = async (id: string) => {
    if (!confirm("Delete this account and all its transactions?")) return;
    const { error } = await supabase.from("pp_accounts").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Account deleted" }); load(); }
  };
  const removeCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("pp_categories").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Category deleted" }); load(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold">Setup</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your accounts and categories.</p>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Accounts ({accounts.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditAcc(null); setAccFormOpen(true); }}>
              <Plus size={14} /> New account
            </Button>
          </div>
          {accounts.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              No accounts yet. Create your first one to start logging transactions.
            </Card>
          ) : (
            <div className="grid gap-2">
              {accounts.map((a) => (
                <Card key={a.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{a.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{ACCOUNT_TYPE_LABEL[a.type]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Opening: {formatMoney(Number(a.opening_balance), a.currency)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => { setEditAcc(a); setAccFormOpen(true); }}>
                      <Pencil size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => removeAccount(a.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditCat(null); setCatFormOpen(true); }}>
              <Plus size={14} /> New category
            </Button>
          </div>
          {(["expense", "income"] as const).map((t) => {
            const list = categories.filter((c) => c.type === t);
            if (list.length === 0) return null;
            return (
              <div key={t}>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 mt-4">{t}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {list.map((c) => (
                    <Card key={c.id} className="p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-8 h-8 rounded-md flex items-center justify-center text-base shrink-0"
                          style={{ backgroundColor: (c.color ?? "#888") + "22" }}
                        >{c.icon || "🏷️"}</span>
                        <span className="truncate text-sm">{c.name}</span>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => { setEditCat(c); setCatFormOpen(true); }}>
                          <Pencil size={13} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => removeCategory(c.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      <AccountForm open={accFormOpen} onOpenChange={setAccFormOpen} account={editAcc} onSaved={load} />
      <CategoryForm open={catFormOpen} onOpenChange={setCatFormOpen} category={editCat} onSaved={load} />
    </div>
  );
};

export default Setup;
