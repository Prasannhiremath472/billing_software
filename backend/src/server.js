import { config } from './config/env.js';
import { pool } from './config/db.js';
import { migrate } from './db/migrate.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';

await migrate({ log: msg => logger.info(msg) });

const app = createApp();
const server = app.listen(config.port, () => {
  logger.info('API listening', { port: config.port, env: config.nodeEnv });
});

let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  logger.info('Shutting down', { signal });
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref(); // hard stop if connections hang
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', err => logger.error('Unhandled rejection', { error: String(err) }));
