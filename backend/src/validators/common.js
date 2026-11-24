import { z } from 'zod';

export const METAL_TYPES = ['Gold', 'Silver', 'Platinum', 'Diamond', '1 Gram Gold', 'Imitation', 'Other'];
export const CATEGORIES = [
  'Gold Rings', 'Gold Necklaces', 'Gold Chains', 'Bangles', 'Earrings', 'Bracelets', 'Pendants', 'Mangalsutra',
  'Diamond Jewellery', 'Silver Jewellery', 'Platinum Jewellery', '1 Gram Gold Jewellery', 'Imitation Jewellery',
  'Coins', 'Other',
];
export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Store Credit', 'Other'];
export const STOCK_STATUSES = ['Available', 'Sold', 'Reserved', 'Returned', 'On Approval'];
export const CUSTOMER_CATEGORIES = ['Regular', 'Premium', 'Wholesale', 'Walk-in'];
export const REPAIR_STATUSES = ['Received', 'Under Inspection', 'In Progress', 'Ready for Collection', 'Delivered'];
export const RETURN_REASONS = ['Defective', 'Wrong Item', 'Customer Request', 'Exchange', 'Other'];
export const MAKING_TYPES = ['percentage', 'per_gram', 'fixed'];
export const WASTAGE_TYPES = ['percentage', 'fixed_weight', 'fixed_amount'];
export const ROLE_VALUES = ['Admin', 'Manager', 'Cashier'];

// --- primitives ---
export const id = z.string().trim().min(1).max(40);
export const shortText = (max = 200) => z.string().trim().max(max);
export const reqText = (max = 200) => z.string().trim().min(1, 'Required').max(max);
/** Optional text: empty string / null become undefined. */
export const optText = (max = 200) =>
  z.preprocess(v => (v === '' || v === null ? undefined : v), z.string().trim().max(max).optional());
export const money = z.number().finite().min(0).max(1_000_000_000);
export const weight = z.number().finite().min(0).max(1_000_000);
export const intQty = z.number().int().min(0).max(1_000_000);
export const optMoney = z.preprocess(v => (v === null ? undefined : v), money.optional());
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Expected YYYY-MM-DD').transform(s => s.slice(0, 10));
export const mobile = z
  .string()
  .trim()
  .regex(/^[0-9+][0-9\s-]{6,14}$/, 'Enter a valid mobile number');
export const optEmail = z.preprocess(
  v => (v === '' || v === null ? undefined : v),
  z.string().trim().max(190).email('Enter a valid email address').optional()
);

export const idParam = z.object({ id });
