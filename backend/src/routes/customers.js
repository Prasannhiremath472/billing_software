import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { listQuerySchema } from '../utils/listQuery.js';
import { idParam } from '../validators/common.js';
import * as s from '../validators/schemas.js';
import * as catalog from '../services/catalogService.js';
import { listHandler, getHandler } from './helpers.js';
import { ok, created } from '../utils/response.js';

export const customerRouter = Router();

customerRouter.get(
  '/customers',
  validate({ query: listQuerySchema }),
  listHandler({
    entity: 'customer', search: ['fullName', 'mobile', 'email', 'gstin'], filters: ['category', 'isActive'],
    sortable: ['fullName', 'totalSpent', 'loyaltyPoints', 'outstandingBalance', 'registrationDate'],
    defaultSort: ['registrationDate', 'desc'],
  })
);
customerRouter.get('/customers/:id', validate({ params: idParam }), getHandler('customer', { label: 'Customer' }));
customerRouter.post('/customers', validate({ body: s.customerCreateBody }), async (req, res) => {
  created(res, await catalog.createCustomer(req.valid.body), 'Customer registered');
});
customerRouter.patch('/customers/:id', validate({ params: idParam, body: s.customerUpdateBody }), async (req, res) => {
  ok(res, await catalog.updateCustomer(req.valid.params.id, req.valid.body), 'Customer updated');
});

customerRouter.get(
  '/ledger-entries',
  validate({ query: listQuerySchema }),
  listHandler({
    entity: 'ledgerEntry', filters: ['customerId'], dateProp: 'date',
    sortable: ['date'], defaultSort: ['date', 'asc'],
  })
);
customerRouter.get(
  '/loyalty-transactions',
  validate({ query: listQuerySchema }),
  listHandler({
    entity: 'loyaltyTransaction', filters: ['customerId', 'type'], dateProp: 'date',
    sortable: ['date', 'points'], defaultSort: ['date', 'desc'],
  })
);
