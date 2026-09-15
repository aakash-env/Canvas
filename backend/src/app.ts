import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import canvasRoutes from './routes/canvas.routes';
import authRoutes from './routes/auth.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { isDBConnected } from './db';

export function createApp(corsOrigins: string[]): express.Application {
  const app = express();

  // Trust proxy for rate limiting behind reverse proxies (Vercel, AWS, Nginx)
  app.set('trust proxy', 1);

  // Security headers with Konva canvas compatibility
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Gzip / Deflate response compression
  app.use(compression());

  // Structured HTTP logging (skipped in test runner)
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (
          corsOrigins.includes('*') ||
          corsOrigins.includes(origin) ||
          // Allow Vercel preview deployment URLs if origins includes a vercel.app domain
          corsOrigins.some((o) => o.includes('vercel.app') && origin.endsWith('.vercel.app'))
        ) {
          return callback(null, true);
        }
        return callback(new Error(`CORS origin not allowed: ${origin}`));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400, // 24 hours
    })
  );

  // Rate limiters
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message: 'Too many requests, please try again later.', statusCode: 429 } },
    skip: () => process.env.NODE_ENV === 'test',
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30, // 30 login/register attempts per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: { message: 'Too many authentication attempts, please try again later.', statusCode: 429 },
    },
    skip: () => process.env.NODE_ENV === 'test',
  });

  app.use('/api/', generalLimiter);
  app.use('/api/auth/', authLimiter);

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Live health probe
  app.get('/health', (_req, res) => {
    const dbReady = isDBConnected();
    const status = dbReady ? 200 : 503;
    res.status(status).json({
      status: dbReady ? 'ok' : 'unhealthy',
      database: dbReady ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/canvases', canvasRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
