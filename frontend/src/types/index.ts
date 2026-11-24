// ============================================================
// Core Entity Types for Jewellery Retail POS
// ============================================================

// ---- Enums & Constants ----

export type MetalType = 'Gold' | 'Silver' | 'Platinum' | 'Diamond' | '1 Gram Gold' | 'Imitation' | 'Other';

export type GoldPurity = '24K' | '22K' | '20K' | '18K' | '14K' | 'Custom';
export type SilverPurity = '999' | '925' | '900' | '800' | 'Custom';
export type PlatinumPurity = '950' | '900' | '850' | 'Custom';

export type Purity = GoldPurity | SilverPurity | PlatinumPurity | string;

export type MakingChargeType = 'percentage' | 'per_gram' | 'fixed';
export type WastageType = 'percentage' | 'fixed_weight' | 'fixed_amount';

export type JewelleryCategory =
  | 'Gold Rings'
  | 'Gold Necklaces'
  | 'Gold Chains'
  | 'Bangles'
  | 'Earrings'
  | 'Bracelets'
  | 'Pendants'
  | 'Mangalsutra'
  | 'Diamond Jewellery'
  | 'Silver Jewellery'
  | 'Platinum Jewellery'
  | '1 Gram Gold Jewellery'
  | 'Imitation Jewellery'
  | 'Coins'
  | 'Other';

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Store Credit' | 'Other';
export type PaymentStatus = 'Paid' | 'Partial' | 'Pending' | 'Refunded';
export type StockStatus = 'Available' | 'Sold' | 'Reserved' | 'Returned' | 'On Approval';
export type CustomerCategory = 'Regular' | 'Premium' | 'Wholesale' | 'Walk-in';
export type RepairStatus = 'Received' | 'Under Inspection' | 'In Progress' | 'Ready for Collection' | 'Delivered';
export type ReturnReason = 'Defective' | 'Wrong Item' | 'Customer Request' | 'Exchange' | 'Other';
export type InvoiceFormat = 'A4' | 'A5' | '58mm' | '80mm';

// ---- Store ----

export interface StoreInfo {
  id: string;
  name: string;
  tradeName?: string;
  legalName?: string;
  address: string;
  city: string;
  state: string;
  stateCode?: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  pan?: string;
  logoUrl?: string;
  returnPolicy: string;
  thankYouMessage: string;
}

// ---- Metal Rates ----

export interface MetalRate {
  id: string;
  metalType: MetalType;
  purity: string;
  ratePerGram: number;
  updatedAt: string;
  updatedBy: string;
}

export interface MetalRateHistory {
  id: string;
  metalType: MetalType;
  purity: string;
  ratePerGram: number;
  date: string;
  updatedBy: string;
}

// ---- Product Design (Master) ----

export interface ProductDesign {
  id: string;
  name: string;
  category: JewelleryCategory;
  designCode: string;
  description: string;
  metalType: MetalType;
  defaultPurity: Purity;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

// ---- Jewellery Item (Individual Piece) ----

export interface JewelleryItem {
  id: string;
  productDesignId: string;
  name: string;
  sku: string;
  barcode: string;
  itemCode: string;
  category: JewelleryCategory;
  description: string;
  imageUrl?: string;
  designCode: string;
  supplierRef?: string;

  // 1 Gram Retail Pricing & Variant
  variant?: string; // e.g. "Temple Matte", "Kemp Stone Antique", "CZ Ruby Emerald"
  costPrice?: number;
  mrp?: number;
  sellingPrice: number;
  discount: number;
  currentValuation: number;

  // Metal / Finish details (Optional in 1 Gram retail)
  metalType: MetalType;
  purity: Purity;
  grossWeight: number;
  netWeight: number;
  stoneWeight: number;
  diamondCaratWeight?: number;
  huid?: string;

  // Diamond details (optional)
  diamondDetails?: DiamondDetails;

  // Making / Charges (optional / legacy compatibility)
  makingChargeType: MakingChargeType;
  makingChargeValue: number;
  wastageType: WastageType;
  wastageValue: number;
  stoneValue: number;
  additionalCharges: number;

