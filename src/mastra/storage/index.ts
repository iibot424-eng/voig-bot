import { PostgresStore } from "@mastra/pg";

// Create a single shared PostgreSQL storage instance
// Database errors during init are handled gracefully to allow server startup
let storageError: Error | null = null;

export const sharedPostgresStorage = new PostgresStore({
  connectionString:
    "postgresql://neondb_owner:npg_hCTrcD3kIOa5@ep-delicate-art-aiciia6n-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
  id: "main-bot-storage",
  config: {
    ssl: {
      rejectUnauthorized: false
    }
  }
});

// Capture any initialization errors but don't throw
sharedPostgresStorage.init?.().catch((error) => {
  console.warn("⚠️ Database initialization warning:", error?.message);
  storageError = error;
});

export function getStorageError() {
  return storageError;
}
