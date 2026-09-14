import dns from 'dns';
import mongoose from 'mongoose';

export async function connectDB(uri: string): Promise<void> {
  // If using SRV connection string, configure reliable public DNS servers
  // to avoid Node.js querySrv ECONNREFUSED on Windows systems
  if (uri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (e) {
      console.warn('[DB] Could not set custom DNS servers:', e);
    }
  }

  try {
    await mongoose.connect(uri);
    console.log('[DB] Connected to MongoDB');
  } catch (err) {
    console.error('[DB] Connection failed:', err);
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log('[DB] Disconnected from MongoDB');
}
