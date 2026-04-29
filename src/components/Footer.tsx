import { Link } from "react-router-dom";
import { Twitter, Github, Linkedin, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "./admin/EditableText";

const Footer = () => {
  const { t } = useTranslation();
  const { ds } = useSiteContent("footer");
  const rawColumns = t("footer.columns", { returnObjects: true });
  const columns = Array.isArray(rawColumns) ? rawColumns : [];

  return (
    <footer className="bg-background border-t border-border/40 section-padding py-20 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
          <div className="col-span-2">
            <Link to="/" className="font-display text-2xl font-bold mb-6 inline-block">
              Profit<span className="text-gradient-emerald">Planner</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-xs">
               <EditableText section="footer" fieldKey="tagline" defaultValue={ds("tagline", "footer.tagline")} multiline />
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-300">
                <Twitter size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-300">
                <Github size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-300">
                <Linkedin size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-300">
                <Mail size={18} />
              </a>
            </div>
          </div>

          {Array.isArray(columns) && columns.map((column, i) => (
            <div key={i}>
              <h4 className="font-bold text-sm uppercase tracking-widest mb-6 text-foreground">
                 <EditableText section="footer" fieldKey={`col_title_${i}`} defaultValue={ds(`col_title_${i}`, `footer.columns.${i}.title`)} />
              </h4>
              <ul className="space-y-4">
                {Array.isArray(column.links) && column.links.map((link: string, li: number) => (
                  <li key={li}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300">
                       <EditableText section="footer" fieldKey={`col_${i}_link_${li}`} defaultValue={ds(`col_${i}_link_${li}`, `footer.columns.${i}.links.${li}`)} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-muted-foreground font-medium">
          <p>
             <EditableText section="footer" fieldKey="rights" defaultValue={ds("rights", "footer.rights").replace("{{year}}", new Date().getFullYear().toString())} />
          </p>
          <div className="flex gap-8">
            <Link to="/privacy" className="hover:text-primary transition-colors tracking-tight">
               <EditableText section="footer" fieldKey="privacy" defaultValue={ds("privacy", "footer.privacy")} />
            </Link>
            <Link to="/tos" className="hover:text-primary transition-colors tracking-tight">
               <EditableText section="footer" fieldKey="terms" defaultValue={ds("terms", "footer.terms")} />
            </Link>
            <a href="mailto:support@profitplanner.app" className="hover:text-primary transition-colors tracking-tight">
               <EditableText section="footer" fieldKey="contact" defaultValue={ds("contact", "footer.contact")} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
