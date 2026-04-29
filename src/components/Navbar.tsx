import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, X, ChevronDown, LayoutDashboard, Sparkles, Building2, LogOut, User as UserIcon, Globe, CreditCard, HelpCircle, Map } from "lucide-react";
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
import logo from "@/assets/profitplanner-logo.png";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const productIcons = [LayoutDashboard, Sparkles, Building2];

interface ProductLink {
  title: string;
  desc: string;
  badge: string;
}

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const rawProducts = t("nav.products.items", { returnObjects: true });
  const products = Array.isArray(rawProducts) ? (rawProducts as ProductLink[]) : [];
  const initial = (((user?.user_metadata?.display_name as string) || user?.email || "?")).charAt(0).toUpperCase();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/50"
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/5 flex items-center justify-center overflow-hidden shrink-0 group-hover:rotate-3 transition-transform">
             <img src={logo} alt="Logo" className="w-full h-full object-contain scale-110" />
          </div>
          <span className="font-display text-xl font-bold text-foreground tracking-tight">
            Profit<span className="text-gradient-emerald">Planner</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7 text-sm font-medium">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors outline-none text-left">
              {t("nav.products.label")} <ChevronDown size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80 p-2">
              {products.length > 0 ? products.map((p, i) => {
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
              }) : <DropdownMenuItem disabled>No products found</DropdownMenuItem>}
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
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="text-foreground p-2 rounded-lg hover:bg-muted/50 transition-colors" aria-label="Toggle menu">
                <Menu size={24} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0 flex flex-col">
              <SheetHeader className="p-6 border-b border-border/50 text-left">
                <SheetTitle className="font-display font-bold text-xl flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center overflow-hidden">
                    <img src={logo} alt="Logo" className="w-6 h-6 object-contain" />
                  </div>
                  ProfitPlanner
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
                <div className="space-y-1">
                  <p className="px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 mb-2">Navigation</p>
                  <a href="#suite" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold hover:bg-muted/50 transition-colors">
                    <Sparkles size={18} className="text-primary" /> {t("nav.products.label")}
                  </a>
                  <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold hover:bg-muted/50 transition-colors">
                    <Globe size={18} className="text-primary" /> {t("nav.features")}
                  </a>
                  <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold hover:bg-muted/50 transition-colors">
                    <CreditCard size={18} className="text-primary" /> {t("nav.pricing")}
                  </a>
                  <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold hover:bg-muted/50 transition-colors">
                    <HelpCircle size={18} className="text-primary" /> {t("nav.faq")}
                  </a>
                  <a href="#roadmap" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold hover:bg-muted/50 transition-colors">
                    <Map size={18} className="text-primary" /> {t("nav.roadmap")}
                  </a>
                </div>

                <div className="pt-6 border-t border-border/50">
                  {user ? (
                    <div className="space-y-3">
                      <div className="px-3 py-2 bg-primary/5 rounded-2xl flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{user.email}</p>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Active Member</p>
                        </div>
                      </div>
                      <Link to="/portal" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                        <UserIcon size={18} /> Go to Portal
                      </Link>
                      <button 
                        onClick={() => { setIsMobileMenuOpen(false); signOut(); }} 
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut size={18} /> Sign out
                      </button>
                    </div>
                  ) : (
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                      Get Started Now
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
