// LocalStorage service layer - abstraction for future Supabase migration

const STORAGE_PREFIX = 'jewellery_pos_';

function getKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(getKey(key));
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(getKey(key), JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error);
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(getKey(key));
  } catch (error) {
    console.error(`Failed to remove ${key} from localStorage:`, error);
  }
}

export function clearAllStorage(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}

// Storage keys
export const STORAGE_KEYS = {
  JEWELLERY_ITEMS: 'jewellery_items',
  PRODUCT_DESIGNS: 'product_designs',
  CUSTOMERS: 'customers',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  RETURNS: 'returns',
  EXCHANGES: 'exchanges',
  CREDIT_NOTES: 'credit_notes',
  OLD_GOLD: 'old_gold_exchanges',
  METAL_RATES: 'metal_rates',
  RATE_HISTORY: 'rate_history',
  LOYALTY_TRANSACTIONS: 'loyalty_transactions',
  LOYALTY_CONFIG: 'loyalty_config',
  LEDGER_ENTRIES: 'ledger_entries',
  DAILY_CLOSINGS: 'daily_closings',
  REPAIR_ORDERS: 'repair_orders',
  PARKED_BILLS: 'parked_bills',
  LABEL_TEMPLATES: 'label_templates',
  NOTIFICATIONS: 'notifications',
  STORE_INFO: 'store_info',
  TAX_CONFIG: 'tax_config',
  STAFF: 'staff',
  CURRENT_USER: 'current_user',
  DATA_INITIALIZED: 'data_initialized',
} as const;
