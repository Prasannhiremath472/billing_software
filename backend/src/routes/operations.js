import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { repos } from '../repositories/index.js';
import { validate } from '../middleware/validate.js';
import { managerUp } from '../middleware/auth.js';
import { listQuerySchema } from '../utils/listQuery.js';
import { idParam } from '../validators/common.js';
import * as s from '../validators/schemas.js';
import * as ops from '../services/operationsService.js';
import * as catalog from '../services/catalogService.js';
import { businessDate } from '../utils/dates.js';
import { listHandler } from './helpers.js';
import { ok, created } from '../utils/response.js';

export const operationsRouter = Router();

// ---- daily closing ----
operationsRouter.get(
  '/daily-closings',
  validate({ query: listQuerySchema }),
  listHandler({
    entity: 'dailyClosing', filters: ['status'], dateProp: 'date', sortable: ['date'], defaultSort: ['date', 'desc'],
  })
);
// Today's live collections, computed from recorded payments/returns for the business day.
operationsRouter.get(
  '/daily-closings/summary',
  managerUp,
  validate({ query: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }) }),
  async (req, res) => ok(res, await ops.closingSummary(pool, req.valid.query.date || businessDate()))
);
operationsRouter.post('/daily-closings', managerUp, validate({ body: s.dailyClosingBody }), async (req, res) => {
  created(res, await ops.createDailyClosing(req.valid.body, req.user), 'Register closed');
});

// ---- repairs ----
operationsRouter.get(
  '/repair-orders',
  validate({ query: listQuerySchema }),
  listHandler({
    entity: 'repairOrder', search: ['repairNumber', 'customerName', 'customerMobile', 'itemDescription'],
    filters: ['status', 'customerId'], sortable: ['receivedDate', 'expectedDeliveryDate'], defaultSort: ['receivedDate', 'desc'],
  })
);
operationsRouter.post('/repair-orders', validate({ body: s.repairCreateBody }), async (req, res) => {
  created(res, await ops.createRepair(req.valid.body, req.user), 'Repair order created');
});
operationsRouter.patch('/repair-orders/:id', validate({ params: idParam, body: s.repairUpdateBody }), async (req, res) => {
  ok(res, await ops.updateRepair(req.valid.params.id, req.valid.body), 'Repair order updated');
});

// ---- parked bills (private to the signed-in user) ----
operationsRouter.get('/parked-bills', async (req, res) => {
  ok(res, await repos.parkedBill.list(pool, { where: '`user_id` = ?', params: [req.user.id], orderBy: '`parked_at` DESC' }));
});
operationsRouter.post('/parked-bills', validate({ body: s.parkedBillBody }), async (req, res) => {
  created(res, await catalog.parkBill(req.valid.body, req.user), 'Bill parked');
});
operationsRouter.delete('/parked-bills/:id', validate({ params: idParam }), async (req, res) => {
  await catalog.removeParkedBill(req.valid.params.id, req.user);
  res.status(204).end();
});
