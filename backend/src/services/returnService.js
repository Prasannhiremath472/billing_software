import { pool, withTransaction } from '../config/db.js';
import { repos, nextSequence } from '../repositories/index.js';
import { newId, round2 } from '../utils/ids.js';
import { yymm } from '../utils/dates.js';
import { notFound, unprocessable } from '../utils/errors.js';

/**
 * Process a return against an invoice: records the return, restocks the piece(s),
 * and (for Store Credit refunds) issues a credit note and tops up the customer's store credit.
 */
export async function createReturn(input, user) {
  const returnId = await withTransaction(async conn => {
    const invoice = await repos.invoice.findById(conn, input.originalInvoiceId, { forUpdate: true });
    if (!invoice) throw notFound('Original invoice not found', 'INVOICE_NOT_FOUND');

    const invItems = await repos.invoiceItem.list(conn, { where: '`invoice_id` = ?', params: [invoice.id] });
    const ids = input.items.map(i => i.jewelleryItemId);
    if (new Set(ids).size !== ids.length) throw unprocessable('Duplicate item in return', 'DUPLICATE_LINE');

    // Amounts already refunded for these pieces on this invoice
    const [refunded] = await conn.query(
      `SELECT ri.jewellery_item_id AS itemId, SUM(ri.refund_amount) AS amt
         FROM return_items ri JOIN returns r ON r.id = ri.return_id
        WHERE r.original_invoice_id = ? AND ri.jewellery_item_id IN (?)
        GROUP BY ri.jewellery_item_id`,
      [invoice.id, ids]
    );
    const refundedMap = new Map(refunded.map(r => [r.itemId, Number(r.amt)]));

    let total = 0;
    const returnItems = [];
    for (const line of input.items) {
      const invItem = invItems.find(i => i.jewelleryItemId === line.jewelleryItemId);
      if (!invItem) throw unprocessable('Item was not sold on this invoice', 'ITEM_NOT_ON_INVOICE');
      const remaining = round2(invItem.totalPrice - (refundedMap.get(line.jewelleryItemId) || 0));
      if (remaining <= 0) throw unprocessable(`"${invItem.name}" has already been fully refunded`, 'ALREADY_RETURNED');
      if (line.refundAmount > remaining) {
        throw unprocessable(`Refund for "${invItem.name}" cannot exceed ₹${remaining}`, 'REFUND_TOO_HIGH');
      }
      if (line.quantity > invItem.quantity) throw unprocessable('Return quantity exceeds quantity sold', 'INVALID_QUANTITY');
      total = round2(total + line.refundAmount);
      returnItems.push({
        id: newId('ri'), jewelleryItemId: invItem.jewelleryItemId, name: invItem.name, itemCode: invItem.itemCode,
        originalPrice: invItem.totalPrice, refundAmount: round2(line.refundAmount), reason: input.reason, qty: line.quantity,
      });
    }

    const isStoreCredit = input.refundMethod === 'Store Credit';
    if (isStoreCredit && !invoice.customerId) {
      throw unprocessable('Store credit can only be issued to a registered customer', 'CUSTOMER_REQUIRED');
    }

    const now = new Date().toISOString();
    const tag = yymm();
    const returnNumber = `RET-${tag}-${String(await nextSequence(conn, `RET-${tag}`)).padStart(4, '0')}`;
    const id = newId('ret');

    let creditNoteId;
    if (isStoreCredit) {
      creditNoteId = newId('cn');
      await repos.creditNote.insert(conn, {
        id: creditNoteId, creditNoteNumber: `CN-${tag}-${String(await nextSequence(conn, `CN-${tag}`)).padStart(4, '0')}`, originalInvoiceId: invoice.id,
        originalInvoiceNumber: invoice.invoiceNumber, customerId: invoice.customerId, customerName: invoice.customerName,
        date: now, amount: total, reason: `Return voucher against ${invoice.invoiceNumber}`,
        usedAmount: 0, remainingAmount: total, isActive: true,
      });
    }

    await repos.returnRecord.insert(conn, {
      id, returnNumber, originalInvoiceId: invoice.id, originalInvoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId, customerName: invoice.customerName, date: now,
      totalRefundAmount: total, refundMethod: input.refundMethod, reason: input.reason, notes: input.notes,
      cashierId: user.id, cashierName: user.name, creditNoteId,
    });
    for (const { qty, ...ri } of returnItems) await repos.returnItem.insert(conn, { ...ri, returnId: id });

    // restock
    const stock = await repos.jewelleryItem.list(conn, { where: '`id` IN (?)', params: [ids], orderBy: '`id` ASC', forUpdate: true });
    for (const s of stock) {
      const qty = returnItems.find(r => r.jewelleryItemId === s.id).qty;
      await repos.jewelleryItem.update(conn, s.id, { stockStatus: 'Available', stockQuantity: s.stockQuantity + qty });
    }

    if (isStoreCredit) {
      const customer = await repos.customer.findById(conn, invoice.customerId, { forUpdate: true });
      await repos.customer.update(conn, customer.id, { storeCredit: round2(customer.storeCredit + total) });
    }
    return id;
  });
  return getReturn(pool, returnId);
}

export async function getReturn(db, id) {
  const rec = await repos.returnRecord.findById(db, id);
  if (!rec) return undefined;
  const items = await repos.returnItem.list(db, { where: '`return_id` = ?', params: [id] });
  items.forEach(i => delete i.returnId);
  return { ...rec, items };
}

export async function hydrateReturns(db, returns) {
  if (returns.length === 0) return returns;
  const items = await repos.returnItem.list(db, { where: '`return_id` IN (?)', params: [returns.map(r => r.id)] });
  const by = new Map();
  for (const { returnId, ...rest } of items) (by.get(returnId) ?? by.set(returnId, []).get(returnId)).push(rest);
  return returns.map(r => ({ ...r, items: by.get(r.id) ?? [] }));
}
