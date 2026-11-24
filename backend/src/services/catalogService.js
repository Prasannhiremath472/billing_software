// Inventory items, customers, metal rates, notifications, parked bills.
import { pool, withTransaction } from '../config/db.js';
import { repos } from '../repositories/index.js';
import { newId } from '../utils/ids.js';
import { businessDate } from '../utils/dates.js';
import { notFound, conflict } from '../utils/errors.js';

// ---------------- Items ----------------
export async function createItem(input) {
  const item = { ...input, id: newId('item'), dateAdded: businessDate() };
  if (item.stockQuantity === 0 && item.stockStatus === 'Available') item.stockStatus = 'Sold';
  await repos.jewelleryItem.insert(pool, item);
  return repos.jewelleryItem.findById(pool, item.id);
}

export async function updateItem(id, patch) {
  const cur = await repos.jewelleryItem.findById(pool, id);
  if (!cur) throw notFound('Item not found', 'ITEM_NOT_FOUND');
  await repos.jewelleryItem.update(pool, id, patch);
  return repos.jewelleryItem.findById(pool, id);
}

export async function bulkUpdateBarcodes(updates) {
  await withTransaction(async conn => {
    // two-phase so swapping barcodes between items cannot trip the unique key mid-way
    for (const u of updates) await conn.query('UPDATE jewellery_items SET barcode = CONCAT("~tmp~", id) WHERE id = ?', [u.id]);
    for (const u of updates) {
      const [r] = await conn.query('UPDATE jewellery_items SET barcode = ? WHERE id = ?', [u.barcode, u.id]);
      if (r.affectedRows === 0) throw notFound(`Item ${u.id} not found`, 'ITEM_NOT_FOUND');
    }
  });
  return repos.jewelleryItem.list(pool, { where: '`id` IN (?)', params: [updates.map(u => u.id)] });
}

export async function createDesign(input) {
  const design = { ...input, id: newId('pd'), createdAt: new Date().toISOString() };
  await repos.productDesign.insert(pool, design);
  return repos.productDesign.findById(pool, design.id);
}

// ---------------- Customers ----------------
export async function createCustomer(input) {
  const c = { ...input, id: newId('cust'), registrationDate: businessDate(), loyaltyPoints: 0, totalSpent: 0,
    totalPurchases: 0, outstandingBalance: 0, storeCredit: 0, isActive: true };
  await repos.customer.insert(pool, c);
  return repos.customer.findById(pool, c.id);
}

export async function updateCustomer(id, patch) {
  const cur = await repos.customer.findById(pool, id);
  if (!cur) throw notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
  await repos.customer.update(pool, id, patch);
  return repos.customer.findById(pool, id);
}

// ---------------- Metal rates ----------------
export async function updateRate(id, ratePerGram, user) {
  await withTransaction(async conn => {
    const cur = await repos.metalRate.findById(conn, id, { forUpdate: true });
    if (!cur) throw notFound('Rate not found', 'RATE_NOT_FOUND');
    const now = new Date().toISOString();
    await repos.metalRate.update(conn, id, { ratePerGram, updatedAt: now, updatedBy: user.id });
    await repos.metalRateHistory.insert(conn, {
      id: newId('rh'), metalType: cur.metalType, purity: cur.purity, ratePerGram,
      date: businessDate(), updatedBy: user.id,
    });
  });
  return repos.metalRate.findById(pool, id);
}

// ---------------- Notifications ----------------
export async function markNotificationRead(id) {
  const [r] = await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
  if (r.affectedRows === 0) throw notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
  return repos.notification.findById(pool, id);
}

// ---------------- Parked bills (per user) ----------------
export async function parkBill(input, user) {
  const [[{ n }]] = (await pool.query('SELECT COUNT(*) AS n FROM parked_bills WHERE user_id = ?', [user.id]));
  if (n >= 25) throw conflict('Too many parked bills. Resume or discard one first.', 'TOO_MANY_PARKED');
  const bill = {
    id: newId('park'), userId: user.id, customerId: input.customerId || undefined, customerName: input.customerName,
    items: input.items, notes: input.notes, parkedAt: new Date().toISOString(),
  };
  await repos.parkedBill.insert(pool, bill);
  return repos.parkedBill.findById(pool, bill.id);
}

export async function removeParkedBill(id, user) {
  const [r] = await pool.query('DELETE FROM parked_bills WHERE id = ? AND user_id = ?', [id, user.id]);
  if (r.affectedRows === 0) throw notFound('Parked bill not found', 'PARKED_BILL_NOT_FOUND');
}
