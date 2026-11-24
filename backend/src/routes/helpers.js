import { pool } from '../config/db.js';
import { repos } from '../repositories/index.js';
import { buildListQuery } from '../utils/listQuery.js';
import { paginated, ok } from '../utils/response.js';
import { notFound } from '../utils/errors.js';

/** Paginated, searchable, filterable, sortable list endpoint driven by a whitelist `spec`. */
export function listHandler(spec, { hydrate, mask } = {}) {
  const repo = repos[spec.entity];
  return async (req, res) => {
    const q = buildListQuery(spec, req.valid.query);
    const [rows, total] = await Promise.all([repo.list(pool, q), repo.count(pool, q)]);
    let data = hydrate ? await hydrate(pool, rows) : rows;
    if (mask) data = data.map(r => mask(r, req.user));
    paginated(res, data, { page: q.page, limit: q.limit, total });
  };
}

export function getHandler(entity, { hydrate, label = 'Record', mask } = {}) {
  const repo = repos[entity];
  return async (req, res) => {
    let row = await repo.findById(pool, req.params.id);
    if (!row) throw notFound(`${label} not found`, `${label.toUpperCase().replace(/\s+/g, '_')}_NOT_FOUND`);
    if (hydrate) [row] = await hydrate(pool, [row]);
    ok(res, mask ? mask(row, req.user) : row);
  };
}
