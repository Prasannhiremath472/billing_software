import { pool, withTransaction } from '../config/db.js';
import { repos, nextSequence, financialYear } from '../repositories/index.js';
import { getSetting, getStoreInfo } from './settingsService.js';
import { newId, round2, round3 } from '../utils/ids.js';
import { businessDate } from '../utils/dates.js';
import { notFound, unprocessable, conflict, forbidden } from '../utils/errors.js';
import { GST_STATES } from '../utils/states.js';

const PAISE_TOLERANCE = 1; // same ₹1 tolerance the checkout UI applies to split payments

function hsnFor(item) {
  if (item.hsnCode) return item.hsnCode;
  if (['1 Gram Gold', 'Imitation'].includes(item.metalType) ||
      ['1 Gram Gold Jewellery', 'Imitation Jewellery'].includes(item.category)) return '7117';
  return item.category === 'Coins' ? '7118' : '7113';
}

/** Per-unit price, mirroring the POS price calculation (selling price, per-unit discount, optional override). */
function priceUnit(item, gstRate, itemDiscount, override) {
  const discount = round2(itemDiscount);
  if (override !== undefined) {
    const unitTotal = round2(override);
    const taxable = round2(unitTotal / (1 + gstRate / 100));
    return { discount, taxable, subtotal: round2(taxable + discount) };
  }
  const subtotal = round2(item.sellingPrice || item.mrp || 0);
  if (discount > subtotal) {
    throw unprocessable(`Discount exceeds the price of "${item.name}"`, 'DISCOUNT_TOO_HIGH');
  }
  return { discount, taxable: round2(subtotal - discount), subtotal };
}

/** Splits `amount` across weights so that the parts add up to exactly `amount`. */
function allocate(amount, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (amount <= 0 || total <= 0) return weights.map(() => 0);
  let remaining = amount;
  return weights.map((w, i) => {
    if (i === weights.length - 1) return round2(remaining);
    const share = round2((amount * w) / total);
    remaining = round2(remaining - share);
    return share;
  });
}

export async function getInvoiceById(db, id) {
  const inv = await repos.invoice.findById(db, id);
  if (!inv) return undefined;
  const [items, payments] = await Promise.all([
    repos.invoiceItem.list(db, { where: '`invoice_id` = ?', params: [id], orderBy: '`line_no` ASC' }),
    repos.payment.list(db, { where: '`invoice_id` = ?', params: [id], orderBy: '`payment_date` ASC, `id` ASC' }),
  ]);
  items.forEach(i => { delete i.invoiceId; delete i.lineNo; });
  return { ...inv, items, payments };
}

/** Attach items + payments to many invoices with two queries (no N+1). */
export async function hydrateInvoices(db, invoices) {
  if (invoices.length === 0) return invoices;
  const ids = invoices.map(i => i.id);
  const [items, payments] = await Promise.all([
    repos.invoiceItem.list(db, { where: '`invoice_id` IN (?)', params: [ids], orderBy: '`invoice_id` ASC, `line_no` ASC' }),
    repos.payment.list(db, { where: '`invoice_id` IN (?)', params: [ids], orderBy: '`payment_date` ASC, `id` ASC' }),
  ]);
  const itemsBy = new Map();
  const paysBy = new Map();
  for (const it of items) {
    const { invoiceId, lineNo, ...rest } = it;
    (itemsBy.get(invoiceId) ?? itemsBy.set(invoiceId, []).get(invoiceId)).push(rest);
  }
  for (const p of payments) (paysBy.get(p.invoiceId) ?? paysBy.set(p.invoiceId, []).get(p.invoiceId)).push(p);
  return invoices.map(inv => ({ ...inv, items: itemsBy.get(inv.id) ?? [], payments: paysBy.get(inv.id) ?? [] }));
}

/**
 * Checkout: the single authoritative place where an invoice is priced and stock/ledger/loyalty are updated.
 * Prices are always recomputed from server-side item data - client totals are never trusted.
 */
