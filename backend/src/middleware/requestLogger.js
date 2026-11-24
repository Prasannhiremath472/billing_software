import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  req.id = req.headers['x-request-id']?.toString().slice(0, 64) || randomUUID();
  res.setHeader('X-Request-Id', req.id);
  res.on('finish', () => {
    if (req.path === '/health') return;
    logger.info('request', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      ms: Number((process.hrtime.bigint() - start) / 1_000_000n),
      userId: req.user?.id,
    });
  });
  next();
}
