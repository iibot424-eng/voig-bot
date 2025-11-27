import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import logo from "@assets/generated_images/cyberpunk_iris_eye_logo_for_telegram_bot.png";

const commands = [
  {
    cmd: "/profile",
    response: {
      title: "👤 Профиль Пользователя",
      content: [
        "Имя: CyberUser_99",
        "🆔 ID: 123456789",
        "💰 Баланс: 5,420 ⭐",
        "🏆 Репутация: 150",
        "💍 В браке с: Никто",
        "✨ Статус: Онлайн"
      ]
    }
  },
  {
    cmd: "/daily",
    response: {
      title: "🎁 Ежедневная Награда",
      content: [
        "Вы забрали свой ежедневный бонус!",
        "Получено: +500 Звёзд ⭐",
        "Серия: 5 дней 🔥",
        "Возвращайтесь через 24ч за добавкой!"
      ]
    }
  },
  {
    cmd: "/transform cat",
    response: {
      title: "🐱 Превращение",
      content: [
        "Вы превратились в Кота!",
        "Длительность: 4 часа",
        "Эффект: Мяукаете вместо разговора.",
        "Стоимость: 100 Звёзд"
      ]
    }
  }
];

export function CommandPreview() {
  const [activeCmd, setActiveCmd] = useState(0);

  return (
    <section id="commands" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-display font-bold mb-6">ИНТЕРАКТИВНЫЕ <span className="text-secondary">КОМАНДЫ</span></h2>
            <p className="text-muted-foreground mb-8">
              Оцените богатый набор команд, созданных для развлечения и пользы. 
              От управления экономикой до ролевых игр с друзьями.
            </p>

            <div className="space-y-3">
              {commands.map((cmd, i) => (
                <button
                  key={cmd.cmd}
                  onClick={() => setActiveCmd(i)}
                  className={`w-full text-left px-6 py-4 rounded-lg font-mono text-sm transition-all border ${
                    activeCmd === i 
                    ? "bg-primary/20 border-primary text-white" 
                    : "bg-white/5 border-transparent text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  {cmd.cmd}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-10 blur-3xl rounded-full" />
            
            <div className="relative bg-[#1a1a2e] rounded-2xl overflow-hidden border border-white/10 shadow-2xl max-w-md mx-auto">
              {/* Mock Telegram Header */}
              <div className="bg-[#242f3d] px-4 py-3 flex items-center gap-4 border-b border-white/5">
                <div className="w-10 h-10 rounded-full bg-primary/20 p-1">
                  <img src={logo} className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">IRIS Bot</h4>
                  <p className="text-xs text-blue-400">bot</p>
                </div>
              </div>

              {/* Chat Area */}
              <div className="p-6 h-[400px] flex flex-col justify-end bg-[url('https://web.telegram.org/img/bg_0.png')] bg-cover">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCmd}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* User Message */}
                    <div className="flex justify-end">
                      <div className="bg-[#2b5278] text-white px-4 py-2 rounded-l-2xl rounded-tr-2xl max-w-[80%]">
                        <p className="text-sm">{commands[activeCmd].cmd}</p>
                      </div>
                    </div>

                    {/* Bot Response */}
                    <div className="flex justify-start">
                      <div className="bg-[#182533] text-white p-4 rounded-r-2xl rounded-tl-2xl max-w-[90%] shadow-lg border border-white/5">
                        <h5 className="text-primary font-bold text-sm mb-2">{commands[activeCmd].response.title}</h5>
                        <div className="space-y-1">
                          {commands[activeCmd].response.content.map((line, idx) => (
                            <p key={idx} className="text-sm text-gray-300">{line}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Input Area */}
              <div className="bg-[#17212b] px-4 py-3 flex items-center gap-3 border-t border-white/5">
                <div className="w-8 h-8 rounded-full bg-white/5" />
                <div className="h-8 flex-1 bg-black/20 rounded-full" />
                <div className="w-8 h-8 rounded-full bg-primary/50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}