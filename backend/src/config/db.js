import mysql from 'mysql2/promise';
import { config } from './env.js';

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.poolSize,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z', // all DATETIME values are stored/read as UTC
  dateStrings: true, // DATE/DATETIME come back as strings (formatted in the repository layer)
  decimalNumbers: true, // DECIMAL -> JS number
});

/**
 * Run `fn(conn)` inside a transaction. Commits on success, rolls back on any error.
 */
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* ignore rollback failure; the original error matters */
    }
    throw err;
  } finally {
    conn.release();
  }
}

export async function pingDb() {
  await pool.query('SELECT 1');
}
