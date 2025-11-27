import { motion } from "framer-motion";
import { Coins, Heart, Gamepad2, Shield, Star, Users } from "lucide-react";

const features = [
  {
    icon: Coins,
    title: "Продвинутая Экономика",
    description: "Зарабатывайте звёзды, торгуйте с игроками и поднимайтесь в глобальном рейтинге богачей. Выполняйте ежедневные задания.",
    color: "text-yellow-400"
  },
  {
    icon: Gamepad2,
    title: "Мини-игры",
    description: "Испытайте удачу в слотах, костях, рыбалке и дуэлях. Делайте ставки и выигрывайте у других игроков.",
    color: "text-purple-400"
  },
  {
    icon: Heart,
    title: "Система Отношений",
    description: "Заключайте браки, заводите питомцев и создавайте свою цифровую семью. Особые команды для пар.",
    color: "text-pink-400"
  },
  {
    icon: Users,
    title: "Ролевые Действия (RP)",
    description: "Выражайте эмоции с помощью 50+ интерактивных команд: обнять, поцеловать, ударить и многое другое.",
    color: "text-cyan-400"
  },
  {
    icon: Shield,
    title: "Управление Группами",
    description: "Мощные инструменты модерации для защиты вашего чата. Бан, мут и предупреждения в один клик.",
    color: "text-red-400"
  },
  {
    icon: Star,
    title: "Премиум Статус",
    description: "Разблокируйте эксклюзивные значки, увеличенные ежедневные награды и кастомизацию профиля.",
    color: "text-orange-400"
  }
];

export function FeatureGrid() {
  return (
    <section id="features" className="py-24 bg-black/50 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold mb-4">МОДУЛИ <span className="text-primary">СИСТЕМЫ</span></h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Всё необходимое для вовлечения вашего сообщества в одном пакете.
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