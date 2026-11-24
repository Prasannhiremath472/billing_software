// Store profile, settings, staff, metal rates, designs, label templates, notifications.
import { Router } from 'express';
import { pool } from '../config/db.js';
import { repos } from '../repositories/index.js';
import { validate } from '../middleware/validate.js';
import { authorize, managerUp } from '../middleware/auth.js';
import { listQuerySchema } from '../utils/listQuery.js';
import { idParam } from '../validators/common.js';
import * as s from '../validators/schemas.js';
import * as settings from '../services/settingsService.js';
import * as authSvc from '../services/authService.js';
import * as catalog from '../services/catalogService.js';
import { listHandler } from './helpers.js';
import { ok, created } from '../utils/response.js';
import { notFound } from '../utils/errors.js';

export const referenceRouter = Router();
const adminOnly = authorize(); // Admin always passes `authorize`; no other role is listed

// ---- store profile ----
referenceRouter.get('/store', async (_req, res) => ok(res, await settings.getStoreInfo()));
referenceRouter.put('/store', managerUp, validate({ body: s.storeInfoBody }), async (req, res) => {
  ok(res, await settings.saveStoreInfo(req.valid.body), 'Store profile saved');
});

// ---- settings ----
referenceRouter.get('/settings/loyalty', async (_req, res) => ok(res, await settings.getSetting(pool, 'loyalty')));
referenceRouter.put('/settings/loyalty', managerUp, validate({ body: s.loyaltyConfigBody }), async (req, res) => {
  ok(res, await settings.saveSetting(pool, 'loyalty', req.valid.body), 'Loyalty rules saved');
});
referenceRouter.get('/settings/tax', async (_req, res) => ok(res, await settings.getSetting(pool, 'tax')));
referenceRouter.put('/settings/tax', managerUp, validate({ body: s.taxConfigBody }), async (req, res) => {
  ok(res, await settings.saveSetting(pool, 'tax', req.valid.body), 'Tax settings saved');
});

// ---- staff ----
referenceRouter.get('/staff', async (_req, res) => ok(res, await authSvc.listStaff()));
referenceRouter.post('/staff', adminOnly, validate({ body: s.staffCreateBody }), async (req, res) => {
  created(res, await authSvc.createStaff(req.valid.body), 'Staff member created');
});
referenceRouter.patch('/staff/:id', adminOnly, validate({ params: idParam, body: s.staffUpdateBody }), async (req, res) => {
  ok(res, await authSvc.updateStaff(req.valid.params.id, req.user.id, req.valid.body), 'Staff member updated');
});

// ---- metal rates ----
referenceRouter.get('/metal-rates', async (_req, res) =>
  ok(res, await repos.metalRate.list(pool, { orderBy: '`metal_type` ASC, `purity` DESC' })));
referenceRouter.put('/metal-rates/:id', managerUp, validate({ params: idParam, body: s.rateUpdateBody }), async (req, res) => {
  ok(res, await catalog.updateRate(req.valid.params.id, req.valid.body.ratePerGram, req.user), 'Rate updated');
});
referenceRouter.get(
  '/metal-rates/history',
  validate({ query: listQuerySchema }),
  listHandler({
    entity: 'metalRateHistory', filters: ['metalType', 'purity'], dateProp: 'date',
    sortable: ['date', 'ratePerGram'], defaultSort: ['date', 'desc'],
  })
);

// ---- product designs ----
referenceRouter.get(
  '/product-designs',
  validate({ query: listQuerySchema }),
  listHandler({
    entity: 'productDesign', search: ['name', 'designCode'], filters: ['category', 'metalType', 'isActive'],
    sortable: ['name', 'createdAt'], defaultSort: ['createdAt', 'desc'],
  })
);
referenceRouter.post('/product-designs', managerUp, validate({ body: s.productDesignBody }), async (req, res) => {
  created(res, await catalog.createDesign(req.valid.body), 'Design created');
});

// ---- label templates ----
referenceRouter.get('/label-templates', async (_req, res) =>
  ok(res, await repos.labelTemplate.list(pool, { orderBy: '`is_default` DESC, `name` ASC' })));
referenceRouter.put('/label-templates/:id', managerUp, validate({ params: idParam, body: s.labelTemplateBody }), async (req, res) => {
  if (!(await repos.labelTemplate.findById(pool, req.valid.params.id))) throw notFound('Label template not found', 'TEMPLATE_NOT_FOUND');
  await repos.labelTemplate.update(pool, req.valid.params.id, req.valid.body);
  ok(res, await repos.labelTemplate.findById(pool, req.valid.params.id), 'Template saved');
});

// ---- notifications ----
referenceRouter.get('/notifications', async (_req, res) =>
  ok(res, await repos.notification.list(pool, { orderBy: '`notified_at` DESC', limit: 100 })));
referenceRouter.patch('/notifications/:id/read', validate({ params: idParam }), async (req, res) => {
  ok(res, await catalog.markNotificationRead(req.valid.params.id));
});
referenceRouter.post('/notifications/read-all', async (_req, res) => {
  await pool.query('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
  ok(res, null, 'All notifications marked as read');
});

