import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles, Target, BarChart3, ListPlus, PlayCircle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "../admin/EditableText";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface DemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TOUR_STEPS = [
  {
    id: "step1",
    icon: ListPlus,
    label: "Track Everything",
    label_th: "บันทึกทุกรายการ",
    title: "Simple Ledger Control",
    title_th: "ระบบบัญชีที่ใช้งานง่าย",
    desc: "Record every transaction in seconds. Categorize with ease and never lose track of a single dollar or baht.",
    desc_th: "บันทึกรายรับรายจ่ายได้ในไม่กี่วินาที แยกหมวดหมู่ได้ง่าย และไม่พลาดทุกยอดเงินสำคัญของคุณ",
    color: "bg-blue-500",
  },
  {
    id: "step2",
    icon: Sparkles,
    label: "Debt Snowball",
    label_th: "แผนพิชิตหนี้",
    title: "Master Your Loans",
    title_th: "จัดการหนี้อย่างมืออาชีพ",
    desc: "Visualize your path to freedom with dynamic amortization schedules. Celebrate every payoff with automated animations.",
    desc_th: "มองเห็นเส้นทางสู่อิสรภาพด้วยตารางผ่อนชำระแบบไดนามิก พร้อมเฉลิมฉลองทุกครั้งที่ปิดหนี้ได้สำเร็จ",
    color: "bg-emerald-500",
  },
  {
    id: "step3",
    icon: BarChart3,
    label: "Pro Insights",
    label_th: "ข้อมูลเชิงลึก",
    title: "Deep Financial Analytics",
    title_th: "วิเคราะห์การเงินเชิงลึก",
    desc: "Uncover hidden patterns in your spending. Annual and monthly dashboards give you the core insights you need to grow.",
    desc_th: "ค้นหาพฤติกรรมการใช้จ่ายที่ซ่อนอยู่ ด้วย Dashboard รายเดือนและรายปีที่ช่วยให้คุณเติบโตมั่งคั่งขึ้น",
    color: "bg-amber-500",
  },
  {
    id: "step4",
    icon: Target,
    label: "Predict Future",
    label_th: "จำลองอนาคต",
    title: "Wealth Engine Simulator",
    title_th: "ระบบจำลองความมั่งคั่ง",
    desc: "Simulate compound growth scenarios and plan your retirement. See exactly where you'll be in 10, 20, or 30 years.",
    desc_th: "จำลองการเติบโตของเงินทุนและวางแผนเกษียณ เห็นอนาคตทางการเงินของคุณในอีก 10, 20 หรือ 30 ปีข้างหน้า",
    color: "bg-indigo-500",
  }
];

