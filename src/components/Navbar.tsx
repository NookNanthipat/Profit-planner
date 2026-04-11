import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border"
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        <a href="#" className="font-display text-xl text-foreground tracking-tight">
          Finn<span className="text-gradient-gold">Flow</span>
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#products" className="text-muted-foreground hover:text-foreground transition-colors">Products</a>
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#roadmap" className="text-muted-foreground hover:text-foreground transition-colors">Roadmap</a>
          <a href="#cta" className="btn-gold text-sm py-2 px-6">Get Started</a>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="md:hidden bg-background border-b border-border px-6 pb-6 flex flex-col gap-4"
        >
          <a href="#products" className="text-muted-foreground hover:text-foreground py-2" onClick={() => setIsOpen(false)}>Products</a>
          <a href="#features" className="text-muted-foreground hover:text-foreground py-2" onClick={() => setIsOpen(false)}>Features</a>
          <a href="#roadmap" className="text-muted-foreground hover:text-foreground py-2" onClick={() => setIsOpen(false)}>Roadmap</a>
          <a href="#cta" className="btn-gold text-center py-2" onClick={() => setIsOpen(false)}>Get Started</a>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
