// Old-gold exchange, daily closing and repair orders.
import { pool, withTransaction } from '../config/db.js';
import { repos, nextSequence } from '../repositories/index.js';
import { newId, round2 } from '../utils/ids.js';
import { businessDate, businessDayRangeUtc, yymm } from '../utils/dates.js';
import { conflict, notFound, unprocessable } from '../utils/errors.js';

// ---------------- Old gold exchange ----------------
export async function createOldGold(input, user) {
  const id = await withTransaction(async conn => {
    let customer = null;
    if (input.customerId) {
      customer = await repos.customer.findById(conn, input.customerId, { forUpdate: true });
      if (!customer) throw notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
    }
    if (input.settlementType === 'Store Credit' && !customer) {
      throw unprocessable('Store credit settlement needs a registered customer', 'CUSTOMER_REQUIRED');
    }
    if (input.netWeight > input.grossWeight - input.stoneWeight + 0.0005) {
      throw unprocessable('Net weight cannot exceed gross weight minus stone weight', 'INVALID_WEIGHT');
    }

    // Use the shop's recorded rate for this metal/purity when one exists; otherwise trust the entered rate.
    const [rate] = await repos.metalRate.list(conn, {
      where: '`metal_type` = ? AND `purity` = ?', params: [input.metalType, input.testedPurity], limit: 1,
    });
    const applicableRate = rate?.ratePerGram ?? input.applicableRate;
    const finalExchangeValue = Math.max(0, Math.round(input.netWeight * applicableRate) - input.deductions);

    let against;
    if (input.againstInvoiceId) {
      against = await repos.invoice.findById(conn, input.againstInvoiceId);
      if (!against) throw notFound('Invoice not found', 'INVOICE_NOT_FOUND');
    }

    const tag = yymm();
    const exchangeNumber = `OG-${tag}-${String(await nextSequence(conn, `OG-${tag}`)).padStart(4, '0')}`;
    const rec = {
      id: newId('og'), exchangeNumber, customerId: customer?.id, customerName: input.customerName,
      date: new Date().toISOString(), metalType: input.metalType, declaredPurity: input.declaredPurity,
      testedPurity: input.testedPurity, grossWeight: input.grossWeight, stoneWeight: input.stoneWeight,
      netWeight: input.netWeight, applicableRate, deductions: input.deductions, finalExchangeValue,
      againstInvoiceId: against?.id, againstInvoiceNumber: against?.invoiceNumber,
      settlementType: input.settlementType, staffNotes: input.staffNotes, cashierId: user.id, cashierName: user.name,
    };
    await repos.oldGold.insert(conn, rec);
    if (input.settlementType === 'Store Credit') {
      await repos.customer.update(conn, customer.id, { storeCredit: round2(customer.storeCredit + finalExchangeValue) });
    }
    return rec.id;
  });
  return repos.oldGold.findById(pool, id);
}

// ---------------- Daily closing ----------------
/** Cash/digital collections for one business day, computed from recorded payments & returns. */
export async function closingSummary(db, ymd) {
  const [from, to] = businessDayRangeUtc(ymd);
  const [pay] = await db.query(
    'SELECT method, SUM(amount) AS amt FROM payments WHERE payment_date >= ? AND payment_date < ? GROUP BY method',
    [from, to]
  );
  const by = Object.fromEntries(pay.map(r => [r.method, Number(r.amt)]));
  const [[inv]] = await db.query('SELECT COUNT(*) AS n FROM invoices WHERE invoice_date >= ? AND invoice_date < ?', [from, to]);
  const [[ret]] = await db.query(
    "SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN refund_method = 'Cash' THEN total_refund_amount END), 0) AS cash FROM returns WHERE return_date >= ? AND return_date < ?",
    [from, to]
  );
  return {
    date: ymd,
    cashSales: round2(by.Cash || 0),
    upiCollections: round2(by.UPI || 0),
    cardCollections: round2(by.Card || 0),
    bankTransfers: round2(by['Bank Transfer'] || 0),
    cashRefunds: round2(Number(ret.cash)),
    totalInvoices: Number(inv.n),
    totalReturns: Number(ret.n),
  };
}

