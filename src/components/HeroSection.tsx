import { motion } from "framer-motion";
import { ArrowRight, Play, Users, Star, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

const HeroSection = () => {
  const { t } = useTranslation();

  const chartData = [35, 42, 58, 45, 65, 52, 78, 62, 85, 72, 90, 95];
  const rows = [
    { label: t("hero.income"), value: "$4,850", change: "+12%", positive: true },
    { label: t("hero.expenses"), value: "$2,340", change: "-5%", positive: true },
    { label: t("hero.savings"), value: "$1,510", change: "+24%", positive: true },
    { label: t("hero.investments"), value: "$820", change: "+8%", positive: true },
  ];

  return (
    <section className="relative min-h-screen flex items-center section-padding pt-32 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-20 left-10 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />

      <div className="max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 glass-card px-4 py-1.5 text-sm font-medium text-muted-foreground mb-6">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {t("hero.badge")}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] text-foreground mb-6">
              {t("hero.title1")}{" "}
              <span className="text-gradient-emerald">{t("hero.title2")}</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              {t("hero.description")}
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <a href="#cta" className="btn-primary inline-flex items-center gap-2">
                {t("hero.startFree")} <ArrowRight size={18} />
              </a>
              <button className="btn-outline inline-flex items-center gap-2">
                <Play size={16} /> {t("hero.watchDemo")}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-primary" />
                <span>{t("hero.users")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-primary" />
                <span>{t("hero.rating")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-primary" />
                <span>{t("hero.uptime")}</span>
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
              {/* Main dashboard card */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                    <div className="w-3 h-3 rounded-full bg-primary/60" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">ProfitPlanner Dashboard</span>
                </div>

                {/* Mini chart */}
                <div className="h-24 bg-secondary/50 rounded-xl flex items-end gap-1 p-3 mb-5">
                  {chartData.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.6, delay: 0.4 + i * 0.05 }}
                      className="flex-1 bg-primary/80 rounded-sm"
                    />
                  ))}
                </div>

                {/* Data rows */}
                <div className="space-y-3">
                  {rows.map((row) => (
                    <div key={row.label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-foreground">{row.value}</span>
                        <span className="text-xs font-medium text-primary">{row.change}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="absolute -bottom-4 -left-4 glass-card px-4 py-3 border-primary/30"
              >
                <p className="text-xs font-medium text-muted-foreground">{t("hero.netWorth")}</p>
                <p className="text-lg font-bold text-primary">+23.5%</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="absolute -top-3 -right-3 glass-card px-4 py-3 border-primary/30"
              >
                <p className="text-xs font-medium text-muted-foreground">{t("hero.monthlyGrowth")}</p>
                <p className="text-lg font-bold text-primary">$1,510</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
