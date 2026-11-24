import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function migrate({ log = console.log } = {}) {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(190) NOT NULL PRIMARY KEY,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);
  const [rows] = await pool.query('SELECT name FROM schema_migrations');
  const done = new Set(rows.map(r => r.name));
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    // Migrations are plain DDL (no stored programs), so splitting on ";" at end of line is safe.
    const statements = sql
      .replace(/^\s*--.*$/gm, '')
      .split(/;\s*(?:\r?\n|$)/)
      .map(s => s.trim())
      .filter(Boolean);
    for (const stmt of statements) await pool.query(stmt);
    await pool.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    log(`Applied migration ${file}`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  migrate()
    .then(() => pool.end())
    .catch(err => {
      console.error('Migration failed:', err.message);
      process.exit(1);
    });
}
