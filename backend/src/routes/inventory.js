import { Router } from 'express';
import { pool } from '../config/db.js';
import { repos } from '../repositories/index.js';
import { validate } from '../middleware/validate.js';
import { managerUp } from '../middleware/auth.js';
import { listQuerySchema } from '../utils/listQuery.js';
import { idParam } from '../validators/common.js';
import * as s from '../validators/schemas.js';
import * as catalog from '../services/catalogService.js';
import { listHandler, getHandler } from './helpers.js';
import { ok, created } from '../utils/response.js';
import { notFound } from '../utils/errors.js';

export const inventoryRouter = Router();

// Cost price is commercially sensitive: cashiers never receive it.
const maskCost = (item, user) => {
  if (user?.role !== 'Cashier') return item;
  const { costPrice, ...rest } = item;
  void costPrice;
  return rest;
};

inventoryRouter.get(
  '/jewellery-items',
  validate({ query: listQuerySchema }),
  listHandler(
    {
      entity: 'jewelleryItem',
      search: ['name', 'sku', 'barcode', 'itemCode', 'huid', 'designCode'],
      filters: ['category', 'metalType', 'stockStatus', 'isActive', 'productDesignId'],
      sortable: ['name', 'dateAdded', 'sellingPrice', 'category', 'stockQuantity'],
      defaultSort: ['dateAdded', 'desc'],
    },
    { mask: maskCost }
  )
);

inventoryRouter.get('/jewellery-items/barcode/:barcode', async (req, res) => {
  const item = await repos.jewelleryItem.findOne(pool, 'barcode', req.params.barcode);
  if (!item) throw notFound('No item with this barcode', 'ITEM_NOT_FOUND');
  ok(res, maskCost(item, req.user));
});

inventoryRouter.get(
  '/jewellery-items/:id',
  validate({ params: idParam }),
  getHandler('jewelleryItem', { label: 'Item', mask: maskCost })
);

inventoryRouter.post('/jewellery-items', managerUp, validate({ body: s.itemCreateBody }), async (req, res) => {
  created(res, await catalog.createItem(req.valid.body), 'Item added to catalogue');
});

inventoryRouter.post('/jewellery-items/bulk-barcodes', managerUp, validate({ body: s.itemBulkUpdateBody }), async (req, res) => {
  ok(res, await catalog.bulkUpdateBarcodes(req.valid.body.updates), 'Barcodes updated');
});

inventoryRouter.patch('/jewellery-items/:id', managerUp, validate({ params: idParam, body: s.itemUpdateBody }), async (req, res) => {
  ok(res, await catalog.updateItem(req.valid.params.id, req.valid.body), 'Item updated');
});
