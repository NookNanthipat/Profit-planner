import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { useState } from "react";

const CTASection = () => {
  const [email, setEmail] = useState("");

  return (
    <section id="cta" className="section-padding">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl text-foreground mb-4">
            Ready to Master Your Money?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join our newsletter for early access to new products, financial tips, and exclusive discounts.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); setEmail(""); }}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <button type="submit" className="btn-gold inline-flex items-center justify-center gap-2 py-3">
              Subscribe <Send size={16} />
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
