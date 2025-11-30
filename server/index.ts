import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startBot } from "./bot";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Health check endpoint для keep-alive
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Запускаем Telegram бота
  startBot();
  
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);

      // Keep-alive для Render: пингуем себя каждые 10 минут
      if (process.env.NODE_ENV === "production") {
        setInterval(async () => {
          try {
            const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
            const response = await fetch(`${host}/health`);
            if (response.ok) {
              log("✅ Keep-alive ping успешен");
            }
          } catch (err) {
            log(`⚠️ Keep-alive ping ошибка: ${err}`);
          }
        }, 10 * 60 * 1000); // 10 минут
      }
    },
  );

  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n📍 Получен сигнал: ${signal}`);
    console.log('🛑 Завершение приложения...');
    
    // Закрываем HTTP сервер
    httpServer.close(() => {
      console.log('✅ HTTP сервер закрыт');
      process.exit(0);
    });
    
    // Timeout на случай если что-то зависнет
    setTimeout(() => {
      console.error('❌ Принудительное завершение после 10 сек');
      process.exit(1);
    }, 10000);
  };

  // Обработка всех сигналов завершения
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
  
  // Обработка необработанных исключений
  process.on('uncaughtException', (err) => {
    console.error('❌ Необработанное исключение:', err);
    gracefulShutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason) => {
    console.error('❌ Необработанное отклонение:', reason);
    gracefulShutdown('unhandledRejection');
  });
})();
