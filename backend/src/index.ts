import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { connectDB, disconnectDB } from './db';
import { config } from './config/env';

const app = createApp(config.corsOriginsList);
let server: http.Server | null = null;

// Ensure database connection is initialized
connectDB(config.MONGODB_URI).catch((err) => {
  console.error('[Fatal] Initial database connection failed:', err);
});

// Standalone execution (Local dev, Docker, or traditional Node servers)
if (!process.env.VERCEL) {
  server = app.listen(config.PORT, () => {
    console.log(`[Server] Running on http://localhost:${config.PORT} (${config.NODE_ENV})`);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`[Server] Received ${signal}, starting graceful shutdown...`);
    if (server) {
      server.close(async () => {
        console.log('[Server] HTTP server closed');
        try {
          await disconnectDB();
          process.exit(0);
        } catch (err) {
          console.error('[Server] Error during database disconnect:', err);
          process.exit(1);
        }
      });

      // Force shutdown after 10s if hanging
      setTimeout(() => {
        console.error('[Server] Forcing shutdown after timeout');
        process.exit(1);
      }, 10000).unref();
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

// Default export for Vercel Serverless Functions
export default app;
