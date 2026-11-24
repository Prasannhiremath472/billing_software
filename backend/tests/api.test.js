// Integration tests. They run against the configured MySQL database (see .env) which must already be
// migrated and seeded:  npm run migrate && npm run seed   then   npm test
// Each run creates its own item/customer so repeated runs do not exhaust seed stock.
process.env.NODE_ENV = 'test';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const { createApp } = await import('../src/app.js');
const { pool } = await import('../src/config/db.js');

const PASSWORD = process.env.SEED_USER_PASSWORD || 'Admin@12345';
let server;
let base;
const tokens = {};

const uid = () => randomBytes(4).toString('hex');

async function call(method, path, { token, body, headers } = {}) {
  const res = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = res.status === 204 ? null : await res.json();
  return { status: res.status, json };
}

async function login(email) {
  const r = await call('POST', '/auth/login', { body: { email, password: PASSWORD } });
  assert.equal(r.status, 200, `login failed for ${email}`);
  return r.json.data.token;
}

before(async () => {
  server = createApp().listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  tokens.cashier = await login('priya@slj.com');
  tokens.manager = await login('rajesh@slj.com');
});

after(async () => {
  await new Promise(r => server.close(r));
  await pool.end();
});

async function makeItem(overrides = {}) {
  const id = uid();
  const r = await call('POST', '/jewellery-items', {
    token: tokens.manager,
    body: {
      name: `Test Chain ${id}`, sku: `T-${id}`, barcode: `TB-${id}`, itemCode: `TC${id}`,
      category: '1 Gram Gold Jewellery', metalType: '1 Gram Gold', purity: '22K',
      sellingPrice: 1000, costPrice: 400, stockQuantity: 5, isQuantityBased: true, gstRate: 3, hsnCode: '7117',
      ...overrides,
    },
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.data;
}

async function makeCustomer() {
  const r = await call('POST', '/customers', {
    token: tokens.cashier,
    body: { fullName: `Test Customer ${uid()}`, mobile: `9${Math.floor(100000000 + Math.random() * 899999999)}` },
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.data;
}

// ---------------------------------------------------------------- auth

test('health endpoint is public', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
});

test('protected routes reject missing/invalid tokens with 401', async () => {
  assert.equal((await call('GET', '/customers')).status, 401);
  assert.equal((await call('GET', '/customers', { token: 'garbage' })).status, 401);
});

test('login rejects wrong password with a generic message', async () => {
  const r = await call('POST', '/auth/login', { body: { email: 'priya@slj.com', password: 'wrong-password' } });
  assert.equal(r.status, 401);
  assert.equal(r.json.errorCode, 'INVALID_CREDENTIALS');
  const unknown = await call('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'whatever' } });
  assert.equal(unknown.json.message, r.json.message, 'must not reveal whether the email exists');
});

test('responses never contain password hashes', async () => {
  const r = await call('GET', '/staff', { token: tokens.cashier });
  assert.equal(r.status, 200);
  assert.ok(!JSON.stringify(r.json).includes('password'));
});

// ---------------------------------------------------------------- RBAC

test('cashiers cannot change rates, create items, close the register or manage staff', async () => {
  const t = tokens.cashier;
  assert.equal((await call('PUT', '/metal-rates/rate-001', { token: t, body: { ratePerGram: 9999 } })).status, 403);
  assert.equal((await call('POST', '/jewellery-items', { token: t, body: {} })).status, 403);
  assert.equal((await call('POST', '/daily-closings', { token: t, body: { openingCash: 1, actualClosingCash: 1 } })).status, 403);
  assert.equal((await call('POST', '/staff', { token: t, body: {} })).status, 403);
});

test('cashiers do not receive cost prices; managers do', async () => {
  const item = await makeItem();
  const asCashier = await call('GET', `/jewellery-items/${item.id}`, { token: tokens.cashier });
  const asManager = await call('GET', `/jewellery-items/${item.id}`, { token: tokens.manager });
  assert.equal(asCashier.json.data.costPrice, undefined);
  assert.equal(asManager.json.data.costPrice, 400);
});

// ---------------------------------------------------------------- validation & mass assignment

test('validation errors return 422 with field details', async () => {
  const r = await call('POST', '/customers', { token: tokens.cashier, body: { fullName: '', mobile: 'abc' } });
  assert.equal(r.status, 422);
  assert.equal(r.json.errorCode, 'VALIDATION_ERROR');
  assert.ok(r.json.details.length >= 2);
});

test('customer creation ignores privileged fields (mass assignment)', async () => {
  const r = await call('POST', '/customers', {
    token: tokens.cashier,
    body: { fullName: 'Sneaky', mobile: `9${Math.floor(100000000 + Math.random() * 899999999)}`, loyaltyPoints: 99999, storeCredit: 5000 },
  });
  assert.equal(r.status, 201);
  assert.equal(r.json.data.loyaltyPoints, 0);
  assert.equal(r.json.data.storeCredit, 0);
});

test('duplicate mobile / barcode return 409', async () => {
  const c = await makeCustomer();
  const dup = await call('POST', '/customers', { token: tokens.cashier, body: { fullName: 'Dup', mobile: c.mobile } });
  assert.equal(dup.status, 409);
  const item = await makeItem();
  const dupItem = await call('POST', '/jewellery-items', {
    token: tokens.manager,
    body: { name: 'x', sku: `S-${uid()}`, barcode: item.barcode, itemCode: `IC${uid()}`, category: 'Bangles', metalType: 'Gold', purity: '22K', sellingPrice: 1 },
  });
  assert.equal(dupItem.status, 409);
});

test('list endpoints paginate and cap limit', async () => {
  const r = await call('GET', '/customers?limit=2&page=1', { token: tokens.cashier });
  assert.equal(r.status, 200);
  assert.ok(r.json.data.length <= 2);
  assert.equal(r.json.pagination.limit, 2);
  assert.equal((await call('GET', '/customers?limit=100000', { token: tokens.cashier })).status, 422);
});

// ---------------------------------------------------------------- checkout

test('checkout recomputes totals on the server, decrements stock and updates the customer', async () => {
  const item = await makeItem({ sellingPrice: 1000 });
  const customer = await makeCustomer();
  const r = await call('POST', '/invoices', {
    token: tokens.cashier,
    body: {
      customerId: customer.id,
      items: [{ jewelleryItemId: item.id, quantity: 2, itemDiscount: 100 }],
      placeOfSupplyCode: '33',
      payments: [{ method: 'Cash', amount: 1000 }, { method: 'UPI', amount: 854 }],
    },
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const inv = r.json.data.invoice;
  // 2 x (1000 - 100) = 1800 taxable; 3% GST = 54 (27 + 27); total 1854
  assert.equal(inv.subtotal, 2000);
  assert.equal(inv.discount, 200);
  assert.equal(inv.taxableAmount, 1800);
  assert.equal(inv.cgst, 27);
  assert.equal(inv.sgst, 27);
  assert.equal(inv.igst, 0);
  assert.equal(inv.grandTotal, 1854);
  assert.equal(inv.paymentStatus, 'Paid');
  assert.match(inv.invoiceNumber, /^SLJ\/\d{4}-\d{2}\/\d{4}$/);
  assert.equal(inv.cashierId, 'staff-002', 'cashier comes from the session, never from the client');
  assert.equal(inv.payments.length, 2);

  const stock = (await call('GET', `/jewellery-items/${item.id}`, { token: tokens.cashier })).json.data;
  assert.equal(stock.stockQuantity, 3);
  const cust = (await call('GET', `/customers/${customer.id}`, { token: tokens.cashier })).json.data;
  assert.equal(cust.totalPurchases, 1);
  assert.equal(cust.totalSpent, 1854);
  assert.equal(cust.loyaltyPoints, 18);
});

test('client-supplied prices cannot lower the bill (no price field is accepted)', async () => {
  const item = await makeItem({ sellingPrice: 1000 });
  const r = await call('POST', '/invoices', {
    token: tokens.cashier,
    body: {
      items: [{ jewelleryItemId: item.id, quantity: 1, sellingPrice: 1, totalPrice: 1 }],
      grandTotal: 1, placeOfSupplyCode: '33',
      payments: [{ method: 'Cash', amount: 1030 }],
    },
  });
  assert.equal(r.status, 201);
  assert.equal(r.json.data.invoice.grandTotal, 1030);
});

test('inter-state sale charges IGST', async () => {
  const item = await makeItem({ sellingPrice: 1000 });
  const r = await call('POST', '/invoices', {
    token: tokens.cashier,
    body: { items: [{ jewelleryItemId: item.id, quantity: 1 }], placeOfSupplyCode: '27', payments: [{ method: 'Cash', amount: 1030 }] },
  });
  assert.equal(r.status, 201);
  const inv = r.json.data.invoice;
  assert.equal(inv.isInterState, true);
  assert.equal(inv.igst, 30);
  assert.equal(inv.cgst + inv.sgst, 0);
});

test('checkout rejects insufficient stock (409), underpayment (422) and overpayment (422)', async () => {
  const item = await makeItem({ stockQuantity: 2 });
  const body = qty => ({ items: [{ jewelleryItemId: item.id, quantity: qty }], placeOfSupplyCode: '33' });
  const t = tokens.cashier;
  const noStock = await call('POST', '/invoices', { token: t, body: { ...body(3), payments: [{ method: 'Cash', amount: 3090 }] } });
  assert.equal(noStock.status, 409);
  assert.equal(noStock.json.errorCode, 'INSUFFICIENT_STOCK');
  const under = await call('POST', '/invoices', { token: t, body: { ...body(1), payments: [{ method: 'Cash', amount: 500 }] } });
  assert.equal(under.status, 422);
  assert.equal(under.json.errorCode, 'INSUFFICIENT_PAYMENT');
  const over = await call('POST', '/invoices', { token: t, body: { ...body(1), payments: [{ method: 'Cash', amount: 5000 }] } });
  assert.equal(over.status, 422);
  assert.equal(over.json.errorCode, 'OVERPAYMENT');
  const stock = (await call('GET', `/jewellery-items/${item.id}`, { token: t })).json.data;
  assert.equal(stock.stockQuantity, 2, 'failed checkouts must not touch stock');
});

test('a single piece cannot be sold twice', async () => {
  const piece = await makeItem({ isQuantityBased: false, stockQuantity: 1, sellingPrice: 500 });
  const sale = () =>
    call('POST', '/invoices', {
      token: tokens.cashier,
      body: { items: [{ jewelleryItemId: piece.id, quantity: 1 }], placeOfSupplyCode: '33', payments: [{ method: 'Cash', amount: 515 }] },
    });
  assert.equal((await sale()).status, 201);
  const second = await sale();
  assert.equal(second.status, 409);
  assert.equal(second.json.errorCode, 'ITEM_NOT_AVAILABLE');
});

test('concurrent checkouts of the last unit: exactly one succeeds', async () => {
  const piece = await makeItem({ stockQuantity: 1, sellingPrice: 100 });
  const sale = () =>
    call('POST', '/invoices', {
      token: tokens.cashier,
      body: { items: [{ jewelleryItemId: piece.id, quantity: 1 }], placeOfSupplyCode: '33', payments: [{ method: 'Cash', amount: 103 }] },
    });
  const results = await Promise.all([sale(), sale(), sale()]);
  assert.equal(results.filter(r => r.status === 201).length, 1);
  assert.equal(results.filter(r => r.status === 409).length, 2);
});

test('Idempotency-Key makes a retried checkout return the same invoice', async () => {
  const item = await makeItem({ sellingPrice: 200 });
  const key = `idem-${uid()}`;
  const send = () =>
    call('POST', '/invoices', {
      token: tokens.cashier,
      headers: { 'Idempotency-Key': key },
      body: { items: [{ jewelleryItemId: item.id, quantity: 1 }], placeOfSupplyCode: '33', payments: [{ method: 'Cash', amount: 206 }] },
    });
  const first = await send();
  const second = await send();
  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(first.json.data.invoice.id, second.json.data.invoice.id);
  const stock = (await call('GET', `/jewellery-items/${item.id}`, { token: tokens.cashier })).json.data;
  assert.equal(stock.stockQuantity, 4, 'stock decremented once only');
});

test('credit sale requires a customer and posts to the ledger', async () => {
  const item = await makeItem({ sellingPrice: 1000 });
  const base = { items: [{ jewelleryItemId: item.id, quantity: 1 }], placeOfSupplyCode: '33', allowCredit: true, payments: [{ method: 'Cash', amount: 500 }] };
  const walkIn = await call('POST', '/invoices', { token: tokens.cashier, body: base });
  assert.equal(walkIn.status, 422);
  const customer = await makeCustomer();
  const r = await call('POST', '/invoices', { token: tokens.cashier, body: { ...base, customerId: customer.id } });
  assert.equal(r.status, 201);
  assert.equal(r.json.data.invoice.paymentStatus, 'Partial');
  assert.equal(r.json.data.customer.outstandingBalance, 530);
  assert.equal(r.json.data.ledgerEntries[0].debit, 530);
});

test('loyalty points cannot exceed the customer balance', async () => {
  const item = await makeItem({ sellingPrice: 1000 });
  const customer = await makeCustomer();
  const r = await call('POST', '/invoices', {
    token: tokens.cashier,
    body: { customerId: customer.id, items: [{ jewelleryItemId: item.id, quantity: 1 }], placeOfSupplyCode: '33', loyaltyPointsToRedeem: 500, payments: [] },
  });
  assert.equal(r.status, 422);
  assert.equal(r.json.errorCode, 'INSUFFICIENT_POINTS');
});

// ---------------------------------------------------------------- returns

test('returns cap refunds at the amount paid, restock, and issue a credit note for store credit', async () => {
  const item = await makeItem({ sellingPrice: 1000 });
  const customer = await makeCustomer();
  const sale = await call('POST', '/invoices', {
    token: tokens.cashier,
    body: { customerId: customer.id, items: [{ jewelleryItemId: item.id, quantity: 1 }], placeOfSupplyCode: '33', payments: [{ method: 'Cash', amount: 1030 }] },
  });
  const invoiceId = sale.json.data.invoice.id;

  const tooMuch = await call('POST', '/returns', {
    token: tokens.cashier,
    body: { originalInvoiceId: invoiceId, items: [{ jewelleryItemId: item.id, refundAmount: 5000 }], refundMethod: 'Cash', reason: 'Defective' },
  });
  assert.equal(tooMuch.status, 422);
  assert.equal(tooMuch.json.errorCode, 'REFUND_TOO_HIGH');

  const ok = await call('POST', '/returns', {
    token: tokens.cashier,
    body: { originalInvoiceId: invoiceId, items: [{ jewelleryItemId: item.id, refundAmount: 1030 }], refundMethod: 'Store Credit', reason: 'Defective' },
  });
  assert.equal(ok.status, 201, JSON.stringify(ok.json));
  assert.ok(ok.json.data.creditNoteId);
  const cust = (await call('GET', `/customers/${customer.id}`, { token: tokens.cashier })).json.data;
  assert.equal(cust.storeCredit, 1030);
  const stock = (await call('GET', `/jewellery-items/${item.id}`, { token: tokens.cashier })).json.data;
  assert.equal(stock.stockQuantity, 5);

  const again = await call('POST', '/returns', {
    token: tokens.cashier,
    body: { originalInvoiceId: invoiceId, items: [{ jewelleryItemId: item.id, refundAmount: 10 }], refundMethod: 'Cash', reason: 'Defective' },
  });
  assert.equal(again.status, 422);
  assert.equal(again.json.errorCode, 'ALREADY_RETURNED');
});
