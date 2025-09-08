import * as path from 'path';
import * as os from 'os';

export const config = {
  dbPath: process.env.SKB_DB_PATH || path.join(os.homedir(), '.skb', 'database.db'),
  imagesPath: process.env.SKB_IMAGES_PATH || path.join(os.homedir(), '.skb', 'images'),
  port: parseInt(process.env.SKB_PORT || '5656'),
  logLevel: (process.env.SKB_LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  enableEncryption: process.env.SKB_ENCRYPTION === 'true',
  encryptionKey: process.env.SKB_ENCRYPTION_KEY,
};