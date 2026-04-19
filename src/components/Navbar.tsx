import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, X, ChevronDown, LayoutDashboard, Sparkles, Building2, LogOut, User as UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import SettingsMenu from "./SettingsMenu";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const productIcons = [LayoutDashboard, Sparkles, Building2];

interface ProductLink {
  title: string;
  desc: string;
  badge: string;
}

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const products = t("nav.products.items", { returnObjects: true }) as ProductLink[];
  const initial = (((user?.user_metadata?.display_name as string) || user?.email || "?")).charAt(0).toUpperCase();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/50"
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        <a href="#" className="font-display text-xl font-bold text-foreground tracking-tight">
          Profit<span className="text-gradient-emerald">Planner</span>
        </a>

        <div className="hidden md:flex items-center gap-7 text-sm font-medium">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors outline-none">
              {t("nav.products.label")} <ChevronDown size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80 p-2">
              {products.map((p, i) => {
                const Icon = productIcons[i] || LayoutDashboard;
                return (
                  <DropdownMenuItem key={i} asChild>
                    <a href="#suite" className="flex items-start gap-3 p-3 rounded-lg cursor-pointer">
                      <span className="mt-0.5 w-9 h-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Icon size={18} />
                      </span>
                      <span className="flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{p.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">{p.badge}</span>
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">{p.desc}</span>
                      </span>
                    </a>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.features")}</a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.pricing")}</a>
          <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.faq")}</a>
          <a href="#roadmap" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.roadmap")}</a>
          <SettingsMenu />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {initial}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2 text-xs text-muted-foreground truncate">{user.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                  <Link to="/portal"><UserIcon size={14} /> My Portal</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => signOut()}>
                  <LogOut size={14} /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login" className="btn-primary text-sm py-2 px-6">Log in</Link>
          )}
        </div>

        <div className="md:hidden flex items-center gap-2">
          <SettingsMenu />
          <button className="text-foreground" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="md:hidden bg-background/90 backdrop-blur-xl border-b border-border/50 px-6 pb-6 flex flex-col gap-4"
        >
          <a href="#suite" className="text-muted-foreground hover:text-foreground py-2" onClick={() => setIsOpen(false)}>{t("nav.products.label")}</a>
          <a href="#features" className="text-muted-foreground hover:text-foreground py-2" onClick={() => setIsOpen(false)}>{t("nav.features")}</a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground py-2" onClick={() => setIsOpen(false)}>{t("nav.pricing")}</a>
          <a href="#faq" className="text-muted-foreground hover:text-foreground py-2" onClick={() => setIsOpen(false)}>{t("nav.faq")}</a>
          <a href="#roadmap" className="text-muted-foreground hover:text-foreground py-2" onClick={() => setIsOpen(false)}>{t("nav.roadmap")}</a>
          {user ? (
            <>
              <Link to="/portal" className="btn-primary text-center py-2" onClick={() => setIsOpen(false)}>My Portal</Link>
              <button onClick={() => { setIsOpen(false); signOut(); }} className="text-muted-foreground py-2">Sign out</button>
            </>
          ) : (
            <Link to="/login" className="btn-primary text-center py-2" onClick={() => setIsOpen(false)}>Log in</Link>
          )}
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
