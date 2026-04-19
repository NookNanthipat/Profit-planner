import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const isTh = i18n.language === "th";

  useEffect(() => {
    // Supabase emits a PASSWORD_RECOVERY event when the user lands here from an email link
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setRecoveryReady(true);
      }
    });
    // Also accept users that already have an active recovery session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecoveryReady(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: isTh ? "รหัสผ่านไม่ตรงกัน" : "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({
        title: isTh ? "เปลี่ยนรหัสผ่านสำเร็จ" : "Password updated",
        description: isTh ? "เข้าสู่ระบบด้วยรหัสใหม่ของคุณ" : "Sign in with your new password.",
      });
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-2xl font-bold">
            Profit<span className="text-gradient-emerald">Planner</span>
          </Link>
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mt-6 mb-4">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-2xl font-semibold">{isTh ? "ตั้งรหัสผ่านใหม่" : "Set new password"}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isTh ? "เลือกรหัสผ่านที่คาดเดายาก" : "Choose a strong password you haven't used before."}
          </p>
        </div>

        <Card className="p-6 backdrop-blur-xl bg-card/80 border-border/60 shadow-xl">
          {!recoveryReady ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              {isTh ? "กำลังตรวจสอบลิงก์รีเซ็ต..." : "Validating reset link..."}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{isTh ? "รหัสผ่านใหม่" : "New password"}</Label>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">{isTh ? "ยืนยันรหัสผ่าน" : "Confirm password"}</Label>
                <Input id="confirm" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : isTh ? "อัปเดตรหัสผ่าน" : "Update password"}
              </Button>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