export const DemoModal = ({ open, onOpenChange }: DemoModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const [current, setCurrent] = useState(0);
  const { ds } = useSiteContent("demo");

  // Reset to first slide when modal opens
  useEffect(() => {
    if (open) setCurrent(0);
  }, [open]);

  const isThai = i18n.language?.startsWith("th");

  const handleStartFree = async () => {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    try {
      const { data: product } = await supabase.from("products").select("id").eq("slug", "profit-planner").single();
      if (!product) throw new Error("Product not found");

      const { error } = await supabase.from("user_products").upsert({
        user_id: user.id,
        product_id: product.id,
        status: "trial",
        purchased_at: new Date().toISOString()
      }, { onConflict: 'user_id,product_id' });

      if (error) throw error;
      toast({ title: isThai ? "รับสิทธิ์ใช้งานฟรีเรียบร้อย" : "Free Access Granted", description: isThai ? "ยินดีต้อนรับสู่เวอร์ชันทดลองใช้งาน!" : "Welcome to your trial!" });
      onOpenChange(false);
      window.location.href = "/portal";
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    }
  };

  const next = () => setCurrent((c) => (c + 1) % TOUR_STEPS.length);
  const prev = () => setCurrent((c) => (c - 1 + TOUR_STEPS.length) % TOUR_STEPS.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="max-w-5xl p-0 overflow-hidden border-none bg-background/60 backdrop-blur-2xl rounded-[40px] shadow-2xl">
        <div className="flex flex-col lg:flex-row h-full min-h-[600px]">
          {/* Left Side: Visual/Graphic */}
          <div className="lg:w-1/2 bg-slate-900 relative overflow-hidden flex items-center justify-center p-12 shrink-0">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-primary rounded-full blur-[120px]" />
              <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500 rounded-full blur-[100px]" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="relative z-10 w-full aspect-video glass-card border-white/20 shadow-2xl flex flex-col items-center justify-center gap-6"
              >
                <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-xl", TOUR_STEPS[current].color)}>
                  {React.createElement(TOUR_STEPS[current].icon, { size: 40 })}
                </div>
                <div className="text-center space-y-2">
                   <h4 className="text-white font-black uppercase tracking-tighter text-2xl px-6">
                      <EditableText 
                        section="demo" 
                        fieldKey={`step_${current}_title`} 
                        defaultValue={ds(`step_${current}_title`, "", isThai ? TOUR_STEPS[current].title_th : TOUR_STEPS[current].title)} 
                      />
                   </h4>
                   <div className="h-1 w-12 bg-primary mx-auto rounded-full" />
                </div>
                
                <div className="w-full px-8 mt-4 space-y-3 opacity-40">
                  <div className="h-2 w-full bg-white/20 rounded-full" />
                  <div className="h-2 w-3/4 bg-white/20 rounded-full" />
                  <div className="h-2 w-1/2 bg-white/20 rounded-full" />
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="absolute bottom-8 left-8 flex gap-2">
              {TOUR_STEPS.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-1.5 transition-all duration-500 rounded-full",
                    current === i ? "w-8 bg-primary" : "w-2 bg-white/20"
                  )} 
                />
              ))}
            </div>
          </div>

          {/* Right Side: Content & Controls */}
          <div className="lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center relative bg-card">
            <button 
              onClick={() => onOpenChange(false)}
              className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-muted transition-all text-muted-foreground hover:scale-110 active:scale-95 z-50 bg-muted/30 shadow-sm border border-border/40"
            >
              <X size={24} />
            </button>

            <div className="space-y-8">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
                  <PlayCircle size={14} /> {isThai ? "แนะนำฟีเจอร์" : "Feature Showcase"}
                </span>
                <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground leading-[1.1]">
                   <EditableText 
                    section="demo" 
                    fieldKey={`step_${current}_label`} 
                    defaultValue={ds(`step_${current}_label`, "", isThai ? TOUR_STEPS[current].label_th : TOUR_STEPS[current].label)} 
                  />
                </h2>
              </div>

              <div className="min-h-[120px]">
                <p className="text-lg text-muted-foreground leading-relaxed">
                   <EditableText 
                    section="demo" 
                    fieldKey={`step_${current}_desc`} 
                    defaultValue={ds(`step_${current}_desc`, "", isThai ? TOUR_STEPS[current].desc_th : TOUR_STEPS[current].desc)} 
                    multiline 
                  />
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-12 w-12 rounded-2xl border-border/60 hover:bg-muted" 
                  onClick={prev}
                >
                  <ChevronLeft size={24} />
                </Button>
                <Button 
                  className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 group"
                  onClick={current === TOUR_STEPS.length - 1 ? handleStartFree : next}
                >
                  {current === TOUR_STEPS.length - 1 
                    ? (isThai ? "เริ่มใช้งานฟรี" : "Start Free Now") 
                    : (isThai ? "ขั้นตอนถัดไป" : "Next Insight")}
                  <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
            
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-12 opacity-40 text-center">
              {isThai ? "สัมผัสอนาคตของการจัดการเงินส่วนบุคคล" : "Experience the Future of Personal Finance"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemoModal;
