import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/profitplanner-logo.png";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.5 14.7 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z" />
  </svg>
);

const Auth = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const isTh = i18n.language === "th";

  const redirectTo = (location.state as { from?: string } | null)?.from || "/portal";

  useEffect(() => {
    if (session) navigate(redirectTo, { replace: true });
  }, [session, navigate, redirectTo]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/portal`,
            data: { display_name: displayName },
          },
        });
        if (error) throw error;
        toast({
          title: isTh ? "สมัครสำเร็จ" : "Account created",
          description: isTh ? "ตรวจสอบอีเมลเพื่อยืนยันบัญชี" : "Check your email to confirm.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: isTh ? "เข้าสู่ระบบสำเร็จ" : "Welcome back" });
        navigate(redirectTo);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: isTh ? "เกิดข้อผิดพลาด" : "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/portal` },
    });
    if (error) {
      toast({ title: isTh ? "Google ล้มเหลว" : "Google sign-in failed", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />

      <Link to="/" className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors z-10">
        <ArrowLeft size={16} /> {isTh ? "กลับหน้าแรก" : "Back to home"}
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="flex flex-col items-center gap-4 group">
            <div className="w-16 h-16 rounded-[22px] bg-white dark:bg-muted shadow-xl flex items-center justify-center p-3 group-hover:scale-110 transition-transform">
              <img src={logo} alt="ProfitPlanner" className="w-full h-full object-contain" />
            </div>
            <span className="font-display text-3xl font-black tracking-tighter">
              Profit<span className="text-emerald-500">Planner</span>
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-foreground">
            {mode === "signin" ? (isTh ? "เข้าสู่ระบบ" : "Welcome back") : isTh ? "สร้างบัญชี" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === "signin"
              ? isTh ? "เข้าสู่ระบบเพื่อจัดการการเงินของคุณ" : "Sign in to manage your finances"
              : isTh ? "เริ่มต้นใช้งานฟรี ไม่ต้องใช้บัตรเครดิต" : "Start free — no credit card required"}
          </p>
        </div>

        <Card className="p-6 backdrop-blur-xl bg-card/80 border-border/60 shadow-xl">
          <Button type="button" variant="outline" className="w-full mb-4" onClick={handleGoogle} disabled={loading}>
            <GoogleIcon />
            <span className="ml-2">{isTh ? "เข้าสู่ระบบด้วย Google" : "Continue with Google"}</span>
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{isTh ? "หรือ" : "or"}</span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="displayName">{isTh ? "ชื่อที่แสดง" : "Display name"}</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={isTh ? "ชื่อของคุณ" : "Your name"} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{isTh ? "อีเมล" : "Email"}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{isTh ? "รหัสผ่าน" : "Password"}</Label>
                {mode === "signin" && (
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    {isTh ? "ลืมรหัสผ่าน?" : "Forgot password?"}
                  </Link>
                )}
              </div>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : mode === "signin" ? (isTh ? "เข้าสู่ระบบ" : "Sign in") : isTh ? "สมัครสมาชิก" : "Create account"}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            {mode === "signin" ? (isTh ? "ยังไม่มีบัญชี?" : "Don't have an account?") : isTh ? "มีบัญชีอยู่แล้ว?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
              {mode === "signin" ? (isTh ? "สมัครเลย" : "Sign up") : isTh ? "เข้าสู่ระบบ" : "Sign in"}
            </button>
          </p>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
