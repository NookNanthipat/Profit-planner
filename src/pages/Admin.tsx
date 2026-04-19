import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase, type Product } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const emptyForm = {
  slug: "",
  name: "",
  description: "",
  price_cents: 0,
  currency: "usd",
  app_route: "",
  badge: "",
  is_active: true,
  is_coming_soon: false,
};

const Admin = () => {
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
    const { error } = await supabase.from("products").insert([{ ...form }]);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setForm({ ...emptyForm });
    toast({ title: "Product created" });
    load();
  };

  const togglePatch = async (id: string, patch: Partial<Product>) => {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product? Existing entitlements will be removed.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <Link to="/portal" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Portal
        </Link>
        <h1 className="text-3xl font-display font-bold mb-1">Admin · Products</h1>
        <p className="text-muted-foreground mb-8">Create and manage products available in the portal.</p>

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
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_coming_soon} onCheckedChange={(v) => setForm({ ...form, is_coming_soon: v })} />
              <Label>Coming soon</Label>
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
            {products.map((p) => (
              <Card key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold">{p.name} <span className="text-xs text-muted-foreground font-normal">/{p.slug}</span></div>
                  <div className="text-sm text-muted-foreground line-clamp-1">{p.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">${(p.price_cents / 100).toFixed(2)} · {p.app_route || "no route"}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs">
                    <Switch checked={p.is_active} onCheckedChange={(v) => togglePatch(p.id, { is_active: v })} />
                    <span>Active</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Switch checked={p.is_coming_soon} onCheckedChange={(v) => togglePatch(p.id, { is_coming_soon: v })} />
                    <span>Soon</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