export async function createInvoice(input, user, idempotencyKey) {
  if (idempotencyKey) {
    const [dup] = await pool.query('SELECT id FROM invoices WHERE cashier_id = ? AND idempotency_key = ?', [user.id, idempotencyKey]);
    if (dup[0]) return { ...(await buildResult(pool, dup[0].id)), replayed: true };
  }

  const newInvoiceId = await withTransaction(async conn => {
    const now = new Date();
    const store = await getStoreInfo(conn);
    const taxConfig = await getSetting(conn, 'tax');
    const loyaltyCfg = await getSetting(conn, 'loyalty');
    if (!GST_STATES[input.placeOfSupplyCode]) throw unprocessable('Unknown place of supply (state code)', 'INVALID_STATE_CODE');
    const isInterState = input.placeOfSupplyCode !== (store.stateCode || '33');

    // ---- lock & validate stock (ordered by id to avoid deadlocks between concurrent checkouts) ----
    const ids = input.items.map(i => i.jewelleryItemId);
    if (new Set(ids).size !== ids.length) {
      throw unprocessable('The same item appears more than once in the bill', 'DUPLICATE_LINE');
    }
    const dbItems = await repos.jewelleryItem.list(conn, { where: '`id` IN (?)', params: [ids], orderBy: '`id` ASC', forUpdate: true });
    const itemMap = new Map(dbItems.map(i => [i.id, i]));

    // ---- customer (locked) ----
    let customer = null;
    if (input.customerId) {
      customer = await repos.customer.findById(conn, input.customerId, { forUpdate: true });
      if (!customer || !customer.isActive) throw notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    // ---- price each line ----
    const lines = input.items.map((line, idx) => {
      const item = itemMap.get(line.jewelleryItemId);
      if (!item || !item.isActive) throw notFound(`Item ${line.jewelleryItemId} not found`, 'ITEM_NOT_FOUND');
      if (item.isQuantityBased) {
        if (item.stockQuantity < line.quantity) {
          throw conflict(`Only ${item.stockQuantity} of "${item.name}" left in stock`, 'INSUFFICIENT_STOCK');
        }
      } else {
        if (line.quantity !== 1) throw unprocessable(`"${item.name}" is a single piece; quantity must be 1`, 'INVALID_QUANTITY');
        if (item.stockStatus !== 'Available') {
          throw conflict(`"${item.name}" is not available (status: ${item.stockStatus})`, 'ITEM_NOT_AVAILABLE');
        }
      }
      if (line.unitPriceOverride !== undefined && user.role === 'Cashier' && item.costPrice && line.unitPriceOverride < item.costPrice) {
        throw forbidden(`Price for "${item.name}" cannot be set below cost without manager approval`, 'PRICE_BELOW_COST');
      }
      const gstRate = item.gstRate || taxConfig.defaultGstRate || 3;
      const unit = priceUnit(item, gstRate, line.itemDiscount, line.unitPriceOverride);
      return {
        idx, item, gstRate, qty: line.quantity, unit,
        lineSubtotal: round2(unit.subtotal * line.quantity),
        lineItemDiscount: round2(unit.discount * line.quantity),
        lineTaxable: round2(unit.taxable * line.quantity),
      };
    });

    // ---- bill-level discount reduces taxable value proportionally (GST is charged on the discounted value) ----
    const overall = round2(input.overallDiscount);
    const taxableBeforeOverall = round2(lines.reduce((s, l) => s + l.lineTaxable, 0));
    if (overall > taxableBeforeOverall) throw unprocessable('Bill discount exceeds the bill value', 'DISCOUNT_TOO_HIGH');
    const overallShares = allocate(overall, lines.map(l => l.lineTaxable));

    let cgstT = 0, sgstT = 0, igstT = 0, taxableT = 0, subtotalT = 0, itemDiscT = 0, grossW = 0, netW = 0;
    for (const [i, l] of lines.entries()) {
      l.taxable = round2(l.lineTaxable - overallShares[i]);
      const tax = round2((l.taxable * l.gstRate) / 100);
      if (isInterState) { l.igst = tax; l.cgst = 0; l.sgst = 0; }
      else { l.cgst = round2(tax / 2); l.sgst = round2(tax - l.cgst); l.igst = 0; }
      l.totalTax = round2(l.cgst + l.sgst + l.igst);
      l.totalPrice = round2(l.taxable + l.totalTax);
      cgstT += l.cgst; sgstT += l.sgst; igstT += l.igst; taxableT += l.taxable;
      subtotalT += l.lineSubtotal; itemDiscT += l.lineItemDiscount;
      grossW += (l.item.grossWeight || 0) * l.qty; netW += (l.item.netWeight || 0) * l.qty;
    }
    cgstT = round2(cgstT); sgstT = round2(sgstT); igstT = round2(igstT);
    taxableT = round2(taxableT); subtotalT = round2(subtotalT);
    const totalTax = round2(cgstT + sgstT + igstT);
    const grandTotal = round2(taxableT + totalTax);
    const totalDiscount = round2(itemDiscT + overall);

    // ---- loyalty redemption ----
    const points = input.loyaltyPointsToRedeem;
    let redemptionValue = 0;
    if (points > 0) {
      if (!customer) throw unprocessable('Select a customer to redeem loyalty points', 'CUSTOMER_REQUIRED');
      if (points > customer.loyaltyPoints) throw unprocessable('Not enough loyalty points', 'INSUFFICIENT_POINTS');
      redemptionValue = round2(points * (loyaltyCfg.pointValue || 0));
      if (redemptionValue > grandTotal) throw unprocessable('Redemption value exceeds the bill total', 'REDEMPTION_TOO_HIGH');
    }
    const amountPayable = round2(grandTotal - redemptionValue);

    // ---- payments ----
    const payInputs = input.payments.filter(p => p.amount > 0);
    const totalPaid = round2(payInputs.reduce((s, p) => s + p.amount, 0));
    if (totalPaid > amountPayable + PAISE_TOLERANCE) {
      throw unprocessable(`Payments (${totalPaid}) exceed the amount payable (${amountPayable})`, 'OVERPAYMENT');
    }
    let balanceDue = round2(Math.max(0, amountPayable - totalPaid));
    if (balanceDue > 0 && balanceDue <= PAISE_TOLERANCE) balanceDue = 0; // rounding difference
    if (balanceDue > 0) {
      if (!input.allowCredit) {
        throw unprocessable(`Collected amount is ₹${balanceDue} short of the payable amount`, 'INSUFFICIENT_PAYMENT');
      }
      if (!customer) throw unprocessable('Select a customer to bill on credit', 'CUSTOMER_REQUIRED');
    }
    const creditPaid = round2(payInputs.filter(p => p.method === 'Store Credit').reduce((s, p) => s + p.amount, 0));
    if (creditPaid > 0) {
      if (!customer) throw unprocessable('Select a customer to use store credit', 'CUSTOMER_REQUIRED');
      if (creditPaid > customer.storeCredit) throw unprocessable('Not enough store credit available', 'INSUFFICIENT_STORE_CREDIT');
    }

    // ---- persist ----
    const fy = financialYear(now);
    const serial = await nextSequence(conn, `INV-${fy}`);
    const invoiceNumber = `SLJ/${fy}/${String(serial).padStart(4, '0')}`;
    const invoiceId = newId('inv');
    const nowIso = now.toISOString();
    const customerState = GST_STATES[input.placeOfSupplyCode];

    await repos.invoice.insert(conn, {
      id: invoiceId, invoiceNumber, date: nowIso,
      customerId: customer?.id, customerName: customer?.fullName || 'Walk-in Customer',
      customerMobile: customer?.mobile, customerAddress: customer?.address, customerCity: customer?.city,
      customerState, customerStateCode: input.placeOfSupplyCode,
      customerGstin: input.customerGstin || customer?.gstin, customerPan: customer?.pan,
      placeOfSupply: `${customerState} (${input.placeOfSupplyCode})`, placeOfSupplyCode: input.placeOfSupplyCode,
      isInterState, reverseCharge: 'No', taxMode: input.taxMode,
      totalGrossWeight: round3(grossW), totalNetWeight: round3(netW),
      subtotal: subtotalT, discount: totalDiscount, taxableAmount: taxableT,
      cgst: cgstT, sgst: sgstT, igst: igstT, totalTax, additionalCharges: 0, roundOff: 0,
      grandTotal, loyaltyPointsRedeemed: points, loyaltyRedemptionValue: redemptionValue, amountPayable,
      paymentStatus: balanceDue === 0 ? 'Paid' : totalPaid === 0 ? 'Pending' : 'Partial',
      cashierId: user.id, cashierName: user.name,
      notes: input.notes || (balanceDue > 0 ? `Pending Balance: ₹${balanceDue}` : undefined),
      createdAt: nowIso,
    });
    if (idempotencyKey) {
      await conn.query('UPDATE invoices SET idempotency_key = ? WHERE id = ?', [idempotencyKey.slice(0, 64), invoiceId]);
    }

    for (const l of lines) {
      const p = l.item;
      await repos.invoiceItem.insert(conn, {
        id: newId('ii'), invoiceId, lineNo: l.idx + 1, jewelleryItemId: p.id,
        name: p.name, itemCode: p.itemCode, barcode: p.barcode, category: p.category,
        metalType: p.metalType, purity: p.purity, hsnCode: hsnFor(p), huid: p.huid,
        grossWeight: p.grossWeight, netWeight: p.netWeight, stoneWeight: p.stoneWeight, quantity: l.qty,
        metalRate: 0, metalValue: 0, makingCharges: 0, wastageCharges: 0,
        stoneValue: p.stoneValue || 0, additionalCharges: p.additionalCharges || 0,
        discount: l.unit.discount, taxableValue: l.taxable, gstRate: l.gstRate,
        cgst: l.cgst, sgst: l.sgst, igst: l.igst, totalTax: l.totalTax, totalPrice: l.totalPrice,
      });

      // stock movement
      if (p.isQuantityBased) {
        const remaining = p.stockQuantity - l.qty;
        await repos.jewelleryItem.update(conn, p.id, { stockQuantity: remaining, stockStatus: remaining === 0 ? 'Sold' : 'Available' });
      } else {
        await repos.jewelleryItem.update(conn, p.id, { stockQuantity: 0, stockStatus: 'Sold' });
      }
    }

    for (const pay of payInputs) {
      await repos.payment.insert(conn, {
        id: newId('pay'), invoiceId, invoiceNumber, customerId: customer?.id,
        customerName: customer?.fullName || 'Walk-in Customer', method: pay.method, amount: round2(pay.amount),
        referenceNumber: pay.referenceNumber || (pay.method === 'Cash' ? undefined : `${pay.method}-REF`),
        date: nowIso, cashierId: user.id, cashierName: user.name,
      });
    }

    // ---- customer stats, ledger, loyalty ----
    if (customer) {
      const pointsEarned = Math.floor(grandTotal * (loyaltyCfg.pointsPerRupee || 0.01));
      const outstanding = round2(customer.outstandingBalance + balanceDue);
      const finalPoints = Math.max(0, customer.loyaltyPoints - points + pointsEarned);
      await repos.customer.update(conn, customer.id, {
        totalSpent: round2(customer.totalSpent + grandTotal),
        totalPurchases: customer.totalPurchases + 1,
        outstandingBalance: outstanding,
        storeCredit: round2(customer.storeCredit - creditPaid),
        lastPurchaseDate: businessDate(now),
        loyaltyPoints: finalPoints,
        gstin: input.customerGstin || customer.gstin,
      });
      if (balanceDue > 0) {
        await repos.ledgerEntry.insert(conn, {
          id: newId('le'), customerId: customer.id, date: nowIso,
          description: `Unpaid balance on Tax Invoice ${invoiceNumber}`,
          referenceId: invoiceId, referenceType: 'Invoice', debit: balanceDue, credit: 0, balance: outstanding,
        });
      }
      if (points > 0) {
        await repos.loyaltyTransaction.insert(conn, {
          id: newId('lt'), customerId: customer.id, date: nowIso, type: 'Redeemed', points,
          referenceId: invoiceId, referenceType: 'Invoice', description: `Redeemed on invoice ${invoiceNumber}`,
          balance: customer.loyaltyPoints - points,
        });
      }
      if (pointsEarned > 0) {
        await repos.loyaltyTransaction.insert(conn, {
          id: newId('lt'), customerId: customer.id, date: nowIso, type: 'Earned', points: pointsEarned,
          referenceId: invoiceId, referenceType: 'Invoice', description: `Points on invoice ${invoiceNumber}`,
          balance: finalPoints,
        });
      }
    }

    return invoiceId;
  });

  return buildResult(pool, newInvoiceId);
}

/** Invoice plus every record the checkout changed, so the client can refresh without guessing. */
async function buildResult(db, invoiceId) {
  const invoice = await getInvoiceById(db, invoiceId);
  const itemIds = invoice.items.map(i => i.jewelleryItemId);
  const [items, customer, ledgerEntries, loyaltyTransactions] = await Promise.all([
    repos.jewelleryItem.list(db, { where: '`id` IN (?)', params: [itemIds] }),
    invoice.customerId ? repos.customer.findById(db, invoice.customerId) : undefined,
    repos.ledgerEntry.list(db, { where: '`reference_id` = ?', params: [invoiceId] }),
    repos.loyaltyTransaction.list(db, { where: '`reference_id` = ?', params: [invoiceId] }),
  ]);
  return { invoice, items, customer: customer ?? null, ledgerEntries, loyaltyTransactions };
}
