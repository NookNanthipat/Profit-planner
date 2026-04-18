import { useTranslation } from "react-i18next";
import { Twitter, Linkedin, Github, Facebook } from "lucide-react";

interface FooterColumn {
  title: string;
  links: string[];
}

const Footer = () => {
  const { t } = useTranslation();
  const columns = t("footer.columns", { returnObjects: true }) as FooterColumn[];

  return (
    <footer className="border-t border-border/50 pt-16 pb-8 px-6 bg-secondary/20">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          <div className="col-span-2">
            <span className="font-display font-bold text-foreground text-xl">
              Profit<span className="text-gradient-emerald">Planner</span>
            </span>
            <p className="text-sm text-muted-foreground mt-3 max-w-xs">
              {t("footer.tagline")}
            </p>
            <div className="flex gap-3 mt-5">
              {[Twitter, Linkedin, Facebook, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg border border-border bg-background/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                  aria-label="Social link"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col, i) => (
            <div key={i}>
              <h4 className="font-semibold text-foreground mb-4 text-sm">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">{t("footer.privacy")}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t("footer.terms")}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t("footer.contact")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
