// Data layer backed by the JewelSync REST API.
//
// Reads are synchronous against an in-memory cache that `loadAllData()` fills after sign-in
// (this keeps every page's rendering code unchanged). All writes go to the server first and the cache is
// updated from the server's response, so the server stays the single source of truth.

import { api, apiListAll } from './api-client';
import type {
  StoreInfo, Staff, MetalRate, MetalRateHistory, ProductDesign,
  JewelleryItem, Customer, Invoice, Payment, ReturnRecord,
  CreditNote, OldGoldExchange, ExchangeRecord, LedgerEntry,
  LoyaltyTransaction, LoyaltyConfig, DailyClosing, RepairOrder,
  LabelTemplate, TaxConfig, AppNotification, ParkedBill,
  PaymentMethod, ReturnReason,
} from '@/types';

// ---- Cache ----

interface Cache {
  storeInfo: StoreInfo | null;
  staff: Staff[];
  metalRates: MetalRate[];
  rateHistory: MetalRateHistory[];
  productDesigns: ProductDesign[];
  jewelleryItems: JewelleryItem[];
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  returns: ReturnRecord[];
  exchanges: ExchangeRecord[];
  creditNotes: CreditNote[];
  oldGold: OldGoldExchange[];
  ledger: LedgerEntry[];
  loyaltyTransactions: LoyaltyTransaction[];
  loyaltyConfig: LoyaltyConfig | null;
  taxConfig: TaxConfig | null;
  dailyClosings: DailyClosing[];
  repairOrders: RepairOrder[];
  parkedBills: ParkedBill[];
  labelTemplates: LabelTemplate[];
  notifications: AppNotification[];
}

const emptyCache = (): Cache => ({
  storeInfo: null, staff: [], metalRates: [], rateHistory: [], productDesigns: [], jewelleryItems: [],
  customers: [], invoices: [], payments: [], returns: [], exchanges: [], creditNotes: [], oldGold: [],
  ledger: [], loyaltyTransactions: [], loyaltyConfig: null, taxConfig: null, dailyClosings: [],
  repairOrders: [], parkedBills: [], labelTemplates: [], notifications: [],
});

let cache: Cache = emptyCache();

const OPEN_ENDED_SPEND = 999_999_999; // server stores "no upper limit" as a number (JSON cannot carry Infinity)

const fromServerLoyalty = (c: LoyaltyConfig): LoyaltyConfig => ({
  ...c,
  slabs: c.slabs.map(s => ({ ...s, maxSpend: s.maxSpend >= OPEN_ENDED_SPEND ? Infinity : s.maxSpend })),
});
const toServerLoyalty = (c: LoyaltyConfig): LoyaltyConfig => ({
  ...c,
  slabs: c.slabs.map(s => ({ ...s, maxSpend: Number.isFinite(s.maxSpend) ? s.maxSpend : OPEN_ENDED_SPEND })),
});

// Loaders for each cached collection. They fill the cache object they are given, so a full reload can
// build a brand-new cache and swap it in only once everything has arrived.
const loaders = {
  storeInfo: async (c: Cache) => { c.storeInfo = await api<StoreInfo>('/store'); },
  staff: async (c: Cache) => { c.staff = await api<Staff[]>('/staff'); },
  metalRates: async (c: Cache) => { c.metalRates = await api<MetalRate[]>('/metal-rates'); },
  rateHistory: async (c: Cache) => { c.rateHistory = await apiListAll<MetalRateHistory>('/metal-rates/history'); },
  productDesigns: async (c: Cache) => { c.productDesigns = await apiListAll<ProductDesign>('/product-designs'); },
  jewelleryItems: async (c: Cache) => { c.jewelleryItems = await apiListAll<JewelleryItem>('/jewellery-items'); },
  customers: async (c: Cache) => { c.customers = await apiListAll<Customer>('/customers'); },
  invoices: async (c: Cache) => { c.invoices = await apiListAll<Invoice>('/invoices'); },
  payments: async (c: Cache) => { c.payments = await apiListAll<Payment>('/payments'); },
  returns: async (c: Cache) => { c.returns = await apiListAll<ReturnRecord>('/returns'); },
  exchanges: async (c: Cache) => { c.exchanges = await apiListAll<ExchangeRecord>('/exchanges'); },
  creditNotes: async (c: Cache) => { c.creditNotes = await apiListAll<CreditNote>('/credit-notes'); },
  oldGold: async (c: Cache) => { c.oldGold = await apiListAll<OldGoldExchange>('/old-gold-exchanges'); },
  ledger: async (c: Cache) => { c.ledger = await apiListAll<LedgerEntry>('/ledger-entries'); },
  loyaltyTransactions: async (c: Cache) => { c.loyaltyTransactions = await apiListAll<LoyaltyTransaction>('/loyalty-transactions'); },
  loyaltyConfig: async (c: Cache) => { c.loyaltyConfig = fromServerLoyalty(await api<LoyaltyConfig>('/settings/loyalty')); },
  taxConfig: async (c: Cache) => { c.taxConfig = await api<TaxConfig>('/settings/tax'); },
  dailyClosings: async (c: Cache) => { c.dailyClosings = await apiListAll<DailyClosing>('/daily-closings'); },
  repairOrders: async (c: Cache) => { c.repairOrders = await apiListAll<RepairOrder>('/repair-orders'); },
  parkedBills: async (c: Cache) => { c.parkedBills = await api<ParkedBill[]>('/parked-bills'); },
  labelTemplates: async (c: Cache) => { c.labelTemplates = await api<LabelTemplate[]>('/label-templates'); },
  notifications: async (c: Cache) => { c.notifications = await api<AppNotification[]>('/notifications'); },
} satisfies Record<keyof Cache, (c: Cache) => Promise<void>>;

