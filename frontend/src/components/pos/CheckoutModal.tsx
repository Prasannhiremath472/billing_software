import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Banknote,
  Smartphone,
  CreditCard,
  Building,
  Coins,
  CheckCircle,
  Plus,
  Trash2,
  AlertCircle,
  MapPin,
  FileCheck2,
} from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import {
  formatCurrency,
  formatWeight,
  generateId,
  numberToWords,
} from '@/lib/utils';
import { usePOSStore, useAppStore } from '@/stores';
import {
  createInvoice,
  refreshData,
  getStoreInfo,
  type CheckoutPayload,
} from '@/services/data-service';
import { ApiError, errorMessage } from '@/services/api-client';
import type { PaymentMethod } from '@/types';

interface SplitLine {
  id: string;
  method: PaymentMethod;
  amount: number;
  referenceNumber: string;
}

export interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INDIAN_STATES = [
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Kerala', code: '32' },
  { name: 'Karnataka', code: '29' },
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Telangana', code: '36' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Delhi', code: '07' },
  { name: 'Gujarat', code: '24' },
  { name: 'Rajasthan', code: '08' },
  { name: 'West Bengal', code: '19' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Puducherry', code: '34' },
  { name: 'Goa', code: '30' },
  { name: 'Haryana', code: '06' },
  { name: 'Punjab', code: '03' },
  { name: 'Bihar', code: '10' },
  { name: 'Odisha', code: '21' },
  { name: 'Assam', code: '18' },
];

