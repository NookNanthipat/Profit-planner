import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase, type Product } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  getProductStatus, statusToFlags, statusLabel, statusBadgeVariant,
  type ProductStatus,
} from "@/lib/productStatus";

const emptyForm = {
  slug: "",
  name: "",
  description: "",
  price_cents: 0,
  currency: "usd",
  app_route: "",
  badge: "",
  status: "live" as ProductStatus,
};

const AdminProducts = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const load = async () => {
    const { data } = await supabase.from("products").select("*").order("created_at");
    setProducts((data as Product[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { status, ...rest } = form;
    const { error } = await supabase.from("products").insert([{ ...rest, ...statusToFlags(status) }]);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setForm({ ...emptyForm });
    toast({ title: "Product created" });
    load();
  };

  const updateStatus = async (id: string, s: ProductStatus) => {
    const { error } = await supabase.from("products").update(statusToFlags(s)).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Status set to ${statusLabel[s]}` }); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product? Existing entitlements will be removed.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-display font-bold mb-1">Products</h1>
      <p className="text-muted-foreground mb-8">Create and manage products available across the platform.</p>

      <Card className="p-6 mb-8">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Plus size={16} /> Add product</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="my-product" />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Price (cents)</Label>
            <Input type="number" min={0} value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>App route</Label>
            <Input value={form.app_route} onChange={(e) => setForm({ ...form, app_route: e.target.value })} placeholder="/app/something" />
          </div>
          <div className="space-y-2">
            <Label>Badge</Label>
            <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Premium" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProductStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="coming_soon">Coming Soon</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : "Create product"}
            </Button>
          </div>
        </form>
      </Card>

      <h2 className="font-semibold mb-4">All products</h2>
      {loading ? (
        <Loader2 className="animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const s = getProductStatus(p);
            return (
              <Card key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold flex items-center gap-2 flex-wrap">
                    {p.name}
                    <span className="text-xs text-muted-foreground font-normal">/{p.slug}</span>
                    <Badge variant={statusBadgeVariant[s]}>{statusLabel[s]}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-1">{p.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">${(p.price_cents / 100).toFixed(2)} · {p.app_route || "no route"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={s} onValueChange={(v) => updateStatus(p.id, v as ProductStatus)}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="coming_soon">Coming Soon</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