type CacheKey = keyof typeof loaders;

let loadInFlight: Promise<void> | null = null;

/** Loads everything the screens need. Call after sign-in. Concurrent calls share one load. */
export function loadAllData(): Promise<void> {
  if (!loadInFlight) {
    loadInFlight = (async () => {
      const next = emptyCache();
      await Promise.all((Object.keys(loaders) as CacheKey[]).map(k => loaders[k](next)));
      cache = next; // swap in only when complete
    })().finally(() => {
      loadInFlight = null;
    });
  }
  return loadInFlight;
}

export async function refreshData(...keys: CacheKey[]): Promise<void> {
  // Fetch into a scratch cache first so a failed refresh never leaves the live cache half-updated
  const scratch = emptyCache();
  await Promise.all(keys.map(k => loaders[k](scratch)));
  for (const k of keys) (cache as unknown as Record<string, unknown>)[k] = scratch[k];
}

export function clearDataCache(): void {
  cache = emptyCache();
}

function upsert<T extends { id: string }>(list: T[], item: T, atStart = false): T[] {
  const i = list.findIndex(x => x.id === item.id);
  if (i >= 0) {
    const copy = list.slice();
    copy[i] = item;
    return copy;
  }
  return atStart ? [item, ...list] : [...list, item];
}

// ---- Reads (synchronous, from cache) ----

export function getStoreInfo(): StoreInfo {
  return cache.storeInfo as StoreInfo;
}
export function getAllStaff(): Staff[] { return cache.staff; }
export function getMetalRates(): MetalRate[] { return cache.metalRates; }
export function getRateHistory(): MetalRateHistory[] { return cache.rateHistory; }
export function getProductDesigns(): ProductDesign[] { return cache.productDesigns; }
export function getJewelleryItems(): JewelleryItem[] { return cache.jewelleryItems; }
export function getJewelleryItemByBarcode(barcode: string): JewelleryItem | undefined {
  return cache.jewelleryItems.find(i => i.barcode === barcode);
}
export function getJewelleryItemById(id: string): JewelleryItem | undefined {
  return cache.jewelleryItems.find(i => i.id === id);
}
export function getCustomers(): Customer[] { return cache.customers; }
export function getCustomerById(id: string): Customer | undefined {
  return cache.customers.find(c => c.id === id);
}
export function getInvoices(): Invoice[] { return cache.invoices; }
export function getInvoiceById(id: string): Invoice | undefined {
  return cache.invoices.find(i => i.id === id);
}
export function getPayments(): Payment[] { return cache.payments; }
export function getReturns(): ReturnRecord[] { return cache.returns; }
export function getExchanges(): ExchangeRecord[] { return cache.exchanges; }
export function getCreditNotes(): CreditNote[] { return cache.creditNotes; }
export function getOldGoldExchanges(): OldGoldExchange[] { return cache.oldGold; }
export function getLedgerEntries(): LedgerEntry[] { return cache.ledger; }
export function getCustomerLedger(customerId: string): LedgerEntry[] {
  return cache.ledger.filter(e => e.customerId === customerId);
}
export function getLoyaltyTransactions(): LoyaltyTransaction[] { return cache.loyaltyTransactions; }
export function getLoyaltyConfig(): LoyaltyConfig { return cache.loyaltyConfig as LoyaltyConfig; }
export function getDailyClosings(): DailyClosing[] { return cache.dailyClosings; }
export function getRepairOrders(): RepairOrder[] { return cache.repairOrders; }
export function getParkedBills(): ParkedBill[] { return cache.parkedBills; }
export function getLabelTemplates(): LabelTemplate[] { return cache.labelTemplates; }
export function getNotifications(): AppNotification[] { return cache.notifications; }
export function getTaxConfig(): TaxConfig { return cache.taxConfig as TaxConfig; }

