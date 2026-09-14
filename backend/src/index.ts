import 'dotenv/config';
import { createApp } from './app';
import { connectDB } from './db';

const PORT = parseInt(process.env.PORT ?? '4000', 10);
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/mini-design-canvas';
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

async function main(): Promise<void> {
  await connectDB(MONGODB_URI);
  const app = createApp(CORS_ORIGINS);
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
