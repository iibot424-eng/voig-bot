import { motion } from "framer-motion";
import { Coins, Heart, Gamepad2, Shield, Star, Users } from "lucide-react";

const features = [
  {
    icon: Coins,
    title: "Advanced Economy",
    description: "Earn stars, trade with players, and climb the global wealth leaderboard. Complete daily tasks for rewards.",
    color: "text-yellow-400"
  },
  {
    icon: Gamepad2,
    title: "Minigames",
    description: "Test your luck with slots, dice, fishing, and duels. Bet your stars and win big against other players.",
    color: "text-purple-400"
  },
  {
    icon: Heart,
    title: "Relationship System",
    description: "Marry other users, adopt pets, and build your digital family. Special commands for couples.",
    color: "text-pink-400"
  },
  {
    icon: Users,
    title: "Roleplay Actions",
    description: "Express yourself with over 50+ interactive RP commands like hug, kiss, hit, and more.",
    color: "text-cyan-400"
  },
  {
    icon: Shield,
    title: "Group Management",
    description: "Powerful moderation tools to keep your chat safe. Ban, mute, and warn users with ease.",
    color: "text-red-400"
  },
  {
    icon: Star,
    title: "Premium Status",
    description: "Unlock exclusive badges, increased daily rewards, and custom profile customization.",
    color: "text-orange-400"
  }
];

export function FeatureGrid() {
  return (
    <section id="features" className="py-24 bg-black/50 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold mb-4">SYSTEM <span className="text-primary">MODULES</span></h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to engage your community in one single package.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-xl bg-white/5 border border-white/5 hover:border-primary/50 hover:bg-white/10 transition-all group cursor-default"
            >
              <div className={`w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${feature.color}`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}