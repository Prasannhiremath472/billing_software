/**
 * Generic repository driven by the entity registry (src/db/entities.js).
 *
 * `db` is either the pool or a transaction connection (both expose `.query`).
 * SQL identifiers come exclusively from the registry; every value is a bound parameter.
 * `where` / `orderBy` strings must be built by trusted code (whitelisted columns) - never from raw input.
 */

const q = id => `\`${id}\``;

function toIso(value) {
  if (value == null) return undefined;
  // mysql2 (dateStrings) -> 'YYYY-MM-DD HH:MM:SS[.mmm]' in UTC
  const s = String(value).replace(' ', 'T');
  return /Z$/.test(s) ? s : `${s}Z`;
}

function fromDb(type, v) {
  switch (type) {
    case 'n':
      return Number(v);
    case 'i':
      return Number(v);
    case 'b':
      return Boolean(v);
    case 'j':
      return typeof v === 'string' ? JSON.parse(v) : v;
    case 'dt':
      return toIso(v);
    case 'd':
      return String(v).slice(0, 10);
    default:
      return v;
  }
}

/** Normalise API input to what MySQL expects. Datetimes without a zone are treated as UTC. */
export function toDbDateTime(v) {
  if (v == null || v === '') return null;
  let s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) s += 'Z';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T00:00:00Z';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace('T', ' ').replace('Z', '');
}

function toDb(type, v) {
  if (v === undefined || v === null) return null;
  switch (type) {
    case 'b':
      return v ? 1 : 0;
    case 'j':
      return JSON.stringify(v);
    case 'dt':
      return toDbDateTime(v);
    case 'd':
      return String(v).slice(0, 10);
    default:
      return v;
  }
}

export function makeRepository(entity) {
  const { table, cols, byProp } = entity;
  const selectList = cols.map(c => `${q(table)}.${q(c.col)}`).join(', ');

  function fromRow(row) {
    if (!row) return undefined;
    const out = {};
    for (const c of cols) {
      const v = row[c.col];
      if (v === null || v === undefined) continue; // omit nulls so optional TS props stay `undefined`
      out[c.prop] = fromDb(c.type, v);
    }
    return out;
  }

  async function list(db, { where = '', params = [], orderBy = '', limit, offset = 0, forUpdate = false } = {}) {
    let sql = `SELECT ${selectList} FROM ${q(table)}`;
    if (where) sql += ` WHERE ${where}`;
    if (orderBy) sql += ` ORDER BY ${orderBy}`;
    if (limit != null) sql += ` LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
    if (forUpdate) sql += ' FOR UPDATE';
    const [rows] = await db.query(sql, params);
    return rows.map(fromRow);
  }

  async function count(db, { where = '', params = [] } = {}) {
    const sql = `SELECT COUNT(*) AS total FROM ${q(table)}${where ? ` WHERE ${where}` : ''}`;
    const [rows] = await db.query(sql, params);
    return Number(rows[0].total);
  }

  async function findById(db, id, { forUpdate = false } = {}) {
    const rows = await list(db, { where: `${q(table)}.${q('id')} = ?`, params: [id], limit: 1, forUpdate });
    return rows[0];
  }

  async function findOne(db, prop, value, opts = {}) {
    const c = byProp[prop];
    if (!c) throw new Error(`Unknown property ${prop} on ${table}`);
    const rows = await list(db, { where: `${q(table)}.${q(c.col)} = ?`, params: [value], limit: 1, ...opts });
    return rows[0];
  }

  async function insert(db, obj) {
    const used = cols.filter(c => obj[c.prop] !== undefined);
    const sql = `INSERT INTO ${q(table)} (${used.map(c => q(c.col)).join(', ')}) VALUES (${used.map(() => '?').join(', ')})`;
    await db.query(sql, used.map(c => toDb(c.type, obj[c.prop])));
    return obj;
  }

  async function update(db, id, patch) {
    const used = cols.filter(c => c.prop !== 'id' && patch[c.prop] !== undefined);
    if (used.length === 0) return;
    const sql = `UPDATE ${q(table)} SET ${used.map(c => `${q(c.col)} = ?`).join(', ')} WHERE ${q('id')} = ?`;
    await db.query(sql, [...used.map(c => toDb(c.type, patch[c.prop])), id]);
  }

  return { fromRow, list, count, findById, findOne, insert, update, table };
}
