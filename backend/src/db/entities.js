/**
 * Entity registry: maps the API's camelCase properties to MySQL columns.
 *
 * Token syntax: `prop[:type][>column]`
 *   types: s=string (default), n=decimal number, i=integer, b=boolean,
 *          j=JSON, dt=datetime (UTC ISO), d=date (YYYY-MM-DD)
 * Column names are derived (camelCase -> snake_case) unless given after `>`.
 *
 * Only identifiers declared here ever reach SQL text; all values are bound parameters.
 */

const snake = s => s.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);

function parse(spec) {
  return spec
    .trim()
    .split(/\s+/)
    .map(token => {
      const [left, colOverride] = token.split('>');
      const [prop, type = 's'] = left.split(':');
      return { prop, type, col: colOverride || snake(prop) };
    });
}

function entity(table, spec) {
  const cols = parse(spec);
  return {
    table,
    cols,
    byProp: Object.fromEntries(cols.map(c => [c.prop, c])),
  };
}

export const entities = {
  storeInfo: entity(
    'store_info',
    'id name tradeName legalName address city state stateCode pincode phone email gstin pan logoUrl returnPolicy thankYouMessage'
  ),
  metalRate: entity('metal_rates', 'id metalType purity ratePerGram:n updatedAt:dt updatedBy'),
  metalRateHistory: entity(
    'metal_rate_history',
    'id metalType purity ratePerGram:n date:d>rate_date updatedBy'
  ),
  productDesign: entity(
    'product_designs',
    'id name category designCode description metalType defaultPurity imageUrl isActive:b createdAt:dt'
  ),
  jewelleryItem: entity(
    'jewellery_items',
    [
      'id productDesignId name sku barcode itemCode category description imageUrl designCode supplierRef variant',
      'costPrice:n mrp:n sellingPrice:n discount:n currentValuation:n',
      'metalType purity grossWeight:n netWeight:n stoneWeight:n diamondCaratWeight:n huid diamondDetails:j',
      'makingChargeType makingChargeValue:n wastageType wastageValue:n stoneValue:n additionalCharges:n',
      'gstRate:n hsnCode stockStatus stockQuantity:i isQuantityBased:b location supplier dateAdded:d isActive:b',
    ].join(' ')
  ),
  customer: entity(
    'customers',
    [
      'id fullName mobile email address city state pincode gstin pan category registrationDate:d',
      'loyaltyPoints:i totalSpent:n totalPurchases:i outstandingBalance:n storeCredit:n lastPurchaseDate:d isActive:b',
    ].join(' ')
  ),
  invoice: entity(
    'invoices',
    [
      'id invoiceNumber date:dt>invoice_date customerId customerName customerMobile customerAddress customerCity',
      'customerState customerStateCode customerGstin customerPan placeOfSupply placeOfSupplyCode isInterState:b',
      'reverseCharge taxMode totalGrossWeight:n totalNetWeight:n subtotal:n discount:n taxableAmount:n',
      'cgst:n sgst:n igst:n totalTax:n additionalCharges:n roundOff:n grandTotal:n',
      'loyaltyPointsRedeemed:i loyaltyRedemptionValue:n amountPayable:n paymentStatus cashierId cashierName notes createdAt:dt',
    ].join(' ')
  ),
  invoiceItem: entity(
    'invoice_items',
    [
      'id invoiceId lineNo:i jewelleryItemId name itemCode barcode category metalType purity hsnCode huid',
      'grossWeight:n netWeight:n stoneWeight:n quantity:i metalRate:n metalValue:n makingCharges:n wastageCharges:n',
      'stoneValue:n additionalCharges:n discount:n taxableValue:n gstRate:n cgst:n sgst:n igst:n totalTax:n totalPrice:n',
    ].join(' ')
  ),
  payment: entity(
    'payments',
    'id invoiceId invoiceNumber customerId customerName method amount:n referenceNumber date:dt>payment_date cashierId cashierName notes'
  ),
  returnRecord: entity(
    'returns',
    [
      'id returnNumber originalInvoiceId originalInvoiceNumber customerId customerName date:dt>return_date',
      'totalRefundAmount:n refundMethod reason notes cashierId cashierName creditNoteId',
    ].join(' ')
  ),
  returnItem: entity(
    'return_items',
    'id returnId jewelleryItemId name itemCode originalPrice:n refundAmount:n reason'
  ),
  creditNote: entity(
    'credit_notes',
    [
      'id creditNoteNumber originalInvoiceId originalInvoiceNumber customerId customerName date:dt>note_date',
      'amount:n reason usedAmount:n remainingAmount:n isActive:b',
    ].join(' ')
  ),
  exchangeRecord: entity(
    'exchange_records',
    [
      'id exchangeNumber originalInvoiceId originalInvoiceNumber customerId customerName date:dt>exchange_date',
      'returnedItems:j newItems:j returnValue:n newPurchaseValue:n priceDifference:n additionalPayment:n storeCredit:n cashierId cashierName',
    ].join(' ')
  ),
  oldGold: entity(
    'old_gold_exchanges',
    [
      'id exchangeNumber customerId customerName date:dt>exchange_date metalType declaredPurity testedPurity',
      'grossWeight:n stoneWeight:n netWeight:n applicableRate:n deductions:n finalExchangeValue:n',
      'againstInvoiceId againstInvoiceNumber settlementType staffNotes cashierId cashierName',
    ].join(' ')
  ),
  ledgerEntry: entity(
    'ledger_entries',
    'id customerId date:dt>entry_date description referenceId referenceType debit:n credit:n balance:n'
  ),
  loyaltyTransaction: entity(
    'loyalty_transactions',
    'id customerId date:dt>txn_date type points:i referenceId referenceType description balance:i'
  ),
  dailyClosing: entity(
    'daily_closings',
    [
      'id date:d>closing_date openingCash:n cashSales:n upiCollections:n cardCollections:n bankTransfers:n',
      'cashRefunds:n cashExpenses:n expectedClosingCash:n actualClosingCash:n cashDifference:n',
      'totalInvoices:i totalReturns:i closingNotes closedBy closedAt:dt status',
    ].join(' ')
  ),
  repairOrder: entity(
    'repair_orders',
    [
      'id repairNumber customerId customerName customerMobile itemDescription repairCategory',
      'receivedDate:d expectedDeliveryDate:d estimatedCharge:n advancePayment:n remainingBalance:n status',
      'staffNotes deliveredDate:d actualCharge:n cashierId cashierName',
    ].join(' ')
  ),
  labelTemplate: entity('label_templates', 'id name type width:n height:n fields:j isDefault:b'),
  notification: entity(
    'notifications',
    'id title message type read:b>is_read date:dt>notified_at link'
  ),
  parkedBill: entity(
    'parked_bills',
    'id userId customerId customerName items:j notes parkedAt:dt'
  ),
};
