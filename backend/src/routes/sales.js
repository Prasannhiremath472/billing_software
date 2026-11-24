import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { listQuerySchema } from '../utils/listQuery.js';
import { idParam } from '../validators/common.js';
import * as s from '../validators/schemas.js';
import { pool } from '../config/db.js';
import * as invoices from '../services/invoiceService.js';
import * as returns from '../services/returnService.js';
import * as ops from '../services/operationsService.js';
import { listHandler, getHandler } from './helpers.js';
import { created, ok } from '../utils/response.js';
import { notFound } from '../utils/errors.js';

export const salesRouter = Router();

// ---- invoices ----
salesRouter.get(
  '/invoices',
  validate({ query: listQuerySchema }),
  listHandler(
    {
      entity: 'invoice', search: ['invoiceNumber', 'customerName', 'customerMobile'],
      filters: ['customerId', 'paymentStatus', 'cashierId'], dateProp: 'date',
      sortable: ['date', 'grandTotal', 'invoiceNumber'], defaultSort: ['date', 'desc'],
    },
    { hydrate: invoices.hydrateInvoices }
  )
);

salesRouter.get('/invoices/:id', validate({ params: idParam }), async (req, res) => {
  const inv = await invoices.getInvoiceById(pool, req.valid.params.id);
  if (!inv) throw notFound('Invoice not found', 'INVOICE_NOT_FOUND');
  ok(res, inv);
});

// Checkout. Send an `Idempotency-Key` header to make retries safe.
salesRouter.post('/invoices', validate({ body: s.invoiceCreateBody }), async (req, res) => {
  const key = req.get('Idempotency-Key')?.trim() || undefined;
  const result = await invoices.createInvoice(req.valid.body, req.user, key);
  const { replayed, ...data } = result;
  if (replayed) return ok(res, data, 'Invoice already created for this request');
  created(res, data, 'Invoice created');
});

// ---- payments ----
salesRouter.get(
  '/payments',
  validate({ query: listQuerySchema }),
  listHandler({
    entity: 'payment', search: ['invoiceNumber', 'customerName', 'referenceNumber'],
    filters: ['method', 'invoiceId', 'customerId'], dateProp: 'date',
    sortable: ['date', 'amount'], defaultSort: ['date', 'desc'],
  })
);

// ---- returns / credit notes / exchanges ----
salesRouter.get(
  '/returns',
  validate({ query: listQuerySchema }),
  listHandler(
    {
      entity: 'returnRecord', search: ['returnNumber', 'originalInvoiceNumber', 'customerName'],
      filters: ['customerId', 'originalInvoiceId', 'refundMethod'], dateProp: 'date',
      sortable: ['date', 'totalRefundAmount'], defaultSort: ['date', 'desc'],
    },
    { hydrate: returns.hydrateReturns }
  )
);
salesRouter.post('/returns', validate({ body: s.returnCreateBody }), async (req, res) => {
  created(res, await returns.createReturn(req.valid.body, req.user), 'Return processed');
});

salesRouter.get(
  '/credit-notes',
  validate({ query: listQuerySchema }),
  listHandler({
    entity: 'creditNote', search: ['creditNoteNumber', 'originalInvoiceNumber', 'customerName'],
    filters: ['customerId', 'isActive'], dateProp: 'date', sortable: ['date', 'amount'], defaultSort: ['date', 'desc'],
  })
);
salesRouter.get('/credit-notes/:id', validate({ params: idParam }), getHandler('creditNote', { label: 'Credit note' }));

salesRouter.get(
  '/exchanges',
  validate({ query: listQuerySchema }),
  listHandler({
    entity: 'exchangeRecord', search: ['exchangeNumber', 'originalInvoiceNumber', 'customerName'],
    filters: ['customerId'], dateProp: 'date', sortable: ['date'], defaultSort: ['date', 'desc'],
  })
);

// ---- old gold ----
salesRouter.get(
  '/old-gold-exchanges',
  validate({ query: listQuerySchema }),
  listHandler({
    entity: 'oldGold', search: ['exchangeNumber', 'customerName'], filters: ['customerId', 'settlementType'],
    dateProp: 'date', sortable: ['date', 'finalExchangeValue'], defaultSort: ['date', 'desc'],
  })
);
salesRouter.post('/old-gold-exchanges', validate({ body: s.oldGoldBody }), async (req, res) => {
  created(res, await ops.createOldGold(req.valid.body, req.user), 'Old gold exchange recorded');
});
