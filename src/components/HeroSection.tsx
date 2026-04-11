import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Shield, Zap } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center section-padding pt-32 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 bg-secondary rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground mb-6">
              <Zap size={14} className="text-accent" />
              Smart Financial Tools
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl leading-tight text-foreground mb-6">
              Take Control of{" "}
              <span className="text-gradient-gold">Your Finances</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg font-light">
              Beautiful, ready-to-use financial templates and tools designed to help you track, plan, and grow your money — from personal budgets to business planning.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <a href="#products" className="btn-gold inline-flex items-center gap-2">
                Browse Templates <ArrowRight size={18} />
              </a>
              <a href="#features" className="btn-outline-primary">
                Learn More
              </a>
            </div>

            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-accent" />
                <span>500+ users</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-accent" />
                <span>Trusted tools</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative hidden lg:block"
          >
            <div className="relative animate-float">
              {/* Mock spreadsheet card */}
              <div className="bg-card rounded-2xl shadow-2xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-accent/60" />
                  <div className="w-3 h-3 rounded-full bg-green-400/60" />
                  <span className="ml-2 text-xs text-muted-foreground font-medium">Personal Finance Tracker.gsheet</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Monthly Income", value: "฿45,000", color: "text-green-600" },
                    { label: "Expenses", value: "฿28,500", color: "text-destructive" },
                    { label: "Savings", value: "฿16,500", color: "text-accent" },
                    { label: "Investments", value: "฿8,200", color: "text-blue-500" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-20 bg-secondary rounded-lg flex items-end gap-1 p-3">
                  {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 gold-gradient rounded-sm opacity-80"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-primary text-primary-foreground rounded-xl px-4 py-3 shadow-lg">
                <p className="text-xs font-medium opacity-70">Net Worth</p>
                <p className="text-lg font-bold">+23.5%</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
