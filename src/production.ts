import { mastra } from "./mastra/index";

const PORT = parseInt(process.env.PORT || "5000", 10);

console.log("🚀 Starting Telegram Bot in production mode...");
console.log(`📍 Server will listen on port ${PORT}`);
console.log("✅ Bot server is running and ready to receive messages");

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("📛 SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("📛 SIGINT received, shutting down gracefully...");
  process.exit(0);
});
