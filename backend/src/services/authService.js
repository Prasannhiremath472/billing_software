import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { signToken } from '../middleware/auth.js';
import { badRequest, unauthorized, notFound } from '../utils/errors.js';
import { newId } from '../utils/ids.js';

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const toStaff = r => ({
  id: r.id,
  name: r.name,
  role: r.role,
  ...(r.email ? { email: r.email } : {}),
  ...(r.phone ? { phone: r.phone } : {}),
  isActive: Boolean(r.is_active),
});

export async function login(email, password) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  const row = rows[0];
  const valid = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !valid || !row.is_active) {
    throw unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }
  await pool.query('UPDATE users SET last_login_at = UTC_TIMESTAMP(3) WHERE id = ?', [row.id]);
  return { token: signToken(row), user: toStaff(row) };
}

export async function getUser(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) throw notFound('User not found', 'USER_NOT_FOUND');
  return toStaff(rows[0]);
}

export async function changePassword(userId, currentPassword, newPassword) {
  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
    throw badRequest('Current password is incorrect', 'WRONG_PASSWORD');
  }
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(newPassword, 10), userId]);
}

export async function listStaff() {
  const [rows] = await pool.query('SELECT * FROM users ORDER BY name ASC');
  return rows.map(toStaff);
}

export async function createStaff({ name, role, email, phone, password }) {
  const id = newId('staff');
  await pool.query(
    'INSERT INTO users (id, name, role, email, phone, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, role, email, phone ?? null, await bcrypt.hash(password, 10)]
  );
  return getUser(id);
}

export async function updateStaff(id, actorId, patch) {
  if (id === actorId && (patch.isActive === false || (patch.role && patch.role !== 'Admin'))) {
    // Prevent an admin locking themselves out / demoting themselves by accident.
    throw badRequest('You cannot deactivate or change the role of your own account', 'SELF_MODIFICATION');
  }
  await getUser(id);
  const sets = [];
  const params = [];
  for (const [prop, col] of [['name', 'name'], ['role', 'role'], ['phone', 'phone']]) {
    if (patch[prop] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(patch[prop]);
    }
  }
  if (patch.isActive !== undefined) {
    sets.push('is_active = ?');
    params.push(patch.isActive ? 1 : 0);
  }
  if (patch.password) {
    sets.push('password_hash = ?');
    params.push(await bcrypt.hash(patch.password, 10));
  }
  if (sets.length) await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  return getUser(id);
}
