import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { pool } from '../config/db.js';
import { forbidden, unauthorized } from '../utils/errors.js';

export const ROLES = Object.freeze({ ADMIN: 'Admin', MANAGER: 'Manager', CASHIER: 'Cashier' });

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

/** Verifies the bearer token and loads the *current* user (role changes / deactivation apply immediately). */
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized();

    let payload;
    try {
      payload = jwt.verify(token, config.auth.jwtSecret, { algorithms: ['HS256'] });
    } catch {
      throw unauthorized('Session expired or invalid. Please sign in again.', 'TOKEN_INVALID');
    }

    const [rows] = await pool.query(
      'SELECT id, name, role, email, phone, is_active FROM users WHERE id = ? LIMIT 1',
      [payload.sub]
    );
    const row = rows[0];
    if (!row || !row.is_active) throw unauthorized('Account is not active', 'ACCOUNT_DISABLED');

    req.user = { id: row.id, name: row.name, role: row.role, email: row.email, phone: row.phone };
    next();
  } catch (err) {
    next(err);
  }
}

/** Role gate. Admin always passes. */
export const authorize =
  (...allowed) =>
  (req, _res, next) => {
    const role = req.user?.role;
    if (role === ROLES.ADMIN || allowed.includes(role)) return next();
    next(forbidden());
  };

export const managerUp = authorize(ROLES.MANAGER);
