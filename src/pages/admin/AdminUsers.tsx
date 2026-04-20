import { useEffect, useState } from "react";
import { Loader2, Search, Shield, ShieldOff, Plus, Trash2 } from "lucide-react";
import { supabase, type Product, type EntitlementStatus } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  entitlement_count: number;
}

interface UserEntitlement {
  id: string;
  product_id: string;
  product_slug: string;
  product_name: string;
  status: EntitlementStatus;
  purchased_at: string;
  expired_at: string | null;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [entitlements, setEntitlements] = useState<UserEntitlement[]>([]);
  const [loadingEnts, setLoadingEnts] = useState(false);

  // grant form
  const [grantProductId, setGrantProductId] = useState<string>("");
  const [grantStatus, setGrantStatus] = useState<EntitlementStatus>("active");
  const [grantExpiry, setGrantExpiry] = useState<string>("");

  const loadUsers = async () => {
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setUsers((data as AdminUser[]) || []);
    }
    setLoading(false);
  };

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts((data as Product[]) || []);
  };

  useEffect(() => { loadUsers(); loadProducts(); }, []);

  const openUser = async (u: AdminUser) => {
    setSelected(u);
    setLoadingEnts(true);
    const { data } = await supabase.rpc("admin_user_entitlements", { _user_id: u.user_id });
    setEntitlements((data as UserEntitlement[]) || []);
    setLoadingEnts(false);
  };

  const refreshSelected = async () => {
    if (!selected) return;
    const { data } = await supabase.rpc("admin_user_entitlements", { _user_id: selected.user_id });
    setEntitlements((data as UserEntitlement[]) || []);
    loadUsers();
  };

  const grant = async () => {
    if (!selected || !grantProductId) return;
    const { error } = await supabase.rpc("admin_grant_entitlement", {
      _user_id: selected.user_id,
      _product_id: grantProductId,
      _status: grantStatus,
      _expired_at: grantExpiry ? new Date(grantExpiry).toISOString() : null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Entitlement granted" });
      setGrantProductId(""); setGrantExpiry("");
      refreshSelected();
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this entitlement?")) return;
    const { error } = await supabase.rpc("admin_revoke_entitlement", { _user_product_id: id });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Revoked" }); refreshSelected(); }
  };

  const toggleAdmin = async (u: AdminUser) => {
    const make = !u.is_admin;
    if (!confirm(make ? `Make ${u.email} an admin?` : `Remove admin from ${u.email}?`)) return;
    const { error } = await supabase.rpc("admin_set_role", { _user_id: u.user_id, _make_admin: make });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: make ? "Admin granted" : "Admin removed" }); loadUsers(); if (selected?.user_id === u.user_id) setSelected({ ...u, is_admin: make }); }
  };

  const filtered = users.filter((u) =>
    !search ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <h1 className="text-3xl font-display font-bold mb-1">Users</h1>
      <p className="text-muted-foreground mb-6">Manage user access, entitlements, and admin roles.</p>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input className="pl-9" placeholder="Search by email or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-muted-foreground" />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border/40">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
              <div className="col-span-5">User</div>
              <div className="col-span-2">Joined</div>
              <div className="col-span-2">Last sign-in</div>
              <div className="col-span-1 text-center">Products</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {filtered.map((u) => (
              <div key={u.user_id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm hover:bg-muted/20">
                <div className="col-span-5 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {u.display_name}
                    {u.is_admin && <Badge variant="secondary" className="text-[10px]">admin</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}
                </div>
                <div className="col-span-1 text-center"><Badge variant="outline">{u.entitlement_count}</Badge></div>
                <div className="col-span-2 flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleAdmin(u)} title={u.is_admin ? "Remove admin" : "Make admin"}>
                    {u.is_admin ? <ShieldOff size={14} /> : <Shield size={14} />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openUser(u)}>Manage</Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No users found.</div>}
          </div>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.display_name}</DialogTitle>
            <DialogDescription>{selected?.email}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-sm mb-3">Entitlements</h3>
              {loadingEnts ? (
                <Loader2 className="animate-spin text-muted-foreground" />
              ) : entitlements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No entitlements yet.</p>
              ) : (
                <div className="space-y-2">
                  {entitlements.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/60">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{e.product_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.status} · purchased {new Date(e.purchased_at).toLocaleDateString()}
                          {e.expired_at && ` · expires ${new Date(e.expired_at).toLocaleDateString()}`}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => revoke(e.id)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border/40 pt-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Plus size={14} /> Grant entitlement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Product</Label>
                  <Select value={grantProductId} onValueChange={setGrantProductId}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={grantStatus} onValueChange={(v) => setGrantStatus(v as EntitlementStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">Expires at (optional)</Label>
                  <Input type="datetime-local" value={grantExpiry} onChange={(e) => setGrantExpiry(e.target.value)} />
                </div>
              </div>
              <Button className="mt-3" onClick={grant} disabled={!grantProductId}>Grant</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
