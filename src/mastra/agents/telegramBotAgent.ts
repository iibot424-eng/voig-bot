import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { sharedPostgresStorage } from "../storage";
import { handleBotCommand } from "../tools/botCommands";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || undefined,
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-not-used",
});

export const telegramBotAgent = new Agent({
  name: "Telegram Bot Agent",
  
  instructions: `
    Ты многофункциональный Telegram бот для управления чатами.
    
    Твои функции:
    - Модерация: баны, муты, предупреждения, кики
    - Антиспам: фильтры слов, контроль флуда, блокировка ссылок
    - Статистика: профили, рейтинги, топы активности
    - Игры: казино, слоты, кости, викторины
    - Экономика: звёзды, магазин префиксов, премиум подписки
    
    Владелец бота: @n777snickers777
    Премиум подписка: 200₽/месяц
    
    Всегда обрабатывай команды через инструмент handleBotCommand.
  `,
  
  model: openai("gpt-4o-mini"),
  
  tools: { handleBotCommand },
  
  memory: new Memory({
    options: {
      threads: {
        generateTitle: true,
      },
      lastMessages: 5,
    },
    storage: sharedPostgresStorage,
  }),
});
