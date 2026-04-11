import { motion } from "framer-motion";
import { FileSpreadsheet, ArrowUpRight, Star } from "lucide-react";

const products = [
  {
    title: "Personal Finance Tracker",
    description: "Complete monthly income & expense tracker with automated summaries, charts, and savings goals.",
    price: "฿299",
    badge: "Best Seller",
    features: ["Income & expense tracking", "Monthly/yearly summaries", "Savings goal tracker", "Visual charts"],
  },
  {
    title: "Budget Planner Pro",
    description: "Advanced budgeting template with category breakdowns, debt payoff calculator, and investment tracker.",
    price: "฿499",
    badge: "Popular",
    features: ["50/30/20 rule built-in", "Debt snowball calculator", "Investment portfolio view", "Emergency fund tracker"],
  },
  {
    title: "Complete Finance Bundle",
    description: "All templates in one package — personal tracker, budget planner, net worth calculator, and more.",
    price: "฿799",
    badge: "Best Value",
    features: ["All templates included", "Lifetime updates", "Video tutorials", "Priority support"],
  },
];

const ProductsSection = () => {
  return (
    <section id="products" className="section-padding bg-secondary/50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-3">Products</p>
          <h2 className="text-3xl md:text-4xl text-foreground mb-4">
            Google Sheet Templates
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Professionally designed spreadsheets that make managing your money simple and visual.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {products.map((product, i) => (
            <motion.div
              key={product.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl border border-border p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
                  <FileSpreadsheet size={20} className="text-accent" />
                </div>
                <span className="text-xs font-semibold bg-accent/15 text-accent-foreground px-3 py-1 rounded-full">
                  {product.badge}
                </span>
              </div>

              <h3 className="font-display text-xl text-foreground mb-2">{product.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{product.description}</p>

              <ul className="space-y-2 mb-6 flex-1">
                {product.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star size={12} className="text-accent flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                <span className="text-2xl font-bold text-foreground">{product.price}</span>
                <button className="btn-gold py-2 px-5 text-sm inline-flex items-center gap-1">
                  Get Template <ArrowUpRight size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;
