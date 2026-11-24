import {
  demoStoreInfo, demoStaff, demoMetalRates, demoRateHistory,
  demoProductDesigns, demoJewelleryItems, demoCustomers,
  demoInvoices, demoReturns, demoCreditNotes, demoOldGoldExchanges,
  demoExchanges, demoLedgerEntries, demoLoyaltyTransactions,
  demoLoyaltyConfig, demoDailyClosings, demoRepairOrders,
  demoLabelTemplates, demoNotifications, demoTaxConfig,
} from '@/data/mock-data';
import { getStorageItem, setStorageItem, clearAllStorage, STORAGE_KEYS } from './storage';
import type {
  StoreInfo, Staff, MetalRate, MetalRateHistory, ProductDesign,
  JewelleryItem, Customer, Invoice, Payment, ReturnRecord,
  CreditNote, OldGoldExchange, ExchangeRecord, LedgerEntry,
  LoyaltyTransaction, LoyaltyConfig, DailyClosing, RepairOrder,
  LabelTemplate, TaxConfig, AppNotification, ParkedBill,
} from '@/types';

// ---- Generic CRUD helpers ----

function getAll<T>(key: string, fallback: T[]): T[] {
  return getStorageItem<T[]>(key, fallback);
}

function saveAll<T>(key: string, data: T[]): void {
  setStorageItem(key, data);
}

// ---- Initialize Demo Data ----

export function initializeDemoData(force: boolean = false): void {
  const initialized = getStorageItem<boolean>(STORAGE_KEYS.DATA_INITIALIZED, false);
  if (initialized && !force) return;

  setStorageItem(STORAGE_KEYS.STORE_INFO, demoStoreInfo);
  setStorageItem(STORAGE_KEYS.STAFF, demoStaff);
  setStorageItem(STORAGE_KEYS.CURRENT_USER, demoStaff[1]); // Priya as default cashier
  setStorageItem(STORAGE_KEYS.METAL_RATES, demoMetalRates);
  setStorageItem(STORAGE_KEYS.RATE_HISTORY, demoRateHistory);
  setStorageItem(STORAGE_KEYS.PRODUCT_DESIGNS, demoProductDesigns);
  setStorageItem(STORAGE_KEYS.JEWELLERY_ITEMS, demoJewelleryItems);
  setStorageItem(STORAGE_KEYS.CUSTOMERS, demoCustomers);
  setStorageItem(STORAGE_KEYS.INVOICES, demoInvoices);
  setStorageItem(STORAGE_KEYS.PAYMENTS, demoInvoices.flatMap(inv => inv.payments));
  setStorageItem(STORAGE_KEYS.RETURNS, demoReturns);
  setStorageItem(STORAGE_KEYS.EXCHANGES, demoExchanges);
  setStorageItem(STORAGE_KEYS.CREDIT_NOTES, demoCreditNotes);
  setStorageItem(STORAGE_KEYS.OLD_GOLD, demoOldGoldExchanges);
  setStorageItem(STORAGE_KEYS.LEDGER_ENTRIES, demoLedgerEntries);
  setStorageItem(STORAGE_KEYS.LOYALTY_TRANSACTIONS, demoLoyaltyTransactions);
  setStorageItem(STORAGE_KEYS.LOYALTY_CONFIG, demoLoyaltyConfig);
  setStorageItem(STORAGE_KEYS.DAILY_CLOSINGS, demoDailyClosings);
  setStorageItem(STORAGE_KEYS.REPAIR_ORDERS, demoRepairOrders);
  setStorageItem(STORAGE_KEYS.LABEL_TEMPLATES, demoLabelTemplates);
  setStorageItem(STORAGE_KEYS.NOTIFICATIONS, demoNotifications);
  setStorageItem(STORAGE_KEYS.TAX_CONFIG, demoTaxConfig);
  setStorageItem(STORAGE_KEYS.PARKED_BILLS, []);
  setStorageItem(STORAGE_KEYS.DATA_INITIALIZED, true);
}

export function resetDemoData(): void {
  clearAllStorage();
  initializeDemoData(true);
}

// ---- Service Functions ----

// Store Info
export function getStoreInfo(): StoreInfo { return getStorageItem(STORAGE_KEYS.STORE_INFO, demoStoreInfo); }
export function saveStoreInfo(info: StoreInfo): void { setStorageItem(STORAGE_KEYS.STORE_INFO, info); }

// Staff
export function getAllStaff(): Staff[] { return getAll(STORAGE_KEYS.STAFF, demoStaff); }
export function getCurrentUser(): Staff { return getStorageItem(STORAGE_KEYS.CURRENT_USER, demoStaff[1]); }
export function setCurrentUser(staff: Staff): void { setStorageItem(STORAGE_KEYS.CURRENT_USER, staff); }

