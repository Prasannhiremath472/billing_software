import type {
  JewelleryItem,
  PricingBreakdown,
  MetalRate,
  MakingChargeType,
  WastageType,
  TaxConfig,
} from '@/types';
import { roundCurrency } from '@/lib/utils';

/**
 * Get the purity multiplier for converting 24K rate to actual purity rate
 */
export function getPurityMultiplier(purity: string): number {
  const purityMap: Record<string, number> = {
    '24K': 1.0,
    '22K': 22 / 24,
    '20K': 20 / 24,
    '18K': 18 / 24,
    '14K': 14 / 24,
    '999': 1.0,
    '925': 0.925,
    '900': 0.9,
    '800': 0.8,
    '950': 0.95,
    '850': 0.85,
  };
  return purityMap[purity] ?? 1.0;
}

/**
 * Calculate metal value based on weight, purity, and rate
 */
export function calculateMetalValue(
  netWeight: number,
  ratePerGram: number,
  purity: string
): number {
  const multiplier = getPurityMultiplier(purity);
  return roundCurrency(netWeight * ratePerGram * multiplier);
}

/**
 * Calculate making charges based on type and value
 */
export function calculateMakingCharges(
  type: MakingChargeType,
  value: number,
  metalValue: number,
  netWeight: number
): number {
  switch (type) {
    case 'percentage':
      return roundCurrency((value / 100) * metalValue);
    case 'per_gram':
      return roundCurrency(value * netWeight);
    case 'fixed':
      return roundCurrency(value);
    default:
      return 0;
  }
}

/**
 * Calculate wastage charges
 */
export function calculateWastageCharges(
  type: WastageType,
  value: number,
  metalValue: number,
  ratePerGram: number,
  purity: string
): number {
  const multiplier = getPurityMultiplier(purity);
  switch (type) {
    case 'percentage':
      return roundCurrency((value / 100) * metalValue);
    case 'fixed_weight':
      return roundCurrency(value * ratePerGram * multiplier);
    case 'fixed_amount':
      return roundCurrency(value);
    default:
      return 0;
  }
}

/**
 * Calculate tax based on configuration
 */
export function calculateTax(
  taxableValue: number,
  gstRate: number,
  isInterState: boolean
): { cgst: number; sgst: number; igst: number; totalTax: number } {
  if (isInterState) {
    const igst = roundCurrency((gstRate / 100) * taxableValue);
    return { cgst: 0, sgst: 0, igst, totalTax: igst };
  }
  const halfRate = gstRate / 2;
  const cgst = roundCurrency((halfRate / 100) * taxableValue);
  const sgst = roundCurrency((halfRate / 100) * taxableValue);
  return { cgst, sgst, igst: 0, totalTax: roundCurrency(cgst + sgst) };
}

/**
 * Complete retail pricing breakdown for 1 Gram Jewellery items
 * Operates on standard retail pricing (Selling Price / MRP), item discount, and billing-time overrides.
 * Complies with Indian GST Rule 46 (HSN 7117, 3% GST composite).
 */
export function calculateItemPricing(
  item: JewelleryItem,
  metalRate: number = 0,
  taxConfig: TaxConfig,
  itemDiscount: number = 0,
  overriddenUnitPrice?: number
): PricingBreakdown {
  const gstRate = item.gstRate || taxConfig.defaultGstRate || 3;
  const discount = roundCurrency(itemDiscount);

  // If cashier manually edited/overrode the unit price at POS billing time
  if (overriddenUnitPrice !== undefined && overriddenUnitPrice > 0) {
    const finalUnitPrice = roundCurrency(overriddenUnitPrice);
    const taxableValue = roundCurrency(finalUnitPrice / (1 + gstRate / 100));
    const totalTax = roundCurrency(finalUnitPrice - taxableValue);
    const subtotal = roundCurrency(taxableValue + discount);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    if (taxConfig.isInterState) {
      igst = totalTax;
    } else {
      cgst = roundCurrency(totalTax / 2);
      sgst = roundCurrency(totalTax - cgst);
    }

    return {
      metalRate: 0,
      metalValue: 0,
      makingCharges: 0,
      wastageCharges: 0,
      stoneValue: 0,
      additionalCharges: 0,
      subtotal,
      discount,
      taxableValue,
      cgst,
      sgst,
      igst,
      totalTax,
      total: finalUnitPrice,
    };
  }

  // 1 Gram Jewellery Retail Pricing (MRP / Selling Price based)
  const baseSellingPrice = item.sellingPrice || item.mrp || 0;
  const subtotal = roundCurrency(baseSellingPrice);
  const taxableValue = roundCurrency(Math.max(0, subtotal - discount));
  const { cgst, sgst, igst, totalTax } = calculateTax(taxableValue, gstRate, taxConfig.isInterState);
  const total = roundCurrency(taxableValue + totalTax);

  return {
    metalRate: 0,
    metalValue: 0,
    makingCharges: 0,
    wastageCharges: 0,
    stoneValue: item.stoneValue || 0,
    additionalCharges: item.additionalCharges || 0,
    subtotal,
    discount,
    taxableValue,
    cgst,
    sgst,
    igst,
    totalTax,
    total,
  };
}

/**
 * Calculate bill totals from cart items
 */
export function calculateBillTotals(
  items: Array<{ pricing: PricingBreakdown; quantity: number }>,
  overallDiscount: number = 0,
  loyaltyRedemptionValue: number = 0
): {
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  grandTotal: number;
  amountPayable: number;
} {
  let subtotal = 0;
  let totalItemDiscount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let totalTax = 0;

  for (const cartItem of items) {
    const qty = cartItem.quantity;
    subtotal += cartItem.pricing.subtotal * qty;
    totalItemDiscount += cartItem.pricing.discount * qty;
    cgst += cartItem.pricing.cgst * qty;
    sgst += cartItem.pricing.sgst * qty;
    igst += cartItem.pricing.igst * qty;
    totalTax += cartItem.pricing.totalTax * qty;
  }

  subtotal = roundCurrency(subtotal);
  totalItemDiscount = roundCurrency(totalItemDiscount);
  const totalDiscount = roundCurrency(totalItemDiscount + overallDiscount);
  const taxableAmount = roundCurrency(subtotal - totalDiscount);
  cgst = roundCurrency(cgst);
  sgst = roundCurrency(sgst);
  igst = roundCurrency(igst);
  totalTax = roundCurrency(totalTax);
  const grandTotal = roundCurrency(taxableAmount + totalTax);
  const amountPayable = roundCurrency(grandTotal - loyaltyRedemptionValue);

  return {
    subtotal,
    totalDiscount,
    taxableAmount,
    cgst,
    sgst,
    igst,
    totalTax,
    grandTotal,
    amountPayable: Math.max(0, amountPayable),
  };
}

/**
 * Get the current rate for a metal type from the rates array
 */
export function getMetalRate(rates: MetalRate[], metalType: string, purity: string): number {
  // Try to find exact match first
  const exactMatch = rates.find(r => r.metalType === metalType && r.purity === purity);
  if (exactMatch) return exactMatch.ratePerGram;

  // For gold, find the 24K rate and calculate
  if (metalType === 'Gold') {
    const gold24k = rates.find(r => r.metalType === 'Gold' && r.purity === '24K');
    if (gold24k) return gold24k.ratePerGram;
  }

  // Find any rate for the metal type
  const metalMatch = rates.find(r => r.metalType === metalType);
  return metalMatch?.ratePerGram ?? 0;
}
