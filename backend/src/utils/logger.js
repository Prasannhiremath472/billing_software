import { config } from '../config/env.js';

// Minimal structured (JSON-lines) logger. Never pass passwords/tokens in `meta`.
function write(level, message, meta) {
  if (config.nodeEnv === 'test') return;
  const line = { time: new Date().toISOString(), level, message, ...meta };
  const out = level === 'error' ? console.error : console.log;
  out(JSON.stringify(line));
}

export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