// ---- Writes (server first, then cache) ----

// Metal rates
export async function updateMetalRateOnServer(id: string, ratePerGram: number): Promise<MetalRate> {
  const updated = await api<MetalRate>(`/metal-rates/${id}`, { method: 'PUT', body: { ratePerGram } });
  cache.metalRates = upsert(cache.metalRates, updated);
  await refreshData('rateHistory');
  return updated;
}

// Settings
export async function saveLoyaltyConfig(config: LoyaltyConfig): Promise<LoyaltyConfig> {
  const saved = await api<LoyaltyConfig>('/settings/loyalty', { method: 'PUT', body: toServerLoyalty(config) });
  cache.loyaltyConfig = fromServerLoyalty(saved);
  return cache.loyaltyConfig;
}
export async function saveTaxConfig(config: TaxConfig): Promise<TaxConfig> {
  cache.taxConfig = await api<TaxConfig>('/settings/tax', { method: 'PUT', body: config });
  return cache.taxConfig;
}

// Notifications
export async function markNotificationRead(id: string): Promise<void> {
  const updated = await api<AppNotification>(`/notifications/${id}/read`, { method: 'PATCH' });
  cache.notifications = upsert(cache.notifications, updated);
}

// Customers
export type NewCustomerInput = Pick<Customer, 'fullName' | 'mobile'> &
  Partial<Pick<Customer, 'email' | 'address' | 'city' | 'state' | 'pincode' | 'gstin' | 'pan' | 'category'>>;

export async function createCustomer(input: NewCustomerInput): Promise<Customer> {
  const created = await api<Customer>('/customers', { method: 'POST', body: input });
  cache.customers = [created, ...cache.customers];
  return created;
}
export async function updateCustomer(id: string, patch: Partial<NewCustomerInput> & { isActive?: boolean }): Promise<Customer> {
  const updated = await api<Customer>(`/customers/${id}`, { method: 'PATCH', body: patch });
  cache.customers = upsert(cache.customers, updated);
  return updated;
}

// Catalogue
export type NewItemInput = Omit<JewelleryItem, 'id' | 'dateAdded'>;

export async function createJewelleryItem(input: NewItemInput): Promise<JewelleryItem> {
  const created = await api<JewelleryItem>('/jewellery-items', { method: 'POST', body: input });
  cache.jewelleryItems = [created, ...cache.jewelleryItems];
  return created;
}
export async function updateJewelleryItemBarcodes(updates: Array<{ id: string; barcode: string }>): Promise<void> {
  const changed = await api<JewelleryItem[]>('/jewellery-items/bulk-barcodes', { method: 'POST', body: { updates } });
  for (const item of changed) cache.jewelleryItems = upsert(cache.jewelleryItems, item);
}

// Checkout
export interface CheckoutPayload {
  customerId?: string;
  items: Array<{ jewelleryItemId: string; quantity: number; itemDiscount: number; unitPriceOverride?: number }>;
  overallDiscount?: number;
  loyaltyPointsToRedeem: number;
  placeOfSupplyCode: string;
  customerGstin?: string;
  taxMode: 'exclusive' | 'inclusive';
  payments: Array<{ method: PaymentMethod; amount: number; referenceNumber?: string }>;
  allowCredit: boolean;
  notes?: string;
}

interface CheckoutResult {
  invoice: Invoice;
  items: JewelleryItem[];
  customer: Customer | null;
  ledgerEntries: LedgerEntry[];
  loyaltyTransactions: LoyaltyTransaction[];
}

