import { entities } from '../db/entities.js';
import { makeRepository } from './baseRepository.js';

export const repos = Object.fromEntries(
  Object.entries(entities).map(([name, def]) => [name, makeRepository(def)])
);

/** Atomically allocate the next number of a named sequence (call inside a transaction). */
export async function nextSequence(conn, key) {
  await conn.query(
    'INSERT INTO document_sequences (seq_key, current_value) VALUES (?, 1) ON DUPLICATE KEY UPDATE current_value = LAST_INSERT_ID(current_value + 1)',
    [key]
  );
  const [[row]] = await conn.query('SELECT current_value AS v FROM document_sequences WHERE seq_key = ?', [key]);
  return Number(row.v);
}

/** Indian financial year label for a date, e.g. 2026-11-24 -> "2026-27". */
export function financialYear(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}