export function CheckoutModal({ open, onOpenChange }: CheckoutModalProps) {
  const navigate = useNavigate();
  const { items, selectedCustomer, billTotals, loyaltyPointsToRedeem, clearCart, notes } = usePOSStore();
  const { currentUser } = useAppStore();
  const storeInfo = getStoreInfo();

  // GST & Supply State
  const [selectedStateCode, setSelectedStateCode] = useState<string>('33'); // Default Tamil Nadu
  const [customerGstin, setCustomerGstin] = useState<string>('');
  const [taxMode, setTaxMode] = useState<'exclusive' | 'inclusive'>('exclusive');

  // Payments State
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>('single');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [cashReceived, setCashReceived] = useState<number>(billTotals.amountPayable);
  const [splitLines, setSplitLines] = useState<SplitLine[]>([]);
  const [allowCredit, setAllowCredit] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // One key per sale attempt: a retry or double-click returns the same invoice instead of billing twice
  const idempotencyKey = useRef(generateId('idem'));

  const selectedStateObj = INDIAN_STATES.find(s => s.code === selectedStateCode) || INDIAN_STATES[0];
  const isInterState = selectedStateCode !== '33'; // Store registered in Tamil Nadu (33)

  // Auto-set initial values when modal opens
  useEffect(() => {
    if (open) {
      // If customer has state, pick it, else default to TN (33)
      if (selectedCustomer?.state) {
        const found = INDIAN_STATES.find(
          s => s.name.toLowerCase() === selectedCustomer.state?.toLowerCase()
        );
        if (found) setSelectedStateCode(found.code);
        else setSelectedStateCode('33');
      } else {
        setSelectedStateCode('33');
      }

      setCustomerGstin(selectedCustomer?.gstin || '');
      setCashReceived(billTotals.amountPayable);
      setSplitLines([
        {
          id: '1',
          method: 'Cash',
          amount: Math.round(billTotals.amountPayable / 2),
          referenceNumber: '',
        },
        {
          id: '2',
          method: 'UPI',
          amount: billTotals.amountPayable - Math.round(billTotals.amountPayable / 2),
          referenceNumber: 'UPI-REF',
        },
      ]);
      setError('');
    }
  }, [open, billTotals.amountPayable, selectedCustomer]);

  // Recalculate CGST/SGST or IGST depending on Place of Supply
  const totalTaxable = billTotals.taxableAmount;
  const computedCGST = isInterState ? 0 : Math.round(totalTaxable * 0.015 * 100) / 100;
  const computedSGST = isInterState ? 0 : Math.round(totalTaxable * 0.015 * 100) / 100;
  const computedIGST = isInterState ? Math.round(totalTaxable * 0.03 * 100) / 100 : 0;
  const computedTotalTax = isInterState ? computedIGST : Math.round((computedCGST + computedSGST) * 100) / 100;


  const changeToReturn = Math.max(0, cashReceived - billTotals.amountPayable);
  const totalSplitCollected = splitLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const splitDifference = billTotals.amountPayable - totalSplitCollected;

  const handleAddSplitLine = () => {
    setSplitLines([
      ...splitLines,
      {
        id: generateId('split'),
        method: 'UPI',
        amount: Math.max(0, splitDifference),
        referenceNumber: '',
      },
    ]);
  };

  const handleRemoveSplitLine = (id: string) => {
    setSplitLines(splitLines.filter(l => l.id !== id));
  };

  const handleUpdateSplitLine = (id: string, field: keyof SplitLine, val: unknown) => {
    setSplitLines(
      splitLines.map(line => (line.id === id ? { ...line, [field]: val } : line))
    );
  };

  const handleCompleteSale = async () => {
    if (submitting) return;
    setError('');

    // Build the payment lines (the server re-validates everything and recomputes all amounts)
    let payments: CheckoutPayload['payments'] = [];
    if (paymentMode === 'single') {
      if (selectedMethod === 'Cash') {
        if (cashReceived < billTotals.amountPayable && !allowCredit) {
          setError(
            `Cash received (${formatCurrency(cashReceived)}) is less than total payable (${formatCurrency(billTotals.amountPayable)}). Select allow credit or collect full amount.`
          );
          return;
        }
        payments = [{ method: 'Cash', amount: Math.min(cashReceived, billTotals.amountPayable) }];
      } else {
        payments = [
          {
            method: selectedMethod,
            amount: billTotals.amountPayable,
            referenceNumber: referenceNumber || undefined,
          },
        ];
      }
    } else {
      if (Math.abs(splitDifference) > 1 && !allowCredit) {
        setError(
          `Split payments total (${formatCurrency(totalSplitCollected)}) does not match bill payable (${formatCurrency(billTotals.amountPayable)}). Difference: ${formatCurrency(Math.abs(splitDifference))}`
        );
        return;
      }
      payments = splitLines.map(line => ({
        method: line.method,
        amount: Number(line.amount) || 0,
        referenceNumber: line.referenceNumber || undefined,
      }));
    }

    const payload: CheckoutPayload = {
      customerId: selectedCustomer?.id,
      items: items.map(ci => ({
        jewelleryItemId: ci.jewelleryItemId,
        quantity: ci.quantity,
        itemDiscount: ci.itemDiscount,
        unitPriceOverride: ci.isPriceOverridden ? ci.unitPrice : undefined,
      })),
      loyaltyPointsToRedeem,
      placeOfSupplyCode: selectedStateObj.code,
      customerGstin: customerGstin.trim() || undefined,
      taxMode,
      payments,
      allowCredit,
      notes: notes || undefined,
    };

    setSubmitting(true);
    try {
      const invoice = await createInvoice(payload, idempotencyKey.current);
      idempotencyKey.current = generateId('idem');
      clearCart();
      onOpenChange(false);
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(errorMessage(err, 'Could not complete the sale. Please try again.'));
      // Stock or customer data changed elsewhere: bring the local copy up to date.
      if (err instanceof ApiError && (err.status === 409 || err.status === 422)) {
        void refreshData('jewelleryItems', 'customers').catch(() => undefined);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="max-w-2xl mx-auto space-y-4">
        <DialogHeader onClose={() => onOpenChange(false)}>
          <DialogTitle className="flex items-center gap-2">
            <span>Payment & Tax Invoice Settlement</span>
            <Badge variant="gold" className="font-mono text-xs">
              {items.length} Piece(s)
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {selectedCustomer ? (
              <span>
                Billing for: <strong className="text-[#2D2A26]">{selectedCustomer.fullName}</strong> ({selectedCustomer.mobile})
              </span>
            ) : (
              <span>
                Billing for: <strong className="text-[#2D2A26]">Walk-in Retail Customer</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* GST & PLACE OF SUPPLY RIBBON */}
        <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#C9A96E]" />
              <span className="font-serif font-bold text-xs text-[#2D2A26]">
                GST Supply Classification (Rule 46)
              </span>
            </div>
            <Badge
              variant={isInterState ? 'warning' : 'success'}
              className="text-[10px] font-mono"
            >
              {isInterState ? 'Inter-State (IGST 3%)' : 'Intra-State (CGST 1.5% + SGST 1.5%)'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <Label className="text-xs text-[#8A8278]">Place of Supply / Customer State</Label>
              <select
                value={selectedStateCode}
                onChange={e => setSelectedStateCode(e.target.value)}
                className="w-full h-8 px-2.5 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26] font-medium"
              >
                {INDIAN_STATES.map(s => (
                  <option key={s.code} value={s.code}>
                    {s.name} (State Code {s.code}) {s.code === '33' ? '• Supplier Home' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs text-[#8A8278]">Customer GSTIN (For B2B Invoice, Optional)</Label>
              <Input
                placeholder="e.g. 33AABCS1234F1ZP"
                value={customerGstin}
                onChange={e => setCustomerGstin(e.target.value.toUpperCase())}
                className="h-8 text-xs font-mono uppercase"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-[#8A8278]">
            <span>
              Registered Supplier: <strong>{storeInfo.name}</strong> • Tamil Nadu (33)
            </span>
            <span>Reverse Charge: <strong>No</strong></span>
          </div>
        </div>

        {/* Bill Total Summary Bar */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#FAF7F2] to-white border border-[#E5DDD0]">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs text-[#8A8278] uppercase font-bold tracking-wider block">
                Total Amount Payable
              </span>
              <p className="font-serif text-2xl font-bold text-[#C9A96E]">
                {formatCurrency(billTotals.amountPayable)}
              </p>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <p className="text-[#8A8278]">
                Taxable: <span className="font-medium text-[#2D2A26]">{formatCurrency(totalTaxable)}</span>
              </p>
              {!isInterState ? (
                <p className="text-[#8A8278]">
                  CGST (1.5%): <span className="font-medium text-[#2D2A26]">{formatCurrency(computedCGST)}</span> • SGST (1.5%): <span className="font-medium text-[#2D2A26]">{formatCurrency(computedSGST)}</span>
                </p>
              ) : (
                <p className="text-[#8A8278]">
                  IGST (3.0%): <span className="font-medium text-[#2D2A26]">{formatCurrency(computedIGST)}</span>
                </p>
              )}
              {loyaltyPointsToRedeem > 0 && (
                <p className="text-emerald-700 font-medium">Points Redeemed: -₹{loyaltyPointsToRedeem}</p>
              )}
            </div>
          </div>
          <p className="text-[11px] text-[#8A8278] mt-2 italic border-t border-[#E5DDD0] pt-2">
            {numberToWords(billTotals.amountPayable)}
          </p>
        </div>

        {/* Mode Selector: Single vs Split Payment */}
        <div className="flex gap-2 p-1 bg-[#FAF7F2] rounded-lg border border-[#E5DDD0]">
          <button
            type="button"
            onClick={() => setPaymentMode('single')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              paymentMode === 'single' ? 'bg-white text-[#2D2A26] shadow-xs' : 'text-[#8A8278] hover:text-[#2D2A26]'
            }`}
          >
            Single Payment Mode
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode('split')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              paymentMode === 'split' ? 'bg-white text-[#2D2A26] shadow-xs' : 'text-[#8A8278] hover:text-[#2D2A26]'
            }`}
          >
            Split Payment (Multi-Tender)
          </button>
        </div>

        {/* Single Mode Controls */}
        {paymentMode === 'single' ? (
          <div className="space-y-4">
            <div>
              <Label>Select Tender Mode</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { mode: 'Cash' as PaymentMethod, icon: Banknote },
                  { mode: 'UPI' as PaymentMethod, icon: Smartphone },
                  { mode: 'Card' as PaymentMethod, icon: CreditCard },
                  { mode: 'Bank Transfer' as PaymentMethod, icon: Building },
                ].map(({ mode, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSelectedMethod(mode)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                      selectedMethod === mode
                        ? 'border-[#C9A96E] bg-[#C9A96E]/10 text-[#8F6F2C] shadow-xs'
                        : 'border-[#E5DDD0] bg-white text-[#3D3A36] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-1 text-[#C9A96E]" />
                    <span>{mode}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cash details */}
            {selectedMethod === 'Cash' && (
              <div className="p-3.5 rounded-xl border border-[#E5DDD0] bg-[#FAF7F2]/60 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Cash Received from Customer</Label>
                    <Input
                      type="number"
                      value={cashReceived}
                      onChange={e => setCashReceived(Number(e.target.value) || 0)}
                      className="font-mono text-base font-semibold"
                    />
                  </div>
                  <div>
                    <Label>Change to Return</Label>
                    <div className="h-9 px-3 flex items-center rounded-md border border-[#E5DDD0] bg-white font-mono text-base font-bold text-emerald-700">
                      {formatCurrency(changeToReturn)}
                    </div>
                  </div>
                </div>

                {/* Quick denomination pills */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-[#8A8278]">Quick Tender:</span>
                  {[
                    billTotals.amountPayable,
                    Math.ceil(billTotals.amountPayable / 500) * 500,
                    Math.ceil(billTotals.amountPayable / 1000) * 1000,
                    Math.ceil(billTotals.amountPayable / 2000) * 2000,
                  ]
                    .filter((v, idx, arr) => arr.indexOf(v) === idx)
                    .map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashReceived(amt)}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-white border border-[#E5DDD0] hover:border-[#C9A96E] text-[#2D2A26]"
                      >
                        ₹{amt}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Non-cash reference number */}
            {selectedMethod !== 'Cash' && (
              <div>
                <Label>Transaction / UTR Reference Number (Optional)</Label>
                <Input
                  placeholder={`e.g. ${selectedMethod}-TXN-984210`}
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                />
              </div>
            )}
          </div>
        ) : (
          /* Split Mode Controls */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#3D3A36]">Split Tender Lines</span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSplitLine} className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Mode
              </Button>
            </div>

            <div className="space-y-2">
              {splitLines.map((line, idx) => (
                <div key={line.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E5DDD0] bg-white">
                  <span className="text-xs font-mono text-[#8A8278] w-4">#{idx + 1}</span>
                  <select
                    value={line.method}
                    onChange={e => handleUpdateSplitLine(line.id, 'method', e.target.value as PaymentMethod)}
                    className="h-8 px-2 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26]"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Store Credit">Store Credit</option>
                  </select>

                  <Input
                    type="number"
                    value={line.amount}
                    onChange={e => handleUpdateSplitLine(line.id, 'amount', Number(e.target.value) || 0)}
                    placeholder="Amount"
                    className="h-8 text-xs font-mono w-28"
                  />

                  <Input
                    type="text"
                    value={line.referenceNumber}
                    onChange={e => handleUpdateSplitLine(line.id, 'referenceNumber', e.target.value)}
                    placeholder="Ref / Txn #"
                    className="h-8 text-xs flex-1"
                  />

                  {splitLines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSplitLine(line.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Split status summary */}
            <div className="flex justify-between items-center p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-xs font-medium">
              <span>
                Total Allocated: <strong className="font-mono">{formatCurrency(totalSplitCollected)}</strong>
              </span>
              <span>
                Remaining:
                <strong className={`font-mono ml-1 ${splitDifference === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {formatCurrency(splitDifference)}
                </strong>
              </span>
            </div>
          </div>
        )}

        {/* Customer Balance / Credit toggle */}
        {selectedCustomer && (
          <div className="pt-2 border-t border-[#F5F0E8] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#2D2A26] block">Allow Credit / Khata Due</span>
              <span className="text-[11px] text-[#8A8278]">
                Current dues: {formatCurrency(selectedCustomer.outstandingBalance)}
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowCredit}
                onChange={e => setAllowCredit(e.target.checked)}
                className="h-4 w-4 rounded border-[#E5DDD0] text-[#C9A96E] focus:ring-[#C9A96E]"
              />
              <span className="text-xs font-medium text-[#2D2A26]">Allow Outstanding</span>
            </label>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back to Cart
          </Button>
          <Button onClick={() => void handleCompleteSale()} disabled={submitting} className="gap-2 shadow-xs">
            <CheckCircle className="h-4 w-4" /> {submitting ? 'Processing…' : 'Complete Sale & Print Tax Invoice'}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
