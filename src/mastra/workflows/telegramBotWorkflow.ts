import { createStep, createWorkflow } from "../inngest";
import { z } from "zod";
import { handleBotCommand } from "../tools/botCommands";

const processMessage = createStep({
  id: "process-telegram-message",
  description: "Обрабатывает входящие сообщения и команды Telegram бота",
  
  inputSchema: z.object({
    triggerInfo: z.any().describe("Информация о триггере от Telegram"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    
    logger?.info("🤖 [TelegramBot] Processing message", {
      type: inputData.triggerInfo?.type,
      chatId: inputData.triggerInfo?.params?.chatId,
      userId: inputData.triggerInfo?.params?.userId,
      command: inputData.triggerInfo?.params?.command,
    });
    
    try {
      const result = await handleBotCommand.execute({
        context: { triggerInfo: inputData.triggerInfo },
        mastra,
        runtimeContext: {} as any,
      });
      
      logger?.info("✅ [TelegramBot] Message processed", { 
        success: result.success,
        message: result.message 
      });
      
      return {
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      logger?.error("❌ [TelegramBot] Error processing message", { error });
      return {
        success: false,
        message: String(error),
      };
    }
  },
});

export const telegramBotWorkflow = createWorkflow({
  id: "telegram-bot-workflow",
  
  inputSchema: z.object({
    triggerInfo: z.any().describe("Информация о триггере от Telegram"),
  }) as any,
  
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
})
  .then(processMessage as any)
  .commit();
