import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

export const config = Object.freeze({
  nodeEnv,
  isProd,
  port: Number(process.env.PORT || 4000),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5175')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: required('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    database: required('DB_NAME'),
    poolSize: Number(process.env.DB_POOL_SIZE || 10),
  },
  auth: {
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  },
  seedUserPassword: process.env.SEED_USER_PASSWORD || '',
});