  // Tax
  gstRate: number; // e.g., 3 for 3%
  hsnCode: string;

  // Inventory
  stockStatus: StockStatus;
  stockQuantity: number; // 1 for unique pieces, >1 for coins etc.
  isQuantityBased: boolean;
  location?: string;
  supplier?: string;
  dateAdded: string;
  isActive: boolean;
}

export interface DiamondDetails {
  stoneCount: number;
  totalCarat: number;
  colour: string;
  clarity: string;
  cut: string;
  certificationRef?: string;
}

// ---- Pricing Calculation ----

export interface PricingBreakdown {
  metalRate: number;
  metalValue: number;
  makingCharges: number;
  wastageCharges: number;
  stoneValue: number;
  additionalCharges: number;
  subtotal: number;
  discount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  total: number;
}

// ---- Customer ----

export interface Customer {
  id: string;
  fullName: string;
  mobile: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  category: CustomerCategory;
  registrationDate: string;
  loyaltyPoints: number;
  totalSpent: number;
  totalPurchases: number;
  outstandingBalance: number;
  storeCredit: number;
  lastPurchaseDate?: string;
  isActive: boolean;
}

// ---- Cart & Billing ----

export interface CartItem {
  id: string; // unique cart line id
  jewelleryItemId: string;
  item: JewelleryItem;
  quantity: number;
  unitPrice: number;
  originalUnitPrice?: number;
  isPriceOverridden?: boolean;
  itemDiscount: number;
  pricing: PricingBreakdown;
  totalPrice: number;
}

export interface ParkedBill {
  id: string;
  items: CartItem[];
  customerId?: string;
  customerName?: string;
  parkedAt: string;
  notes?: string;
}

// ---- Invoice ----

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId?: string;
  customerName: string;
  customerMobile?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerStateCode?: string;
  customerGstin?: string;
  customerPan?: string;
  placeOfSupply?: string;
  placeOfSupplyCode?: string;
  isInterState?: boolean;
  reverseCharge?: string;
  taxMode?: 'exclusive' | 'inclusive';
  items: InvoiceItem[];
  totalGrossWeight?: number;
  totalNetWeight?: number;
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  additionalCharges: number;
  roundOff?: number;
  grandTotal: number;
  loyaltyPointsRedeemed: number;
  loyaltyRedemptionValue: number;
  amountPayable: number;
  payments: Payment[];
  paymentStatus: PaymentStatus;
  cashierName: string;
  cashierId: string;
  notes?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  jewelleryItemId: string;
  name: string;
  itemCode: string;
  barcode: string;
  category: JewelleryCategory;
  metalType: MetalType;
  purity: Purity;
  hsnCode?: string;
  huid?: string;
  grossWeight: number;
  netWeight: number;
  stoneWeight: number;
  quantity: number;
  metalRate: number;
  metalValue: number;
  makingCharges: number;
  wastageCharges: number;
  stoneValue: number;
  additionalCharges: number;
  discount: number;
  taxableValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalPrice: number;
}

// ---- Payment ----

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  method: PaymentMethod;
  amount: number;
  referenceNumber?: string;
  date: string;
  cashierId: string;
  cashierName: string;
  notes?: string;
}

// ---- Returns & Exchanges ----

export interface ReturnRecord {
  id: string;
  returnNumber: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  customerId?: string;
  customerName: string;
  date: string;
  items: ReturnItem[];
  totalRefundAmount: number;
  refundMethod: PaymentMethod | 'Store Credit';
  reason: ReturnReason;
  notes?: string;
  cashierId: string;
  cashierName: string;
  creditNoteId?: string;
}

export interface ReturnItem {
  id: string;
  jewelleryItemId: string;
  name: string;
  itemCode: string;
  originalPrice: number;
  refundAmount: number;
  reason: ReturnReason;
}

