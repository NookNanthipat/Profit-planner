import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const CookieConsent = () => {
  const [show, setShow] = useState(false);
  const { i18n } = useTranslation();
  const isTh = i18n.language === "th";

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md z-[100]"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-border/50 p-6 rounded-[32px] shadow-2xl shadow-primary/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Cookie size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-foreground">
                  {isTh ? "เราใช้คุกกี้" : "We use cookies"}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                  {isTh 
                    ? "เพื่อเพิ่มประสิทธิภาพการใช้งานและวิเคราะห์ข้อมูลเว็บไซต์ อ่านเพิ่มเติมได้ที่" 
                    : "To enhance your experience and analyze our traffic. Learn more in our"}{" "}
                  <Link to="/privacy" className="text-primary hover:underline underline-offset-4">
                    {isTh ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy"}
                  </Link>.
                </p>
              </div>
              <button onClick={() => setShow(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAccept} className="flex-1 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                {isTh ? "ยอมรับทั้งหมด" : "Accept All"}
              </Button>
              <Button onClick={handleDecline} variant="ghost" className="rounded-xl font-bold uppercase text-[10px]">
                {isTh ? "ปฏิเสธ" : "Decline"}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
