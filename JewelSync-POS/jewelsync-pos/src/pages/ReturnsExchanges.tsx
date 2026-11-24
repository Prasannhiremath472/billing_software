import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Receipt,
  CreditCard,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatWeight, generateId } from '@/lib/utils';
import {
  getInvoices,
  getReturns,
  addReturn,
  addCreditNote,
  updateJewelleryItem,
  getJewelleryItemById,
} from '@/services/data-service';
import { useAppStore } from '@/stores';
import type { Invoice, InvoiceItem, ReturnReason, PaymentMethod, ReturnRecord } from '@/types';

export default function ReturnsExchanges() {
  const [searchParams] = useSearchParams();
  const prefilledInvoiceNum = searchParams.get('invoice');
  const navigate = useNavigate();
  const { currentUser } = useAppStore();

  const allInvoices = getInvoices();
  const pastReturns = getReturns();

  const [invoiceQuery, setInvoiceQuery] = useState(prefilledInvoiceNum || '');
  const [matchedInvoice, setMatchedInvoice] = useState<Invoice | null>(
    prefilledInvoiceNum ? allInvoices.find(i => i.invoiceNumber === prefilledInvoiceNum) || null : null
  );
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [reason, setReason] = useState<ReturnReason>('Customer Request');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod | 'Store Credit'>('Store Credit');
  const [customRefundAmt, setCustomRefundAmt] = useState<number>(0);
  const [returnNotes, setReturnNotes] = useState('');
  const [successRecord, setSuccessRecord] = useState<ReturnRecord | null>(null);
  const [error, setError] = useState('');

  const selectedItem = matchedInvoice?.items.find(i => i.id === selectedItemId);

  const handleInvoiceSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const found = allInvoices.find(
      i => i.invoiceNumber.toLowerCase() === invoiceQuery.trim().toLowerCase()
    );
    if (found) {
      setMatchedInvoice(found);
      setSelectedItemId(found.items[0]?.id || '');
      setCustomRefundAmt(found.items[0]?.totalPrice || 0);
    } else {
      setError(`Invoice "${invoiceQuery}" not found in database.`);
      setMatchedInvoice(null);
    }
  };

  const handleProcessReturn = () => {
    if (!matchedInvoice || !selectedItem) {
      setError('Please select an invoice item to return.');
      return;
    }
    if (customRefundAmt <= 0 || customRefundAmt > selectedItem.totalPrice) {
      setError(`Refund amount must be between ₹1 and original purchase value (${formatCurrency(selectedItem.totalPrice)})`);
      return;
    }

    const retNumber = `RET-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const retId = generateId('ret');
    const creditNoteId = refundMethod === 'Store Credit' ? generateId('cn') : undefined;

    // 1. Create Return Record
    const newReturn: ReturnRecord = {
      id: retId,
      returnNumber: retNumber,
      originalInvoiceId: matchedInvoice.id,
      originalInvoiceNumber: matchedInvoice.invoiceNumber,
      customerId: matchedInvoice.customerId,
      customerName: matchedInvoice.customerName,
      date: new Date().toISOString(),
      items: [
        {
          id: generateId('ri'),
          jewelleryItemId: selectedItem.jewelleryItemId,
          name: selectedItem.name,
          itemCode: selectedItem.itemCode,
          originalPrice: selectedItem.totalPrice,
          refundAmount: customRefundAmt,
          reason,
        },
      ],
      totalRefundAmount: customRefundAmt,
      refundMethod,
      reason,
      notes: returnNotes || undefined,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      creditNoteId,
    };

    addReturn(newReturn);

    // 2. If Store Credit, create Credit Note
    if (refundMethod === 'Store Credit') {
      const cnNumber = `CN-${retNumber.slice(4)}`;
      addCreditNote({
        id: creditNoteId!,
        creditNoteNumber: cnNumber,
        originalInvoiceId: matchedInvoice.id,
        originalInvoiceNumber: matchedInvoice.invoiceNumber,
        customerId: matchedInvoice.customerId,
        customerName: matchedInvoice.customerName,
        date: new Date().toISOString(),
        amount: customRefundAmt,
        reason: `Return voucher against ${matchedInvoice.invoiceNumber}`,
        usedAmount: 0,
        remainingAmount: customRefundAmt,
        isActive: true,
      });
    }

    // 3. Update jewellery stock status (restock returned piece as Available)
    const physicalItem = getJewelleryItemById(selectedItem.jewelleryItemId);
    if (physicalItem) {
      updateJewelleryItem({
        ...physicalItem,
        stockStatus: 'Available',
        stockQuantity: (physicalItem.stockQuantity || 0) + 1,
      });
    }

    setSuccessRecord(newReturn);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Search Invoice Card */}
      <Card>
        <CardHeader className="pb-3 border-b border-[#E5DDD0]">
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-[#C9A96E]" />
            <span>Process Return or Exchange</span>
          </CardTitle>
          <CardDescription>
            Search original bill number to verify purchase date, weights and return eligibility
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleInvoiceSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8A8278]" />
              <Input
                placeholder="Enter original invoice # (e.g. INV-2611-0001)..."
                value={invoiceQuery}
                onChange={e => setInvoiceQuery(e.target.value)}
                className="pl-9 font-mono"
              />
            </div>
            <Button type="submit">Search Invoice</Button>
          </form>

          {error && (
            <p className="text-xs text-red-600 mt-2 font-medium flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Success Notification */}
      {successRecord && (
        <Card className="border-emerald-200 bg-emerald-50/50 p-6 animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h3 className="font-serif font-bold text-base text-emerald-900">
                Return Processed Successfully!
              </h3>
              <p className="text-xs text-emerald-800">
                Voucher <strong className="font-mono">{successRecord.returnNumber}</strong> recorded for{' '}
                <strong>{formatCurrency(successRecord.totalRefundAmount)}</strong> via {successRecord.refundMethod}.
                Item has been marked back in stock.
              </p>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => setSuccessRecord(null)} className="text-xs">
                  Process Another Return
                </Button>
                {successRecord.refundMethod === 'Store Credit' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/credit-notes')}
                    className="text-xs"
                  >
                    View Credit Notes
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Return Workflow Form (When invoice found) */}
      {matchedInvoice && !successRecord && (
        <Card className="border-[#C9A96E]/40">
          <CardHeader className="pb-3 border-b border-[#E5DDD0]">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-sm">Original Bill: {matchedInvoice.invoiceNumber}</CardTitle>
                <p className="text-xs text-[#8A8278] mt-0.5">
                  Billed to: <strong className="text-[#2D2A26]">{matchedInvoice.customerName}</strong> on{' '}
                  {new Date(matchedInvoice.date).toLocaleDateString('en-IN')}
                </p>
              </div>
              <Badge variant="success" className="text-xs">
                Verified Bill
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4 text-xs">
            {/* Step 1: Select Item to Return */}
            <div>
              <Label required>Select Purchased Item to Return</Label>
              <div className="space-y-2">
                {matchedInvoice.items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setCustomRefundAmt(item.totalPrice);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      selectedItemId === item.id
                        ? 'border-[#C9A96E] bg-[#C9A96E]/10'
                        : 'border-[#E5DDD0] bg-white hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-xs text-[#2D2A26]">{item.name}</p>
                      <p className="text-[10px] text-[#8A8278] font-mono">
                        {item.itemCode} • {item.purity} • Gr: {formatWeight(item.grossWeight)} • Net: {formatWeight(item.netWeight)}
                        {item.huid ? ` • HUID: ${item.huid}` : ''}
                      </p>
                    </div>
                    <span className="font-serif font-bold text-sm text-[#2D2A26]">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Return Reason & Refund Method */}
            {selectedItem && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#F5F0E8]">
                <div>
                  <Label required>Reason for Return</Label>
                  <Select
                    value={reason}
                    onChange={e => setReason(e.target.value as ReturnReason)}
                    options={[
                      { value: 'Customer Request', label: 'Customer Request / Size Preference' },
                      { value: 'Exchange', label: 'Exchange for Higher Value Item' },
                      { value: 'Defective', label: 'Manufacturing Defect / Clasp Issue' },
                      { value: 'Wrong Item', label: 'Wrong Item Delivered' },
                      { value: 'Other', label: 'Other Reason' },
                    ]}
                  />
                </div>

                <div>
                  <Label required>Refund / Settlement Tender</Label>
                  <Select
                    value={refundMethod}
                    onChange={e => setRefundMethod(e.target.value as any)}
                    options={[
                      { value: 'Store Credit', label: 'Store Credit Voucher (Credit Note)' },
                      { value: 'Cash', label: 'Cash Refund' },
                      { value: 'UPI', label: 'UPI Reversal' },
                      { value: 'Card', label: 'Card Refund' },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Refund Amount */}
            {selectedItem && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label required>Refund Value to Credit (₹)</Label>
                  <Input
                    type="number"
                    value={customRefundAmt}
                    onChange={e => setCustomRefundAmt(Number(e.target.value) || 0)}
                    className="font-mono font-bold text-sm"
                  />
                  <p className="text-[10px] text-[#8A8278] mt-1">
                    Max eligible refund: {formatCurrency(selectedItem.totalPrice)}
                  </p>
                </div>

                <div>
                  <Label>Staff Internal Notes</Label>
                  <Input
                    placeholder="Inspection remarks, weight confirmation..."
                    value={returnNotes}
                    onChange={e => setReturnNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setMatchedInvoice(null)}>Cancel</Button>
            <Button onClick={handleProcessReturn} className="gap-2 shadow-xs">
              <CheckCircle2 className="h-4 w-4" /> Issue Return & Restock Piece
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Recent Returns Log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Return Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                <tr>
                  <th className="p-3 text-left font-semibold">Return Voucher</th>
                  <th className="p-3 text-left font-semibold">Original Invoice</th>
                  <th className="p-3 text-left font-semibold">Customer</th>
                  <th className="p-3 text-right font-semibold">Refund Amount</th>
                  <th className="p-3 text-left font-semibold">Tender</th>
                  <th className="p-3 text-left font-semibold">Reason</th>
                  <th className="p-3 text-left font-semibold">Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {pastReturns.map(ret => (
                  <tr key={ret.id} className="hover:bg-[#FAF7F2]/60">
                    <td className="p-3 font-mono font-bold text-[#2D2A26]">{ret.returnNumber}</td>
                    <td className="p-3 font-mono text-[#8A8278]">{ret.originalInvoiceNumber}</td>
                    <td className="p-3 font-medium text-[#2D2A26]">{ret.customerName}</td>
                    <td className="p-3 text-right font-serif font-bold text-[#C53030]">
                      {formatCurrency(ret.totalRefundAmount)}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-[10px]">{ret.refundMethod}</Badge>
                    </td>
                    <td className="p-3 text-[#8A8278]">{ret.reason}</td>
                    <td className="p-3 text-[#8A8278]">{ret.cashierName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
