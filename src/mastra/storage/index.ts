import { PostgresStore } from "@mastra/pg";

// Create a single shared PostgreSQL storage instance
// Database errors during init are handled gracefully to allow server startup
let storageError: Error | null = null;

export const sharedPostgresStorage = new PostgresStore({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost:5432/mastra",
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
