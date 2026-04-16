import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border/50 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <span className="font-display font-bold text-foreground text-lg">
          Profit<span className="text-gradient-emerald">Planner</span>
        </span>
        <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-foreground transition-colors">{t("footer.privacy")}</a>
          <a href="#" className="hover:text-foreground transition-colors">{t("footer.terms")}</a>
          <a href="#" className="hover:text-foreground transition-colors">{t("footer.contact")}</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
