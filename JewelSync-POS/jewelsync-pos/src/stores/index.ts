import { create } from 'zustand';
import type {
  CartItem, JewelleryItem, Customer, ParkedBill,
  MetalRate, Staff, AppNotification, PricingBreakdown,
  TaxConfig,
} from '@/types';
import { calculateItemPricing, calculateBillTotals, getMetalRate as getMetalRateForItem } from '@/lib/pricing';
import { generateId } from '@/lib/utils';
import * as dataService from '@/services/data-service';

// ================================================================
// APP STORE
// ================================================================
interface AppState {
  // Current user
  currentUser: Staff;
  setCurrentUser: (user: Staff) => void;

  // Metal rates
  metalRates: MetalRate[];
  refreshMetalRates: () => void;
  updateMetalRate: (id: string, newRate: number) => void;

  // Tax config
  taxConfig: TaxConfig;
  refreshTaxConfig: () => void;

  // Notifications
  notifications: AppNotification[];
  refreshNotifications: () => void;
  markNotificationRead: (id: string) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: dataService.getCurrentUser(),
  setCurrentUser: (user) => {
    dataService.setCurrentUser(user);
    set({ currentUser: user });
  },

  metalRates: dataService.getMetalRates(),
  refreshMetalRates: () => set({ metalRates: dataService.getMetalRates() }),
  updateMetalRate: (id, newRate) => {
    const rates = get().metalRates.map(r =>
      r.id === id ? { ...r, ratePerGram: newRate, updatedAt: new Date().toISOString(), updatedBy: get().currentUser.id } : r
    );
    dataService.saveMetalRates(rates);
    // Add to history
    const updated = rates.find(r => r.id === id);
    if (updated) {
      dataService.addRateHistory({
        id: generateId('rh'),
        metalType: updated.metalType,
        purity: updated.purity,
        ratePerGram: newRate,
        date: new Date().toISOString().split('T')[0],
        updatedBy: get().currentUser.id,
      });
    }
    set({ metalRates: rates });
  },

  taxConfig: dataService.getTaxConfig(),
  refreshTaxConfig: () => set({ taxConfig: dataService.getTaxConfig() }),

  notifications: dataService.getNotifications(),
  refreshNotifications: () => set({ notifications: dataService.getNotifications() }),
  markNotificationRead: (id) => {
    dataService.markNotificationRead(id);
    set({ notifications: dataService.getNotifications() });
  },

  sidebarCollapsed: false,
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));

// ================================================================
// POS / CART STORE
// ================================================================
interface POSState {
  // Cart
  items: CartItem[];
  selectedCustomer: Customer | null;
  overallDiscount: number;
  loyaltyPointsToRedeem: number;
  notes: string;

  // Computed
  billTotals: ReturnType<typeof calculateBillTotals>;

  // Actions
  addItem: (jewelleryItem: JewelleryItem) => boolean;
  removeItem: (cartItemId: string) => void;
  updateItemQuantity: (cartItemId: string, quantity: number) => void;
  updateItemDiscount: (cartItemId: string, discount: number) => void;
  updateItemPrice: (cartItemId: string, newUnitPrice: number) => void;
  resetItemPrice: (cartItemId: string) => void;
  setOverallDiscount: (discount: number) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setLoyaltyPointsToRedeem: (points: number) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;

  // Bill management
  parkBill: () => ParkedBill | null;
  resumeBill: (bill: ParkedBill) => void;

  // Recalculate
  recalculate: () => void;
}

const emptyTotals = {
  subtotal: 0, totalDiscount: 0, taxableAmount: 0,
  cgst: 0, sgst: 0, igst: 0, totalTax: 0,
  grandTotal: 0, amountPayable: 0,
};

function calculateCartItemPricing(
  item: JewelleryItem,
  discount: number,
  overriddenUnitPrice?: number
): PricingBreakdown {
  const taxConfig = dataService.getTaxConfig();
  return calculateItemPricing(item, 0, taxConfig, discount, overriddenUnitPrice);
}

