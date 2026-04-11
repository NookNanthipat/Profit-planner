import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import SettingsMenu from "./SettingsMenu";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border"
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        <a href="#" className="font-display text-xl text-foreground tracking-tight">
          Finn<span className="text-gradient-gold">Flow</span>
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#products" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.products")}</a>
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.features")}</a>
          <a href="#roadmap" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.roadmap")}</a>
          <SettingsMenu />
          <a href="#cta" className="btn-gold text-sm py-2 px-6">{t("nav.getStarted")}</a>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <SettingsMenu />
          <button className="text-foreground" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="md:hidden bg-background border-b border-border px-6 pb-6 flex flex-col gap-4"
        >
          <a href="#products" className="text-muted-foreground hover:text-foreground py-2" onClick={() => setIsOpen(false)}>{t("nav.products")}</a>
          <a href="#features" className="text-muted-foreground hover:text-foreground py-2" onClick={() => setIsOpen(false)}>{t("nav.features")}</a>
          <a href="#roadmap" className="text-muted-foreground hover:text-foreground py-2" onClick={() => setIsOpen(false)}>{t("nav.roadmap")}</a>
          <a href="#cta" className="btn-gold text-center py-2" onClick={() => setIsOpen(false)}>{t("nav.getStarted")}</a>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
