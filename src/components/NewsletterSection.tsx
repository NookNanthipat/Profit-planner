import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "./admin/EditableText";

const NewsletterSection = () => {
  const { t } = useTranslation();
  const { ds } = useSiteContent("newsletter");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubscribed(true);
  };

  return (
    <section className="section-padding py-24 bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
             <EditableText section="newsletter" fieldKey="title" defaultValue={ds("title", "newsletter.title")} />
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
             <EditableText section="newsletter" fieldKey="description" defaultValue={ds("description", "newsletter.description")} multiline />
          </p>

          <div className="pt-6">
            {subscribed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-3 bg-emerald-500/20 text-emerald-400 px-8 py-4 rounded-2xl border border-emerald-500/30"
              >
                <CheckCircle2 size={24} />
                <span className="font-bold">
                   <EditableText section="newsletter" fieldKey="success" defaultValue={ds("success", "newsletter.success")} />
                </span>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                <input
                  type="email"
                  required
                  placeholder={ds("placeholder", "newsletter.placeholder")}
                  className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn-primary py-4 px-8 flex items-center justify-center gap-2 group"
                >
                  <EditableText section="newsletter" fieldKey="subscribe" defaultValue={ds("subscribe", "newsletter.subscribe")} />
                  <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </form>
            )}
          </div>
          <p className="text-xs text-slate-500 pt-4">
             <EditableText section="newsletter" fieldKey="privacy" defaultValue={ds("privacy", "newsletter.privacy")} />
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default NewsletterSection;
