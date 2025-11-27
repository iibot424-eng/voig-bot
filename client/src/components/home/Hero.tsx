import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import logo from "@assets/generated_images/cyberpunk_iris_eye_logo_for_telegram_bot.png";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden min-h-[90vh] flex items-center">
      {/* Background Elements */}
      <div className="absolute top-1/4 -left-64 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 -right-64 w-96 h-96 bg-secondary/10 rounded-full blur-[128px]" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-ui tracking-widest text-muted-foreground uppercase">Система Онлайн • v2.4.0</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
              БОТ НОВОГО <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-secondary text-glow">ПОКОЛЕНИЯ</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
              Экономика, Ролевые игры, Мини-игры и Браки в одной мощной системе. 
              Прокачайте свое сообщество с самым продвинутым ботом на платформе.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="font-ui text-base h-14 px-8 bg-primary hover:bg-primary/80 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] group">
                ЗАПУСТИТЬ БОТА <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="font-ui text-base h-14 px-8 border-white/20 hover:bg-white/5 text-white">
                ВСЕ КОМАНДЫ
              </Button>
            </div>

            <div className="mt-12 flex items-center gap-8 opacity-70">
              <div>
                <p className="text-2xl font-display font-bold text-white">200+</p>
                <p className="text-xs font-ui uppercase tracking-widest text-muted-foreground">Команд</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-2xl font-display font-bold text-white">24/7</p>
                <p className="text-xs font-ui uppercase tracking-widest text-muted-foreground">Аптайм</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-2xl font-display font-bold text-white">БЕСПЛАТНО</p>
                <p className="text-xs font-ui uppercase tracking-widest text-muted-foreground">Для всех</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative w-[500px] h-[500px] mx-auto">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-full blur-[60px] animate-pulse" />
              <img 
                src={logo} 
                alt="Iris Bot Interface" 
                className="relative z-10 w-full h-full object-contain drop-shadow-[0_0_50px_rgba(168,85,247,0.3)]"
              />
              
              {/* Floating Elements */}
              <motion.div 
                animate={{ y: [0, -20, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute -top-10 -right-10 bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-lg shadow-2xl z-20"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="text-yellow-400 w-5 h-5" />
                  <span className="font-display font-bold text-sm">Ежедневный Бонус</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">+1,500 Звёзд получено</p>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 20, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-10 -left-10 bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-lg shadow-2xl z-20"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="text-secondary w-5 h-5" />
                  <span className="font-display font-bold text-sm">Новый Уровень!</span>
                </div>
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-secondary" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}