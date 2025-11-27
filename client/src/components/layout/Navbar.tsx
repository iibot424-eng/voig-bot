import { Link, useLocation } from "wouter";
import { Terminal, LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Главная", path: "/" },
    { name: "Функции", path: "/#features" },
    { name: "Команды", path: "/#commands" },
    { name: "Премиум", path: "/#premium" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <a className="flex items-center gap-2 group">
            <div className="relative flex items-center justify-center w-8 h-8 rounded bg-primary/20 group-hover:bg-primary/40 transition-colors">
              <Terminal className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <span className="font-display font-bold text-xl tracking-wider">IRIS<span className="text-primary">BOT</span></span>
          </a>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.path}
              className="text-sm font-ui font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" className="font-ui border-primary/50 text-primary hover:bg-primary/20 hover:text-white hidden md:flex gap-2">
              <LayoutDashboard className="w-4 h-4" />
              ПАНЕЛЬ ВЛАДЕЛЬЦА
            </Button>
          </Link>
          <Button className="font-ui bg-primary hover:bg-primary/80 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            ДОБАВИТЬ В TELEGRAM
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-white/10 bg-black/95"
          >
            <div className="flex flex-col p-6 gap-4">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.path}
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-display font-medium text-white hover:text-primary"
                >
                  {link.name}
                </a>
              ))}
              <div className="h-px bg-white/10 my-2" />
              <Link href="/dashboard">
                <a onClick={() => setIsOpen(false)} className="text-lg font-display font-medium text-primary">
                  Панель Владельца
                </a>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}