/** `idempotencyKey` makes a retried/double-clicked submit return the original invoice instead of billing twice. */
export async function createInvoice(payload: CheckoutPayload, idempotencyKey: string): Promise<Invoice> {
  const result = await api<CheckoutResult>('/invoices', {
    method: 'POST',
    body: payload,
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  cache.invoices = upsert(cache.invoices, result.invoice, true);
  cache.payments = [...result.invoice.payments.filter(p => !cache.payments.some(x => x.id === p.id)), ...cache.payments];
  for (const item of result.items) cache.jewelleryItems = upsert(cache.jewelleryItems, item);
  if (result.customer) cache.customers = upsert(cache.customers, result.customer);
  for (const e of result.ledgerEntries) cache.ledger = upsert(cache.ledger, e);
  for (const t of result.loyaltyTransactions) cache.loyaltyTransactions = upsert(cache.loyaltyTransactions, t);
  return result.invoice;
}

// Returns
export interface ReturnPayload {
  originalInvoiceId: string;
  items: Array<{ jewelleryItemId: string; refundAmount: number; quantity?: number }>;
  refundMethod: PaymentMethod | 'Store Credit';
  reason: ReturnReason;
  notes?: string;
}

export async function createReturn(payload: ReturnPayload): Promise<ReturnRecord> {
  const created = await api<ReturnRecord>('/returns', { method: 'POST', body: payload });
  cache.returns = upsert(cache.returns, created, true);
  await refreshData('creditNotes', 'jewelleryItems', 'customers');
  return created;
}

// Old gold
export type OldGoldPayload = Omit<OldGoldExchange, 'id' | 'exchangeNumber' | 'date' | 'cashierId' | 'cashierName' | 'finalExchangeValue' | 'againstInvoiceNumber'>;

export async function createOldGoldExchange(payload: OldGoldPayload): Promise<OldGoldExchange> {
  const created = await api<OldGoldExchange>('/old-gold-exchanges', { method: 'POST', body: payload });
  cache.oldGold = upsert(cache.oldGold, created, true);
  await refreshData('customers');
  return created;
}

// Daily closing
export async function getClosingSummary(): Promise<Pick<DailyClosing, 'date' | 'cashSales' | 'upiCollections' | 'cardCollections' | 'bankTransfers' | 'cashRefunds' | 'totalInvoices' | 'totalReturns'>> {
  return api('/daily-closings/summary');
}
export async function createDailyClosing(input: { openingCash: number; cashExpenses: number; actualClosingCash: number; closingNotes?: string }): Promise<DailyClosing> {
  const created = await api<DailyClosing>('/daily-closings', { method: 'POST', body: input });
  cache.dailyClosings = upsert(cache.dailyClosings, created, true);
  return created;
}

// Repairs
export type NewRepairInput = Pick<RepairOrder, 'customerName' | 'customerMobile' | 'itemDescription' | 'repairCategory' | 'expectedDeliveryDate' | 'estimatedCharge' | 'advancePayment' | 'staffNotes'> & { customerId?: string };

export async function createRepairOrder(input: NewRepairInput): Promise<RepairOrder> {
  const created = await api<RepairOrder>('/repair-orders', { method: 'POST', body: input });
  cache.repairOrders = upsert(cache.repairOrders, created, true);
  return created;
}
export async function updateRepairOrder(id: string, patch: Partial<Pick<RepairOrder, 'status' | 'expectedDeliveryDate' | 'estimatedCharge' | 'advancePayment' | 'actualCharge' | 'staffNotes'>>): Promise<RepairOrder> {
  const updated = await api<RepairOrder>(`/repair-orders/${id}`, { method: 'PATCH', body: patch });
  cache.repairOrders = upsert(cache.repairOrders, updated);
  return updated;
}

// Parked bills (stored per user on the server)
export async function addParkedBill(bill: Pick<ParkedBill, 'items' | 'customerId' | 'customerName' | 'notes'>): Promise<ParkedBill> {
  const created = await api<ParkedBill>('/parked-bills', { method: 'POST', body: bill });
  cache.parkedBills = [created, ...cache.parkedBills];
  return created;
}
export async function removeParkedBill(id: string): Promise<void> {
  await api(`/parked-bills/${id}`, { method: 'DELETE' });
  cache.parkedBills = cache.parkedBills.filter(b => b.id !== id);
}