// Metal Rates
export function getMetalRates(): MetalRate[] { return getAll(STORAGE_KEYS.METAL_RATES, demoMetalRates); }
export function saveMetalRates(rates: MetalRate[]): void { saveAll(STORAGE_KEYS.METAL_RATES, rates); }
export function getRateHistory(): MetalRateHistory[] { return getAll(STORAGE_KEYS.RATE_HISTORY, demoRateHistory); }
export function addRateHistory(entry: MetalRateHistory): void {
  const history = getRateHistory();
  history.unshift(entry);
  saveAll(STORAGE_KEYS.RATE_HISTORY, history);
}

// Product Designs
export function getProductDesigns(): ProductDesign[] {
  const stored = getAll(STORAGE_KEYS.PRODUCT_DESIGNS, demoProductDesigns);
  const storedIds = new Set(stored.map(i => i.id));
  const missing = demoProductDesigns.filter(i => !storedIds.has(i.id));
  if (missing.length > 0) {
    const merged = [...stored, ...missing];
    saveAll(STORAGE_KEYS.PRODUCT_DESIGNS, merged);
    return merged;
  }
  return stored;
}
export function saveProductDesigns(designs: ProductDesign[]): void { saveAll(STORAGE_KEYS.PRODUCT_DESIGNS, designs); }
export function addProductDesign(design: ProductDesign): void {
  const designs = getProductDesigns();
  designs.push(design);
  saveProductDesigns(designs);
}

// Jewellery Items
export function getJewelleryItems(): JewelleryItem[] {
  const stored = getAll(STORAGE_KEYS.JEWELLERY_ITEMS, demoJewelleryItems);
  const storedIds = new Set(stored.map(i => i.id));
  const missing = demoJewelleryItems.filter(i => !storedIds.has(i.id));
  if (missing.length > 0) {
    const merged = [...stored, ...missing];
    saveAll(STORAGE_KEYS.JEWELLERY_ITEMS, merged);
    return merged;
  }
  return stored;
}
export function saveJewelleryItems(items: JewelleryItem[]): void { saveAll(STORAGE_KEYS.JEWELLERY_ITEMS, items); }
export function addJewelleryItem(item: JewelleryItem): void {
  const items = getJewelleryItems();
  items.push(item);
  saveJewelleryItems(items);
}
export function updateJewelleryItem(updated: JewelleryItem): void {
  const items = getJewelleryItems();
  const idx = items.findIndex(i => i.id === updated.id);
  if (idx >= 0) { items[idx] = updated; saveJewelleryItems(items); }
}
export function getJewelleryItemByBarcode(barcode: string): JewelleryItem | undefined {
  return getJewelleryItems().find(i => i.barcode === barcode);
}
export function getJewelleryItemById(id: string): JewelleryItem | undefined {
  return getJewelleryItems().find(i => i.id === id);
}

// Customers
export function getCustomers(): Customer[] { return getAll(STORAGE_KEYS.CUSTOMERS, demoCustomers); }
export function saveCustomers(customers: Customer[]): void { saveAll(STORAGE_KEYS.CUSTOMERS, customers); }
export function addCustomer(customer: Customer): void {
  const customers = getCustomers();
  customers.push(customer);
  saveCustomers(customers);
}
export function updateCustomer(updated: Customer): void {
  const customers = getCustomers();
  const idx = customers.findIndex(c => c.id === updated.id);
  if (idx >= 0) { customers[idx] = updated; saveCustomers(customers); }
}
export function getCustomerById(id: string): Customer | undefined {
  return getCustomers().find(c => c.id === id);
}

// Invoices
export function getInvoices(): Invoice[] { return getAll(STORAGE_KEYS.INVOICES, demoInvoices); }
export function saveInvoices(invoices: Invoice[]): void { saveAll(STORAGE_KEYS.INVOICES, invoices); }
export function addInvoice(invoice: Invoice): void {
  const invoices = getInvoices();
  invoices.push(invoice);
  saveInvoices(invoices);
}
export function getInvoiceById(id: string): Invoice | undefined {
  return getInvoices().find(i => i.id === id);
}

// Payments
export function getPayments(): Payment[] { return getAll(STORAGE_KEYS.PAYMENTS, []); }
export function savePayments(payments: Payment[]): void { saveAll(STORAGE_KEYS.PAYMENTS, payments); }
export function addPayments(newPayments: Payment[]): void {
  const payments = getPayments();
  payments.push(...newPayments);
  savePayments(payments);
}

// Returns
export function getReturns(): ReturnRecord[] { return getAll(STORAGE_KEYS.RETURNS, demoReturns); }
export function saveReturns(returns: ReturnRecord[]): void { saveAll(STORAGE_KEYS.RETURNS, returns); }
export function addReturn(ret: ReturnRecord): void {
  const returns = getReturns();
  returns.push(ret);
  saveReturns(returns);
}

// Exchanges
export function getExchanges(): ExchangeRecord[] { return getAll(STORAGE_KEYS.EXCHANGES, []); }
export function addExchange(exchange: ExchangeRecord): void {
  const exchanges = getExchanges();
  exchanges.push(exchange);
  saveAll(STORAGE_KEYS.EXCHANGES, exchanges);
}

