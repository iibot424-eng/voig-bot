import { mastra } from "./mastra/index";

const PORT = parseInt(process.env.PORT || "5000", 10);

console.log("🚀 Starting Telegram Bot in production mode...");
console.log(`📍 Server will listen on port ${PORT}`);
console.log(`📊 Database URL: ${process.env.DATABASE_URL ? "✅ Configured" : "❌ NOT SET"}`);
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

// Catch unhandled errors
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
