import { motion } from "framer-motion";
import { BarChart3, Lock, Smartphone, RefreshCw, Palette, HeadphonesIcon } from "lucide-react";

const features = [
  { icon: BarChart3, title: "Visual Dashboards", desc: "Beautiful charts and graphs that update automatically as you enter your data." },
  { icon: Lock, title: "Private & Secure", desc: "Your data stays in your own Google Drive — no third-party access." },
  { icon: Smartphone, title: "Works Everywhere", desc: "Use on desktop, tablet, or phone with Google Sheets' native apps." },
  { icon: RefreshCw, title: "Auto Calculations", desc: "Built-in formulas handle all the math — just enter your numbers." },
  { icon: Palette, title: "Clean Design", desc: "Professionally designed layouts that are easy to read and pleasant to use." },
  { icon: HeadphonesIcon, title: "Support Included", desc: "Get help setting up your templates with our guides and direct support." },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="section-padding">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-3">Why Choose Us</p>
          <h2 className="text-3xl md:text-4xl text-foreground mb-4">
            Built for Real Life
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Simple tools that actually get used — designed with care and tested by real people.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <f.icon size={22} className="text-accent" />
              </div>
              <h3 className="font-display text-lg text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
