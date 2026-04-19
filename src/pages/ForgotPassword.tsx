import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const { i18n } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const isTh = i18n.language === "th";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast({
        title: isTh ? "ส่งอีเมลเรียบร้อย" : "Email sent",
        description: isTh ? "ตรวจสอบกล่องจดหมายของคุณ" : "Check your inbox for the reset link.",
      });
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

      <Link to="/login" className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors z-10">
        <ArrowLeft size={16} /> {isTh ? "กลับไปเข้าสู่ระบบ" : "Back to sign in"}
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-2xl font-bold">
            Profit<span className="text-gradient-emerald">Planner</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold">{isTh ? "ลืมรหัสผ่าน?" : "Forgot password?"}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isTh ? "กรอกอีเมลของคุณ เราจะส่งลิงก์รีเซ็ตให้" : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        <Card className="p-6 backdrop-blur-xl bg-card/80 border-border/60 shadow-xl">
          {sent ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <Mail size={24} />
              </div>
              <p className="font-semibold">{isTh ? "ส่งอีเมลเรียบร้อยแล้ว" : "Check your inbox"}</p>
              <p className="text-sm text-muted-foreground mt-2">{email}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{isTh ? "อีเมล" : "Email"}</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : isTh ? "ส่งลิงก์รีเซ็ต" : "Send reset link"}
              </Button>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
