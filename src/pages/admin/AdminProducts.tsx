import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Pencil, Save, X } from "lucide-react";
import { supabase, type Product } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type ProductStatus = "live" | "coming_soon" | "draft";

const emptyForm = {
  slug: "",
  name: "",
  name_th: "",
  description: "",
  description_th: "",
  price_cents: 0,
  price_thb: null as number | null,
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
  const [editingId, setEditId] = useState<string | null>(null);

  const load = async () => {
    try {
      const { data } = await supabase.from("products").select("*").order("sort_order", { ascending: true });
      setProducts((data as Product[]) || []);
    } catch (e) {
      console.error("Load failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setForm({ ...emptyForm });
    setEditId(null);
  };

  const startEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      slug: p.slug,
      name: p.name,
      name_th: p.name_th || "",
      description: p.description || "",
      description_th: p.description_th || "",
      price_cents: p.price_cents,
      price_thb: p.price_thb,
      currency: p.currency,
      app_route: p.app_route || "",
      badge: p.badge || "",
      status: p.is_coming_soon ? "coming_soon" : (p.is_active ? "live" : "draft")
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        slug: form.slug,
        name: form.name,
        name_th: form.name_th || null,
        description: form.description || null,
        description_th: form.description_th || null,
        price_cents: form.price_cents,
        price_thb: form.price_thb,
        currency: form.currency,
        app_route: form.app_route || null,
        badge: form.badge || null,
        is_active: form.status === "live",
        is_coming_soon: form.status === "coming_soon",
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Product updated" });
      } else {
        const { error } = await supabase.from("products").insert([payload]);
        if (error) throw error;
        toast({ title: "Product created" });
      }
      reset();
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline-block mr-2" /> Loading...</div>;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10">
      <Card className="p-6 rounded-[32px] border-none shadow-xl bg-card/60 backdrop-blur">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-600">
            {editingId ? <Pencil size={20} /> : <Plus size={20} />}
            {editingId ? "Modify Existing Product" : "Launch New Product"}
          </h2>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={reset} className="rounded-xl font-bold uppercase text-[10px]">
              <X size={14} className="mr-1" /> Cancel Edit
            </Button>
          )}
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Slug (Unique URL)</Label>
            <Input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="profit-planner" className="h-11 rounded-xl bg-muted/20 border-none px-4" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Visibility Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProductStatus })}>
              <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none px-4"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl">
                <SelectItem value="live">Live / Active</SelectItem>
                <SelectItem value="coming_soon">Coming Soon</SelectItem>
                <SelectItem value="draft">Draft / Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Name (English)</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 rounded-xl bg-muted/20 border-none px-4" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Name (Thai)</Label>
            <Input value={form.name_th} onChange={(e) => setForm({ ...form, name_th: e.target.value })} placeholder="ชื่อภาษาไทย" className="h-11 rounded-xl bg-muted/20 border-none px-4 font-thai" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">English Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl bg-muted/20 border-none min-h-[100px] p-4" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Thai Description</Label>
            <Textarea value={form.description_th} onChange={(e) => setForm({ ...form, description_th: e.target.value })} placeholder="รายละเอียดสินค้าภาษาไทย" className="rounded-xl bg-muted/20 border-none min-h-[100px] p-4 font-thai" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Base Price (USD Cents)</Label>
            <Input type="number" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: parseInt(e.target.value) })} className="h-11 rounded-xl bg-muted/20 border-none px-4" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Fixed Thai Price (THB)</Label>
            <Input type="number" value={form.price_thb || ""} onChange={(e) => setForm({ ...form, price_thb: e.target.value ? parseInt(e.target.value) : null })} placeholder="e.g. 199" className="h-11 rounded-xl bg-muted/20 border-none px-4" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Internal App Route</Label>
            <Input value={form.app_route} onChange={(e) => setForm({ ...form, app_route: e.target.value })} placeholder="/app/profit-planner" className="h-11 rounded-xl bg-muted/20 border-none px-4 font-mono text-[10px]" />
          </div>
          <div className="md:col-span-2 pt-4">
            <Button disabled={saving} className="w-full h-12 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.01]">
              {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
              {editingId ? "Update Product Catalog" : "Add to Inventory"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 ml-2 mb-2">Live Inventory</h3>
        {products.map((p) => (
          <Card key={p.id} className="p-6 flex items-center justify-between gap-6 rounded-[32px] border-none shadow-sm ring-1 ring-border/40 bg-card/30 hover:bg-card/50 transition-all group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-black uppercase tracking-tight text-foreground truncate">{p.name}</span>
                <Badge variant={p.is_coming_soon ? "outline" : (p.is_active ? "default" : "secondary")} className="text-[8px] h-4 uppercase font-black tracking-widest">
                   {p.is_coming_soon ? "Soon" : (p.is_active ? "Live" : "Draft")}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground truncate opacity-70 italic">{p.description}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right hidden sm:block">
                 <p className="font-black text-xs text-primary">฿{(p.price_thb || (p.price_cents / 100) * 35).toLocaleString()}</p>
                 <p className="text-[9px] uppercase font-bold text-muted-foreground opacity-40">{p.slug}</p>
              </div>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary" onClick={() => startEdit(p)}>
                  <Pencil size={16} />
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-rose-500/10 text-rose-500" onClick={() => remove(p.id)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminProducts;
