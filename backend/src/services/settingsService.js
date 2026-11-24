import { pool } from '../config/db.js';
import { repos } from '../repositories/index.js';
import { notFound } from '../utils/errors.js';

const KEYS = { loyalty: 'loyalty_config', tax: 'tax_config' };

export async function getSetting(db, name) {
  const [rows] = await db.query('SELECT setting_value FROM app_settings WHERE setting_key = ?', [KEYS[name]]);
  if (!rows[0]) throw notFound(`Setting "${name}" has not been configured`, 'SETTING_NOT_FOUND');
  const v = rows[0].setting_value;
  return typeof v === 'string' ? JSON.parse(v) : v;
}

export async function saveSetting(db, name, value) {
  await db.query(
    'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
    [KEYS[name], JSON.stringify(value)]
  );
  return value;
}

export async function getStoreInfo(db = pool) {
  const rows = await repos.storeInfo.list(db, { limit: 1, orderBy: '`id` ASC' });
  if (!rows[0]) throw notFound('Store profile has not been configured', 'STORE_NOT_FOUND');
  return rows[0];
}

export async function saveStoreInfo(patch) {
  const current = await getStoreInfo();
  await repos.storeInfo.update(pool, current.id, patch);
  return getStoreInfo();
}
