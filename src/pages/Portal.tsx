import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Settings, Shield, Trash2, AlertTriangle, Download } from "lucide-react";
import { supabase, type Product, type UserProduct } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import SettingsMenu from "@/components/SettingsMenu";
import ProductCard from "@/components/portal/ProductCard";

import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "@/components/admin/EditableText";

type EntitlementMap = Record<string, UserProduct>;

const PortalPage = () => {
  const { user, signOut, isAdmin } = useAuth();
  const { t, i18n } = useTranslation();
  const { ds } = useSiteContent("portal");
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);

  const handleDeleteAccount = async () => {
    try {
      const { error } = await supabase.rpc('delete_user_data_and_account');
      if (error) throw error;
      setShowDeleteDialog(false);
      await signOut();
      toast({
        title: i18n.language === "th" ? "ลบบัญชีสำเร็จ" : "Account Deleted",
        description: i18n.language === "th" ? "ข้อมูลของคุณถูกลบออกจากระบบแล้ว" : "Your account and data have been permanently removed.",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };
  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const tables = [
        "pp_accounts", "pp_categories", "pp_transactions", "pp_recurring",
        "pp_budgets", "pp_debts", "pp_assets", "pp_asset_lots",
        "pp_simulations", "pp_people", "pp_splits",
      ] as const;

      const results = await Promise.all(
        tables.map((t) => supabase.from(t).select("*"))
      );

      const data: Record<string, unknown[]> = {};
      tables.forEach((t, i) => {
        data[t] = results[i].data ?? [];
      });

      const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      const { data: consent } = await supabase.from("consent_records").select("policy_version, accepted_tos, accepted_privacy, accepted_marketing, consented_at");

      const exportPayload = {
        exported_at: new Date().toISOString(),
        user_id: user!.id,
        email: user!.email,
        profile,
        consent_records: consent ?? [],
        financial_data: data,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `profitplanner-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: i18n.language === "th" ? "Export สำเร็จ" : "Export complete",
        description: i18n.language === "th" ? "ดาวน์โหลดข้อมูลของคุณแล้ว" : "Your data has been downloaded.",
      });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExportLoading(false);
    }
  };

  const [entitlements, setEntitlements] = useState<EntitlementMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [productsRes, upRes] = await Promise.all([
          supabase.from("products").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
          supabase.from("user_products").select("*").eq("user_id", user.id),
        ]);

        if (cancelled) return;

        if (productsRes.error) throw productsRes.error;
        if (upRes.error) throw upRes.error;

        setProducts((productsRes.data as Product[]) || []);

        const map: EntitlementMap = {};
        if (upRes.data) {
          (upRes.data as UserProduct[]).forEach((e) => (map[e.product_id] = e));
        }
        setEntitlements(map);
      } catch (e: any) {
        console.error("Portal Load Error:", e);
        setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    // Re-fetch when admin saves a product via EditableText/EditableButton
    window.addEventListener("pp:products:updated", load);
    return () => {
      cancelled = true;
      window.removeEventListener("pp:products:updated", load);
    };
  }, [user]);

  if (error) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold text-destructive mb-2">Load Error</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // All non-coming-soon products appear in "Your Products".
  // Products with a paid/trial entitlement get their real status;
  // everything else shows as "free" (accessible but limited).
  const owned = products.filter((p) => p?.id && !p.is_coming_soon);

  const getEntitlement = (p: Product): UserProduct | undefined => {
    const e = entitlements[p.id];
    if (e) {
      // expired trial → treat as free again
      if (e.expired_at && new Date(e.expired_at) < new Date()) {
        return { ...e, status: "free" } as UserProduct;
      }
      return e;
    }
    // No row → synthetic free entitlement
    return { id: "free", user_id: user!.id, product_id: p.id, status: "free", purchased_at: "", expired_at: null, created_at: "" } as unknown as UserProduct;
  };

  const available = products.filter((p) => p?.id && p.is_coming_soon);
  const logoutText = t("nav.sign_out") === "nav.sign_out" ? "Sign out" : t("nav.sign_out");
  const activeText = t("nav.active") === "nav.active" ? "active" : t("nav.active");
  const availableText = t("nav.available") === "nav.available" ? "available" : t("nav.available");
  const initial = ((user?.user_metadata?.display_name as string) || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold">
            Profit<span className="text-gradient-emerald">Planner</span>
          </Link>
          <div className="flex items-center gap-3">
            <SettingsMenu />
            {isAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin"><Shield size={14} /> Admin</Link>
              </Button>
            )}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                {initial}
              </div>
              <span className="text-muted-foreground truncate max-w-[160px]">{user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut size={14} /> {logoutText}</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-sm text-muted-foreground mb-1">
            <EditableText section="portal" fieldKey="welcome_back" defaultValue={ds("welcome_back", "nav.welcome")} />
          </p>
          <h1 className="text-3xl font-display font-bold">{(user?.user_metadata?.display_name as string) || user?.email}</h1>
          <p className="text-muted-foreground mt-2">
            <EditableText section="portal" fieldKey="portal_desc" defaultValue={ds("portal_desc", "nav.portal_description") || "Manage your products and pick up where you left off."} multiline />
          </p>
        </motion.div>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              <EditableText section="portal" fieldKey="your_products" defaultValue={ds("your_products", "nav.your_products") || "Your Products"} />
            </h2>
            <span className="text-sm text-muted-foreground">{owned.length} {owned.length === 1 ? "product" : "products"}</span>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : owned.length === 0 ? (
            <Card className="p-10 text-center bg-muted/30 border-dashed rounded-[32px]">
              <p className="text-muted-foreground">
                <EditableText section="portal" fieldKey="no_products" defaultValue={ds("no_products", "nav.no_products") || "You don't own any products yet. Browse the suite below to get started."} multiline />
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {owned.map((p) => (
                <ProductCard key={p.id} product={p} entitlement={getEntitlement(p)} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              <EditableText section="portal" fieldKey="available_products" defaultValue={ds("available_products", "nav.available_products") || "Available Products"} />
            </h2>
            <span className="text-sm text-muted-foreground">{available.length} {availableText}</span>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {available.map((p) => (
                <ProductCard key={p.id} product={p} entitlement={undefined} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-20 pt-10 border-t border-border/40">
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2 mb-4">
                <Download size={18} />
                {i18n.language === "th" ? "ข้อมูลของฉัน (PDPA)" : "My Data (PDPA)"}
              </h2>
              <Card className="p-6 border-border/40 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-bold text-foreground">
                    {i18n.language === "th" ? "Export ข้อมูลของฉัน" : "Export My Data"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {i18n.language === "th"
                      ? "ดาวน์โหลดข้อมูลทั้งหมดของคุณในรูปแบบ JSON ตามสิทธิ์ภายใต้ PDPA (Right to Portability)"
                      : "Download all your data as JSON — your right under PDPA (Right to Portability)."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleExportData}
                  disabled={exportLoading}
                  className="rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest shrink-0"
                >
                  <Download size={16} className="mr-2" />
                  {exportLoading
                    ? (i18n.language === "th" ? "กำลัง Export..." : "Exporting...")
                    : (i18n.language === "th" ? "Export ข้อมูล" : "Export Data")}
                </Button>
              </Card>
            </div>

            <div>
            <h2 className="text-lg font-bold text-rose-500 uppercase tracking-tight flex items-center gap-2 mb-4">
              <AlertTriangle size={18} />
              {i18n.language === "th" ? "เขตอันตราย" : "Danger Zone"}
            </h2>
            <Card className="p-6 border-rose-500/20 bg-rose-500/[0.02] rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <h3 className="font-bold text-foreground">
                  {i18n.language === "th" ? "ลบบัญชีผู้ใช้" : "Delete Account"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {i18n.language === "th" 
                    ? "การดำเนินการนี้จะลบข้อมูลทางการเงินและบัญชีของคุณอย่างถาวร ไม่สามารถย้อนคืนได้" 
                    : "Permanently remove all your financial data and account access. This action cannot be undone."}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-500/20 shrink-0"
              >
                <Trash2 size={16} className="mr-2" />
                {i18n.language === "th" ? "ลบบัญชี" : "Delete Account"}
              </Button>
            </Card>
            </div>
          </div>
        </section>
      </main>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-rose-500 flex items-center gap-2">
              <AlertTriangle size={18} />
              {i18n.language === "th" ? "ยืนยันการลบบัญชี" : "Confirm Account Deletion"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3 text-sm text-muted-foreground">
            <p>
              {i18n.language === "th"
                ? "การดำเนินการนี้จะลบข้อมูลทั้งหมดของคุณอย่างถาวร ได้แก่ รายการธุรกรรม บัญชี พอร์ต งบประมาณ และข้อมูลบัญชีผู้ใช้"
                : "This will permanently delete all your data including transactions, accounts, portfolio, budgets, and your user account."}
            </p>
            <p className="font-bold text-foreground">
              {i18n.language === "th" ? "การดำเนินการนี้ไม่สามารถย้อนกลับได้" : "This action cannot be undone."}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-xl">
              {i18n.language === "th" ? "ยกเลิก" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} className="rounded-xl">
              <Trash2 size={14} className="mr-2" />
              {i18n.language === "th" ? "ลบบัญชีถาวร" : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalPage;
