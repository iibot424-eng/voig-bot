import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/home/Hero";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { CommandPreview } from "@/components/home/CommandPreview";
import { Button } from "@/components/ui/button";
import { Crown, Check } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <FeatureGrid />
        <CommandPreview />
        
        {/* Premium Section */}
        <section id="premium" className="py-24 bg-gradient-to-b from-black/50 to-primary/5">
          <div className="container mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 mb-6">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-widest">Premium Access</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">UNLOCK <span className="text-yellow-500 text-glow">GOLD</span> STATUS</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-16">
              Support the development of IRIS and get exclusive perks that make your profile stand out.
            </p>

            <div className="max-w-md mx-auto bg-white/5 border border-yellow-500/30 rounded-2xl p-8 relative overflow-hidden group hover:border-yellow-500/50 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Crown className="w-32 h-32 text-yellow-500 rotate-12" />
              </div>

              <div className="text-left space-y-6 relative z-10">
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-widest">Monthly Subscription</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-display font-bold text-white">$4.99</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                </div>

                <ul className="space-y-4">
                  {[
                    "Double Daily Rewards (2x)",
                    "Exclusive Gold Profile Badge",
                    "Custom Animal Transformations",
                    "Priority Support Access",
                    "No Cooldown on Minigames",
                    "Custom Profile Background"
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-yellow-500" />
                      </div>
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>

                <Button className="w-full h-12 bg-yellow-500 hover:bg-yellow-400 text-black font-bold font-ui uppercase tracking-widest">
                  Get Premium
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-white/10 bg-black">
          <div className="container mx-auto px-6 text-center">
            <h3 className="font-display font-bold text-2xl mb-4">IRIS<span className="text-primary">BOT</span></h3>
            <p className="text-muted-foreground text-sm mb-8">
              The next generation entertainment bot for Telegram communities.
            </p>
            <div className="text-xs text-white/20 font-mono">
              © 2025 IRIS Project. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}