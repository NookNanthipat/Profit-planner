import { Sun, Moon, Globe } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
];

const SettingsMenu = () => {
  const { theme, setTheme } = useTheme();
  const { i18n } = useTranslation();

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("profitplanner-lang", code);
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label="Toggle theme"
      >
        <Sun size={18} className="hidden dark:block" />
        <Moon size={18} className="block dark:hidden" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Change language"
          >
            <Globe size={18} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px] rounded-2xl p-2 shadow-2xl border-border/40">
          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2 py-1.5">Language</DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 opacity-50" />
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLang(lang.code)}
              className={cn("rounded-xl px-2 py-2 font-bold text-xs cursor-pointer", i18n.language === lang.code ? "bg-primary/5 text-primary" : "")}
            >
              <span className="mr-2">{lang.flag}</span>
              {lang.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default SettingsMenu;
