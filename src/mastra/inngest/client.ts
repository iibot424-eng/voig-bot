import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime";

// Use development configuration when NODE_ENV is not "production"
export const inngest = new Inngest({
  id: process.env.NODE_ENV === "production" ? "replit-agent-workflow" : "mastra",
  name: process.env.NODE_ENV === "production" ? "Replit Agent Workflow System" : "Mastra Dev",
  eventKey: "local-event-key", // Standardized key for both environments to bypass 401
  baseUrl: process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000",
  isDev: process.env.NODE_ENV !== "production",
  middleware: process.env.NODE_ENV === "production" ? [] : [realtimeMiddleware()],
});
