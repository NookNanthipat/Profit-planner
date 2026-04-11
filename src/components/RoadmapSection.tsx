import { motion } from "framer-motion";
import { CheckCircle2, Clock, Rocket } from "lucide-react";

const items = [
  { icon: CheckCircle2, status: "Live", title: "Personal Finance Google Sheet Templates", desc: "Track income, expenses, savings, and investments with beautiful spreadsheets.", color: "text-green-500" },
  { icon: Clock, status: "Coming Soon", title: "Personal Finance Web App", desc: "A full web application for managing your personal finances with automation and insights.", color: "text-accent" },
  { icon: Rocket, status: "Planned", title: "SME Business Planner & ERP", desc: "Financial planning, invoicing, inventory, and reporting tools built for small and medium businesses.", color: "text-muted-foreground" },
];

const RoadmapSection = () => {
  return (
    <section id="roadmap" className="section-padding bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-gold-light uppercase tracking-widest mb-3">Roadmap</p>
          <h2 className="text-3xl md:text-4xl mb-4">What's Coming Next</h2>
          <p className="text-primary-foreground/60 max-w-lg mx-auto">
            We're building a complete ecosystem of financial tools — from personal to business.
          </p>
        </motion.div>

        <div className="space-y-6">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="flex gap-5 items-start bg-primary-foreground/5 rounded-xl p-6 border border-primary-foreground/10"
            >
              <item.icon size={24} className={`${item.color} flex-shrink-0 mt-0.5`} />
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-display text-lg">{item.title}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${item.color} border-current/20`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-sm text-primary-foreground/60 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoadmapSection;
