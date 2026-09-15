import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX: z.coerce.number().default(300), // 300 requests per 15 min for general API
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(25), // 25 attempts per 15 min for auth
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[Config] Invalid environment variables:');
  parsed.error.errors.forEach((e) => {
    console.error(`  - ${e.path.join('.')}: ${e.message}`);
  });
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Invalid environment configuration in production');
  }
}

export const config = parsed.success
  ? {
      ...parsed.data,
      corsOriginsList: parsed.data.CORS_ORIGINS.split(',').map((o) => o.trim()),
    }
  : {
      NODE_ENV: 'development' as const,
      PORT: 4000,
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/mini-design-canvas',
      JWT_SECRET: process.env.JWT_SECRET || 'fallback-dev-secret-key-do-not-use-in-production',
      JWT_EXPIRES_IN: '7d',
      CORS_ORIGINS: 'http://localhost:3000',
      RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
      RATE_LIMIT_MAX: 300,
      AUTH_RATE_LIMIT_MAX: 25,
      corsOriginsList: ['http://localhost:3000'],
    };
