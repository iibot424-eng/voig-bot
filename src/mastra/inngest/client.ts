import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime";

// Use development configuration when NODE_ENV is not "production"
export const inngest = new Inngest({
  id: "telegram-bot",
  name: "Telegram Bot System",
  baseUrl: process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000",
  isDev: process.env.NODE_ENV !== "production",
});