export async function createDailyClosing(input, user) {
  const date = businessDate();
  const id = await withTransaction(async conn => {
    // serialise concurrent closings for the same day
    await conn.query('INSERT IGNORE INTO document_sequences (seq_key, current_value) VALUES (?, 0)', [`CLOSE-${date}`]);
    await conn.query('SELECT seq_key FROM document_sequences WHERE seq_key = ? FOR UPDATE', [`CLOSE-${date}`]);
    const existing = await repos.dailyClosing.list(conn, { where: '`closing_date` = ? AND `status` = ?', params: [date, 'Closed'], limit: 1 });
    if (existing[0]) throw conflict(`The register for ${date} is already closed`, 'ALREADY_CLOSED');

    const s = await closingSummary(conn, date);
    const expected = round2(input.openingCash + s.cashSales - s.cashRefunds - input.cashExpenses);
    const rec = {
      id: newId('dc'), date, openingCash: input.openingCash,
      cashSales: s.cashSales, upiCollections: s.upiCollections, cardCollections: s.cardCollections, bankTransfers: s.bankTransfers,
      cashRefunds: s.cashRefunds, cashExpenses: input.cashExpenses,
      expectedClosingCash: expected, actualClosingCash: input.actualClosingCash,
      cashDifference: round2(input.actualClosingCash - expected),
      totalInvoices: s.totalInvoices, totalReturns: s.totalReturns, closingNotes: input.closingNotes,
      closedBy: user.name, closedAt: new Date().toISOString(), status: 'Closed',
    };
    await repos.dailyClosing.insert(conn, rec);
    return rec.id;
  });
  return repos.dailyClosing.findById(pool, id);
}

// ---------------- Repair orders ----------------
export async function createRepair(input, user) {
  const id = await withTransaction(async conn => {
    if (input.advancePayment > input.estimatedCharge) {
      throw unprocessable('Advance cannot exceed the estimated charge', 'ADVANCE_TOO_HIGH');
    }
    if (input.customerId && !(await repos.customer.findById(conn, input.customerId))) {
      throw notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
    }
    const tag = yymm();
    const repairNumber = `REP-${tag}-${String(await nextSequence(conn, `REP-${tag}`)).padStart(4, '0')}`;
    const rec = {
      id: newId('rep'), repairNumber, customerId: input.customerId || undefined, customerName: input.customerName,
      customerMobile: input.customerMobile, itemDescription: input.itemDescription, repairCategory: input.repairCategory,
      receivedDate: businessDate(), expectedDeliveryDate: input.expectedDeliveryDate,
      estimatedCharge: input.estimatedCharge, advancePayment: input.advancePayment,
      remainingBalance: round2(input.estimatedCharge - input.advancePayment), status: 'Received',
      staffNotes: input.staffNotes, cashierId: user.id, cashierName: user.name,
    };
    await repos.repairOrder.insert(conn, rec);
    return rec.id;
  });
  return repos.repairOrder.findById(pool, id);
}

export async function updateRepair(id, patch) {
  await withTransaction(async conn => {
    const cur = await repos.repairOrder.findById(conn, id, { forUpdate: true });
    if (!cur) throw notFound('Repair order not found', 'REPAIR_NOT_FOUND');
    if (cur.status === 'Delivered') throw conflict('A delivered repair order can no longer be changed', 'REPAIR_CLOSED');

    const next = { ...patch };
    const estimated = patch.estimatedCharge ?? cur.estimatedCharge;
    const advance = patch.advancePayment ?? cur.advancePayment;
    if (advance > estimated) throw unprocessable('Advance cannot exceed the estimated charge', 'ADVANCE_TOO_HIGH');
    next.remainingBalance = round2(Math.max(0, (patch.actualCharge ?? cur.actualCharge ?? estimated) - advance));
    if (patch.status === 'Delivered') next.deliveredDate = businessDate();
    await repos.repairOrder.update(conn, id, next);
  });
  return repos.repairOrder.findById(pool, id);
}
