import dns from 'dns';
import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(uri: string): Promise<typeof mongoose> {
  // If connection is already open and ready, reuse it immediately (essential for Vercel Serverless)
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If using SRV connection string, configure reliable public DNS servers
  // to avoid Node.js querySrv ECONNREFUSED on Windows or cloud environments
  if (uri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (e) {
      console.warn('[DB] Could not set custom DNS servers:', e);
    }
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log('[DB] Connected to MongoDB');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error('[DB] Connection failed:', err);
    throw err;
  }

  return cached.conn;
}

export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('[DB] Disconnected from MongoDB');
  }
}