export const usePOSStore = create<POSState>((set, get) => ({
  items: [],
  selectedCustomer: null,
  overallDiscount: 0,
  loyaltyPointsToRedeem: 0,
  notes: '',
  billTotals: emptyTotals,

  addItem: (jewelleryItem) => {
    const state = get();
    // Check if already in cart (unique items)
    if (!jewelleryItem.isQuantityBased) {
      const existing = state.items.find(i => i.jewelleryItemId === jewelleryItem.id);
      if (existing) return false;
      // Check if sold
      if (jewelleryItem.stockStatus === 'Sold') return false;
    }

    const pricing = calculateCartItemPricing(jewelleryItem, 0);
    const cartItem: CartItem = {
      id: generateId('cart'),
      jewelleryItemId: jewelleryItem.id,
      item: jewelleryItem,
      quantity: 1,
      unitPrice: pricing.total,
      originalUnitPrice: pricing.total,
      isPriceOverridden: false,
      itemDiscount: 0,
      pricing,
      totalPrice: pricing.total,
    };

    const newItems = [...state.items, cartItem];
    const totals = calculateBillTotals(
      newItems.map(i => ({ pricing: i.pricing, quantity: i.quantity })),
      state.overallDiscount,
      state.loyaltyPointsToRedeem
    );
    set({ items: newItems, billTotals: totals });
    return true;
  },

  removeItem: (cartItemId) => {
    const state = get();
    const newItems = state.items.filter(i => i.id !== cartItemId);
    const totals = calculateBillTotals(
      newItems.map(i => ({ pricing: i.pricing, quantity: i.quantity })),
      state.overallDiscount,
      state.loyaltyPointsToRedeem
    );
    set({ items: newItems, billTotals: totals });
  },

  updateItemQuantity: (cartItemId, quantity) => {
    const state = get();
    const newItems = state.items.map(i => {
      if (i.id !== cartItemId) return i;
      return { ...i, quantity, totalPrice: i.unitPrice * quantity };
    });
    const totals = calculateBillTotals(
      newItems.map(i => ({ pricing: i.pricing, quantity: i.quantity })),
      state.overallDiscount,
      state.loyaltyPointsToRedeem
    );
    set({ items: newItems, billTotals: totals });
  },

  updateItemPrice: (cartItemId, newUnitPrice) => {
    if (isNaN(newUnitPrice) || newUnitPrice <= 0) return;
    const state = get();
    const newItems = state.items.map(i => {
      if (i.id !== cartItemId) return i;
      const originalPrice = i.originalUnitPrice || i.pricing.total;
      const pricing = calculateCartItemPricing(i.item, i.itemDiscount, newUnitPrice);
      return {
        ...i,
        unitPrice: newUnitPrice,
        originalUnitPrice: originalPrice,
        isPriceOverridden: true,
        pricing,
        totalPrice: newUnitPrice * i.quantity,
      };
    });
    const totals = calculateBillTotals(
      newItems.map(i => ({ pricing: i.pricing, quantity: i.quantity })),
      state.overallDiscount,
      state.loyaltyPointsToRedeem
    );
    set({ items: newItems, billTotals: totals });
  },

  resetItemPrice: (cartItemId) => {
    const state = get();
    const newItems = state.items.map(i => {
      if (i.id !== cartItemId) return i;
      const pricing = calculateCartItemPricing(i.item, i.itemDiscount, undefined);
      return {
        ...i,
        unitPrice: pricing.total,
        isPriceOverridden: false,
        pricing,
        totalPrice: pricing.total * i.quantity,
      };
    });
    const totals = calculateBillTotals(
      newItems.map(i => ({ pricing: i.pricing, quantity: i.quantity })),
      state.overallDiscount,
      state.loyaltyPointsToRedeem
    );
    set({ items: newItems, billTotals: totals });
  },

  updateItemDiscount: (cartItemId, discount) => {
    const state = get();
    const newItems = state.items.map(i => {
      if (i.id !== cartItemId) return i;
      const overridden = i.isPriceOverridden ? i.unitPrice : undefined;
      const pricing = calculateCartItemPricing(i.item, discount, overridden);
      return {
        ...i,
        itemDiscount: discount,
        pricing,
        unitPrice: pricing.total,
        totalPrice: pricing.total * i.quantity,
      };
    });
    const totals = calculateBillTotals(
      newItems.map(i => ({ pricing: i.pricing, quantity: i.quantity })),
      state.overallDiscount,
      state.loyaltyPointsToRedeem
    );
    set({ items: newItems, billTotals: totals });
  },

  setOverallDiscount: (discount) => {
    const state = get();
    const totals = calculateBillTotals(
      state.items.map(i => ({ pricing: i.pricing, quantity: i.quantity })),
      discount,
      state.loyaltyPointsToRedeem
    );
    set({ overallDiscount: discount, billTotals: totals });
  },

  setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),

  setLoyaltyPointsToRedeem: (points) => {
    const state = get();
    const totals = calculateBillTotals(
      state.items.map(i => ({ pricing: i.pricing, quantity: i.quantity })),
      state.overallDiscount,
      points * (dataService.getLoyaltyConfig().pointValue || 1)
    );
    set({ loyaltyPointsToRedeem: points, billTotals: totals });
  },

  setNotes: (notes) => set({ notes }),

  clearCart: () => set({
    items: [],
    selectedCustomer: null,
    overallDiscount: 0,
    loyaltyPointsToRedeem: 0,
    notes: '',
    billTotals: emptyTotals,
  }),

  parkBill: () => {
    const state = get();
    if (state.items.length === 0) return null;
    const parked: ParkedBill = {
      id: generateId('park'),
      items: state.items,
      customerId: state.selectedCustomer?.id,
      customerName: state.selectedCustomer?.fullName,
      parkedAt: new Date().toISOString(),
      notes: state.notes,
    };
    dataService.addParkedBill(parked);
    get().clearCart();
    return parked;
  },

  resumeBill: (bill) => {
    dataService.removeParkedBill(bill.id);
    const customer = bill.customerId ? dataService.getCustomerById(bill.customerId) : null;
    const totals = calculateBillTotals(
      bill.items.map(i => ({ pricing: i.pricing, quantity: i.quantity })),
      0, 0
    );
    set({
      items: bill.items,
      selectedCustomer: customer ?? null,
      overallDiscount: 0,
      loyaltyPointsToRedeem: 0,
      notes: bill.notes || '',
      billTotals: totals,
    });
  },

  recalculate: () => {
    const state = get();
    const newItems = state.items.map(i => {
      const overridden = i.isPriceOverridden ? i.unitPrice : undefined;
      const pricing = calculateCartItemPricing(i.item, i.itemDiscount, overridden);
      return {
        ...i,
        pricing,
        unitPrice: pricing.total,
        totalPrice: pricing.total * i.quantity,
      };
    });
    const totals = calculateBillTotals(
      newItems.map(i => ({ pricing: i.pricing, quantity: i.quantity })),
      state.overallDiscount,
      state.loyaltyPointsToRedeem
    );
    set({ items: newItems, billTotals: totals });
  },
}));
