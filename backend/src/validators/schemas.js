import { z } from 'zod';
import * as c from './common.js';

// ---------------- Auth / staff ----------------
export const loginBody = z.object({
  email: z.string().trim().toLowerCase().email().max(190),
  password: z.string().min(1).max(200),
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const staffCreateBody = z.object({
  name: c.reqText(120),
  role: z.enum(c.ROLE_VALUES),
  email: z.string().trim().toLowerCase().email().max(190),
  phone: c.optText(20),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const staffUpdateBody = z.object({
  name: c.reqText(120).optional(),
  role: z.enum(c.ROLE_VALUES).optional(),
  phone: c.optText(20),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
});

// ---------------- Store & settings ----------------
export const storeInfoBody = z.object({
  name: c.reqText(160),
  tradeName: c.optText(160),
  legalName: c.optText(200),
  address: c.shortText(300),
  city: c.shortText(80),
  state: c.shortText(80),
  stateCode: c.optText(4),
  pincode: c.shortText(10),
  phone: c.shortText(30),
  email: c.shortText(190),
  gstin: c.shortText(20),
  pan: c.optText(12),
  logoUrl: c.optText(500),
  returnPolicy: c.shortText(2000),
  thankYouMessage: c.shortText(1000),
});

export const loyaltyConfigBody = z.object({
  pointsPerRupee: z.number().min(0).max(10),
  pointValue: z.number().min(0).max(1000),
  minRedemptionPoints: z.number().int().min(0).max(1_000_000),
  maxRedemptionPercentage: z.number().min(0).max(100),
  slabs: z
    .array(
      z.object({
        minSpend: z.number().min(0),
        maxSpend: z.number().min(0),
        pointsMultiplier: z.number().min(0).max(100),
      })
    )
    .max(20),
});

export const taxConfigBody = z.object({
  isInterState: z.boolean(),
  defaultGstRate: z.number().min(0).max(40),
  categoryRates: z.record(z.string().max(60), z.number().min(0).max(40)),
});

// ---------------- Rates ----------------
export const rateUpdateBody = z.object({ ratePerGram: z.number().positive().max(10_000_000) });

// ---------------- Product designs ----------------
export const productDesignBody = z.object({
  name: c.reqText(160),
  category: z.enum(c.CATEGORIES),
  designCode: c.reqText(60),
  description: c.optText(2000),
  metalType: z.enum(c.METAL_TYPES),
  defaultPurity: c.reqText(30),
  imageUrl: c.optText(500),
  isActive: z.boolean().default(true),
});

// ---------------- Jewellery items ----------------
const itemFields = {
  productDesignId: c.optText(40),
  name: c.reqText(200),
  sku: c.reqText(80),
  barcode: c.reqText(80),
  itemCode: c.reqText(40),
  category: z.enum(c.CATEGORIES),
  description: c.optText(2000),
  imageUrl: c.optText(500),
  designCode: c.optText(80),
  supplierRef: c.optText(120),
  variant: c.optText(120),
  costPrice: c.optMoney,
  mrp: c.optMoney,
  sellingPrice: c.money,
  discount: c.money,
  currentValuation: c.money,
  metalType: z.enum(c.METAL_TYPES),
  purity: c.reqText(30),
  grossWeight: c.weight,
  netWeight: c.weight,
  stoneWeight: c.weight,
  diamondCaratWeight: z.preprocess(v => (v === null ? undefined : v), c.weight.optional()),
  huid: c.optText(20),
  diamondDetails: z
    .object({
      stoneCount: z.number().int().min(0),
      totalCarat: z.number().min(0),
      colour: c.shortText(30),
      clarity: c.shortText(30),
      cut: c.shortText(30),
      certificationRef: c.optText(80),
    })
    .optional(),
  makingChargeType: z.enum(c.MAKING_TYPES),
  makingChargeValue: c.money,
  wastageType: z.enum(c.WASTAGE_TYPES),
  wastageValue: c.money,
  stoneValue: c.money,
  additionalCharges: c.money,
  gstRate: z.number().min(0).max(40),
  hsnCode: c.reqText(10),
  stockStatus: z.enum(c.STOCK_STATUSES),
  stockQuantity: c.intQty,
  isQuantityBased: z.boolean(),
  location: c.optText(120),
  supplier: c.optText(160),
  isActive: z.boolean(),
};

export const itemCreateBody = z.object({
  ...itemFields,
  discount: c.money.default(0),
  currentValuation: c.money.default(0),
  grossWeight: c.weight.default(0),
  netWeight: c.weight.default(0),
  stoneWeight: c.weight.default(0),
  makingChargeType: z.enum(c.MAKING_TYPES).default('fixed'),
  makingChargeValue: c.money.default(0),
  wastageType: z.enum(c.WASTAGE_TYPES).default('percentage'),
  wastageValue: c.money.default(0),
  stoneValue: c.money.default(0),
  additionalCharges: c.money.default(0),
  gstRate: z.number().min(0).max(40).default(3),
  hsnCode: c.reqText(10).default('7113'),
  stockStatus: z.enum(c.STOCK_STATUSES).default('Available'),
  stockQuantity: c.intQty.default(1),
  isQuantityBased: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export const itemUpdateBody = z.object(
  Object.fromEntries(Object.entries(itemFields).map(([k, v]) => [k, v.optional()]))
);
export const itemBulkUpdateBody = z.object({
  updates: z
    .array(z.object({ id: c.id, barcode: c.reqText(80) }))
    .min(1)
    .max(500),
});

// ---------------- Customers ----------------
const customerFields = {
  fullName: c.reqText(160),
  mobile: c.mobile,
  email: c.optEmail,
  address: c.optText(300),
  city: c.optText(80),
  state: c.optText(80),
  pincode: c.optText(10),
  gstin: c.optText(20),
  pan: c.optText(12),
  category: z.enum(c.CUSTOMER_CATEGORIES),
};
export const customerCreateBody = z.object({ ...customerFields, category: z.enum(c.CUSTOMER_CATEGORIES).default('Regular') });
export const customerUpdateBody = z.object({
  ...Object.fromEntries(Object.entries(customerFields).map(([k, v]) => [k, v.optional()])),
  isActive: z.boolean().optional(),
});

// ---------------- Invoices (checkout) ----------------
export const invoiceCreateBody = z.object({
  customerId: z.preprocess(v => (v === '' ? null : v), c.id.nullable().optional()),
  items: z
    .array(
      z.object({
        jewelleryItemId: c.id,
        quantity: z.number().int().min(1).max(10_000),
        itemDiscount: c.money.default(0),
        unitPriceOverride: z.number().positive().max(1_000_000_000).optional(),
      })
    )
    .min(1, 'Add at least one item')
    .max(100),
  overallDiscount: c.money.default(0),
  loyaltyPointsToRedeem: z.number().int().min(0).default(0),
  placeOfSupplyCode: z.string().regex(/^\d{2}$/, 'State code must be 2 digits'),
  customerGstin: c.optText(20),
  taxMode: z.enum(['exclusive', 'inclusive']).default('exclusive'),
  payments: z
    .array(
      z.object({
        method: z.enum(c.PAYMENT_METHODS),
        amount: c.money,
        referenceNumber: c.optText(80),
      })
    )
    .max(10)
    .default([]),
  allowCredit: z.boolean().default(false),
  notes: c.optText(500),
});

// ---------------- Returns ----------------
export const returnCreateBody = z.object({
  originalInvoiceId: c.id,
  items: z
    .array(
      z.object({
        jewelleryItemId: c.id,
        refundAmount: z.number().positive().max(1_000_000_000),
        quantity: z.number().int().min(1).max(10_000).default(1),
      })
    )
    .min(1)
    .max(50),
  refundMethod: z.enum(c.PAYMENT_METHODS),
  reason: z.enum(c.RETURN_REASONS),
  notes: c.optText(500),
});

// ---------------- Old gold ----------------
export const oldGoldBody = z.object({
  customerId: z.preprocess(v => (v === '' ? null : v), c.id.nullable().optional()),
  customerName: c.reqText(160),
  metalType: z.enum(c.METAL_TYPES),
  declaredPurity: c.reqText(30),
  testedPurity: c.reqText(30),
  grossWeight: c.weight.positive(),
  stoneWeight: c.weight,
  netWeight: c.weight.positive(),
  applicableRate: z.number().positive().max(10_000_000),
  deductions: c.money.default(0),
  settlementType: z.enum(['Against Purchase', 'Store Credit', 'Cash']),
  againstInvoiceId: c.optText(40),
  staffNotes: c.optText(500),
});

// ---------------- Daily closing ----------------
export const dailyClosingBody = z.object({
  openingCash: c.money,
  cashExpenses: c.money.default(0),
  actualClosingCash: c.money,
  closingNotes: c.optText(500),
});

// ---------------- Repairs ----------------
export const repairCreateBody = z.object({
  customerId: z.preprocess(v => (v === '' ? null : v), c.id.nullable().optional()),
  customerName: c.reqText(160),
  customerMobile: c.mobile,
  itemDescription: c.reqText(300),
  repairCategory: c.reqText(60),
  expectedDeliveryDate: c.dateOnly,
  estimatedCharge: c.money.default(0),
  advancePayment: c.money.default(0),
  staffNotes: c.optText(500),
});
export const repairUpdateBody = z.object({
  status: z.enum(c.REPAIR_STATUSES).optional(),
  expectedDeliveryDate: c.dateOnly.optional(),
  estimatedCharge: c.money.optional(),
  advancePayment: c.money.optional(),
  actualCharge: c.money.optional(),
  staffNotes: c.optText(500),
});

// ---------------- Labels / notifications / parked bills ----------------
export const labelTemplateBody = z.object({
  name: c.reqText(120),
  type: z.enum(['jewellery_tag', 'product_label']),
  width: z.number().min(10).max(300),
  height: z.number().min(10).max(300),
  isDefault: z.boolean().default(false),
  fields: z
    .array(
      z.object({
        key: c.reqText(40),
        label: c.reqText(60),
        enabled: z.boolean(),
        fontSize: z.number().min(1).max(60).optional(),
      })
    )
    .max(40),
});

export const parkedBillBody = z.object({
  items: z.array(z.any()).min(1).max(100),
  customerId: z.preprocess(v => (v === '' ? null : v), c.id.nullable().optional()),
  customerName: c.optText(160),
  notes: c.optText(500),
});