export interface ExchangeRecord {
  id: string;
  exchangeNumber: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  customerId?: string;
  customerName: string;
  date: string;
  returnedItems: ReturnItem[];
  newItems: InvoiceItem[];
  returnValue: number;
  newPurchaseValue: number;
  priceDifference: number;
  additionalPayment: number;
  storeCredit: number;
  cashierId: string;
  cashierName: string;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  customerId?: string;
  customerName: string;
  date: string;
  amount: number;
  reason: string;
  usedAmount: number;
  remainingAmount: number;
  isActive: boolean;
}

// ---- Old Gold Exchange ----

export interface OldGoldExchange {
  id: string;
  exchangeNumber: string;
  customerId?: string;
  customerName: string;
  date: string;
  metalType: MetalType;
  declaredPurity: string;
  testedPurity: string;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  applicableRate: number;
  deductions: number;
  finalExchangeValue: number;
  againstInvoiceId?: string;
  againstInvoiceNumber?: string;
  settlementType: 'Against Purchase' | 'Store Credit' | 'Cash';
  staffNotes?: string;
  cashierId: string;
  cashierName: string;
}

// ---- Customer Ledger ----

export interface LedgerEntry {
  id: string;
  customerId: string;
  date: string;
  description: string;
  referenceId?: string;
  referenceType?: 'Invoice' | 'Payment' | 'Return' | 'Credit Note' | 'Store Credit' | 'Old Gold';
  debit: number;
  credit: number;
  balance: number;
}

// ---- Loyalty ----

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  date: string;
  type: 'Earned' | 'Redeemed' | 'Expired' | 'Adjusted';
  points: number;
  referenceId?: string;
  referenceType?: string;
  description: string;
  balance: number;
}

export interface LoyaltyConfig {
  pointsPerRupee: number; // e.g., 1 point per 100 rupees
  pointValue: number; // e.g., 1 point = ₹1
  minRedemptionPoints: number;
  maxRedemptionPercentage: number; // max % of bill payable via points
  slabs: LoyaltySlab[];
}

export interface LoyaltySlab {
  minSpend: number;
  maxSpend: number;
  pointsMultiplier: number;
}

// ---- Daily Closing ----

export interface DailyClosing {
  id: string;
  date: string;
  openingCash: number;
  cashSales: number;
  upiCollections: number;
  cardCollections: number;
  bankTransfers: number;
  cashRefunds: number;
  cashExpenses: number;
  expectedClosingCash: number;
  actualClosingCash: number;
  cashDifference: number;
  totalInvoices: number;
  totalReturns: number;
  closingNotes?: string;
  closedBy: string;
  closedAt: string;
  status: 'Open' | 'Closed';
}

// ---- Repair Orders ----

export interface RepairOrder {
  id: string;
  repairNumber: string;
  customerId?: string;
  customerName: string;
  customerMobile: string;
  itemDescription: string;
  repairCategory: string;
  receivedDate: string;
  expectedDeliveryDate: string;
  estimatedCharge: number;
  advancePayment: number;
  remainingBalance: number;
  status: RepairStatus;
  staffNotes?: string;
  deliveredDate?: string;
  actualCharge?: number;
  cashierId: string;
  cashierName: string;
}

// ---- Label Template ----

export interface LabelTemplate {
  id: string;
  name: string;
  type: 'jewellery_tag' | 'product_label';
  width: number; // mm
  height: number; // mm
  fields: LabelField[];
  isDefault: boolean;
}

export interface LabelField {
  key: string;
  label: string;
  enabled: boolean;
  fontSize?: number;
}

// ---- User / Staff ----

export interface Staff {
  id: string;
  name: string;
  role: 'Cashier' | 'Manager' | 'Admin';
  email?: string;
  phone?: string;
  isActive: boolean;
}

// ---- Notifications ----

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  date: string;
  link?: string;
}

// ---- Tax Configuration ----

export interface TaxConfig {
  isInterState: boolean; // false = CGST+SGST, true = IGST
  defaultGstRate: number;
  categoryRates: Record<string, number>; // category -> GST rate
}