// Credit Notes
export function getCreditNotes(): CreditNote[] { return getAll(STORAGE_KEYS.CREDIT_NOTES, demoCreditNotes); }
export function saveCreditNotes(notes: CreditNote[]): void { saveAll(STORAGE_KEYS.CREDIT_NOTES, notes); }
export function addCreditNote(note: CreditNote): void {
  const notes = getCreditNotes();
  notes.push(note);
  saveCreditNotes(notes);
}

// Old Gold
export function getOldGoldExchanges(): OldGoldExchange[] { return getAll(STORAGE_KEYS.OLD_GOLD, demoOldGoldExchanges); }
export function addOldGoldExchange(exchange: OldGoldExchange): void {
  const exchanges = getOldGoldExchanges();
  exchanges.push(exchange);
  saveAll(STORAGE_KEYS.OLD_GOLD, exchanges);
}

// Ledger
export function getLedgerEntries(): LedgerEntry[] { return getAll(STORAGE_KEYS.LEDGER_ENTRIES, demoLedgerEntries); }
export function addLedgerEntry(entry: LedgerEntry): void {
  const entries = getLedgerEntries();
  entries.push(entry);
  saveAll(STORAGE_KEYS.LEDGER_ENTRIES, entries);
}
export function getCustomerLedger(customerId: string): LedgerEntry[] {
  return getLedgerEntries().filter(e => e.customerId === customerId);
}

// Loyalty
export function getLoyaltyTransactions(): LoyaltyTransaction[] { return getAll(STORAGE_KEYS.LOYALTY_TRANSACTIONS, demoLoyaltyTransactions); }
export function addLoyaltyTransaction(tx: LoyaltyTransaction): void {
  const txns = getLoyaltyTransactions();
  txns.push(tx);
  saveAll(STORAGE_KEYS.LOYALTY_TRANSACTIONS, txns);
}
export function getLoyaltyConfig(): LoyaltyConfig { return getStorageItem(STORAGE_KEYS.LOYALTY_CONFIG, demoLoyaltyConfig); }
export function saveLoyaltyConfig(config: LoyaltyConfig): void { setStorageItem(STORAGE_KEYS.LOYALTY_CONFIG, config); }

// Daily Closings
export function getDailyClosings(): DailyClosing[] { return getAll(STORAGE_KEYS.DAILY_CLOSINGS, demoDailyClosings); }
export function addDailyClosing(closing: DailyClosing): void {
  const closings = getDailyClosings();
  closings.push(closing);
  saveAll(STORAGE_KEYS.DAILY_CLOSINGS, closings);
}

// Repair Orders
export function getRepairOrders(): RepairOrder[] { return getAll(STORAGE_KEYS.REPAIR_ORDERS, demoRepairOrders); }
export function saveRepairOrders(orders: RepairOrder[]): void { saveAll(STORAGE_KEYS.REPAIR_ORDERS, orders); }
export function addRepairOrder(order: RepairOrder): void {
  const orders = getRepairOrders();
  orders.push(order);
  saveRepairOrders(orders);
}
export function updateRepairOrder(updated: RepairOrder): void {
  const orders = getRepairOrders();
  const idx = orders.findIndex(o => o.id === updated.id);
  if (idx >= 0) { orders[idx] = updated; saveRepairOrders(orders); }
}

// Parked Bills
export function getParkedBills(): ParkedBill[] { return getAll(STORAGE_KEYS.PARKED_BILLS, []); }
export function saveParkedBills(bills: ParkedBill[]): void { saveAll(STORAGE_KEYS.PARKED_BILLS, bills); }
export function addParkedBill(bill: ParkedBill): void {
  const bills = getParkedBills();
  bills.push(bill);
  saveParkedBills(bills);
}
export function removeParkedBill(id: string): void {
  const bills = getParkedBills().filter(b => b.id !== id);
  saveParkedBills(bills);
}

// Label Templates
export function getLabelTemplates(): LabelTemplate[] { return getAll(STORAGE_KEYS.LABEL_TEMPLATES, demoLabelTemplates); }
export function saveLabelTemplates(templates: LabelTemplate[]): void { saveAll(STORAGE_KEYS.LABEL_TEMPLATES, templates); }

// Notifications
export function getNotifications(): AppNotification[] { return getAll(STORAGE_KEYS.NOTIFICATIONS, demoNotifications); }
export function saveNotifications(notifications: AppNotification[]): void { saveAll(STORAGE_KEYS.NOTIFICATIONS, notifications); }
export function markNotificationRead(id: string): void {
  const notifications = getNotifications();
  const n = notifications.find(n => n.id === id);
  if (n) { n.read = true; saveNotifications(notifications); }
}

// Tax Config
export function getTaxConfig(): TaxConfig { return getStorageItem(STORAGE_KEYS.TAX_CONFIG, demoTaxConfig); }
export function saveTaxConfig(config: TaxConfig): void { setStorageItem(STORAGE_KEYS.TAX_CONFIG, config); }
