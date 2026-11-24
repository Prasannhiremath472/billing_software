import { z } from 'zod';
import { entities } from '../db/entities.js';

/**
 * Builds a safe WHERE / ORDER BY / LIMIT from validated query params.
 *
 * spec = {
 *   entity: 'customer',                      // key in entities registry
 *   search: ['fullName', 'mobile'],          // props searched with LIKE
 *   filters: ['category', 'isActive'],       // props matched with =
 *   dateProp: 'date',                        // prop used by ?from= & ?to= (YYYY-MM-DD)
 *   sortable: ['fullName', 'totalSpent'],    // whitelist for ?sortBy=
 *   defaultSort: ['registrationDate', 'desc'],
 * }
 */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  search: z.string().trim().max(100).optional(),
  sortBy: z.string().max(40).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).catchall(z.string().max(100));

const q = id => `\`${id}\``;

export function buildListQuery(spec, query) {
  const def = entities[spec.entity];
  const t = q(def.table);
  const clauses = [];
  const params = [];

  if (query.search) {
    const like = `%${query.search.replace(/[\\%_]/g, m => `\\${m}`)}%`;
    const parts = (spec.search || []).map(p => {
      params.push(like);
      return `${t}.${q(def.byProp[p].col)} LIKE ?`;
    });
    if (parts.length) clauses.push(`(${parts.join(' OR ')})`);
  }

  for (const prop of spec.filters || []) {
    const raw = query[prop];
    if (raw === undefined || raw === '') continue;
    const c = def.byProp[prop];
    clauses.push(`${t}.${q(c.col)} = ?`);
    params.push(c.type === 'b' ? (raw === 'true' || raw === '1' ? 1 : 0) : raw);
  }

  if (spec.dateProp) {
    const col = `${t}.${q(def.byProp[spec.dateProp].col)}`;
    if (query.from) {
      clauses.push(`${col} >= ?`);
      params.push(`${query.from} 00:00:00`);
    }
    if (query.to) {
      clauses.push(`${col} < DATE_ADD(?, INTERVAL 1 DAY)`);
      params.push(query.to);
    }
  }

  const sortable = spec.sortable || [];
  const [defProp, defDir] = spec.defaultSort || ['id', 'asc'];
  const sortProp = sortable.includes(query.sortBy) ? query.sortBy : defProp;
  const dir = (query.sortOrder || (sortProp === defProp ? defDir : 'asc')).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const orderBy = `${t}.${q(def.byProp[sortProp].col)} ${dir}, ${t}.${q('id')} ASC`;

  return {
    where: clauses.join(' AND '),
    params,
    orderBy,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    page: query.page,
  };
}
