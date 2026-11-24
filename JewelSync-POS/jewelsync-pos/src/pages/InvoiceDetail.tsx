import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Printer,
  Share2,
  Mail,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Phone,
  MessageSquare,
  Copy,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatWeight,
  numberToWords,
} from '@/lib/utils';
import { getInvoiceById, getStoreInfo } from '@/services/data-service';
import type { InvoiceFormat, InvoiceItem } from '@/types';

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoice = id ? getInvoiceById(id) : undefined;
  const store = getStoreInfo();

  const [format, setFormat] = useState<InvoiceFormat>('A4');
  const [copied, setCopied] = useState(false);

  if (!invoice) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <h2 className="text-base font-semibold text-[#2D2A26]">Invoice Not Found</h2>
        <p className="text-xs text-[#8A8278] mt-1 mb-4">
          No invoice record matching ID "{id}" was found in local storage.
        </p>
        <Button onClick={() => navigate('/invoices')}>Back to Invoice History</Button>
      </div>
    );
  }

  const isInterState = invoice.isInterState || invoice.placeOfSupplyCode !== '33';
  const placeOfSupplyText = invoice.placeOfSupply || 'Tamil Nadu (33)';

  // Calculate aggregate weights if not stored
  const totalGrossWeight =
    invoice.totalGrossWeight ||
    invoice.items.reduce((s, i) => s + (i.grossWeight || 0) * (i.quantity || 1), 0);
  const totalNetWeight =
    invoice.totalNetWeight ||
    invoice.items.reduce((s, i) => s + (i.netWeight || 0) * (i.quantity || 1), 0);

  // Group items by HSN for HSN-wise GST Summary table
  interface HSNSummaryRow {
    hsn: string;
    description: string;
    taxableValue: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    totalTax: number;
  }

  const hsnMap: Record<string, HSNSummaryRow> = {};
  invoice.items.forEach(item => {
    const hsn =
      item.hsnCode ||
      (item.metalType === '1 Gram Gold' ||
      item.metalType === 'Imitation' ||
      item.category === '1 Gram Gold Jewellery' ||
      item.category === 'Imitation Jewellery'
        ? '7117'
        : item.category === 'Coins'
        ? '7118'
        : '7113');
    const desc =
      hsn === '7118'
        ? 'Coins & Bullion'
        : hsn === '7117'
        ? 'Imitation & 1gm Jewellery'
        : 'Articles of Jewellery';
    if (!hsnMap[hsn]) {
      hsnMap[hsn] = {
        hsn,
        description: desc,
        taxableValue: 0,
        cgstRate: isInterState ? 0 : 1.5,
        cgstAmount: 0,
        sgstRate: isInterState ? 0 : 1.5,
        sgstAmount: 0,
        igstRate: isInterState ? 3.0 : 0,
        igstAmount: 0,
        totalTax: 0,
      };
    }
    const itemTaxable = item.taxableValue || (item.totalPrice / 1.03);
    hsnMap[hsn].taxableValue += itemTaxable;
    if (isInterState) {
      const igst = Math.round(itemTaxable * 0.03 * 100) / 100;
      hsnMap[hsn].igstAmount += igst;
      hsnMap[hsn].totalTax += igst;
    } else {
      const cgst = Math.round(itemTaxable * 0.015 * 100) / 100;
      const sgst = Math.round(itemTaxable * 0.015 * 100) / 100;
      hsnMap[hsn].cgstAmount += cgst;
      hsnMap[hsn].sgstAmount += sgst;
      hsnMap[hsn].totalTax += cgst + sgst;
    }
  });

  const hsnSummaryList = Object.values(hsnMap);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = `Namaste ${invoice.customerName}! Thank you for your purchase at ${store.name}. Tax Invoice #${invoice.invoiceNumber} for amount ${formatCurrency(invoice.amountPayable || invoice.grandTotal)} has been issued.`;
    const url = `https://api.whatsapp.com/send?phone=${invoice.customerMobile ? `91${invoice.customerMobile}` : ''}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleEmailShare = () => {
    const subject = `Tax Invoice ${invoice.invoiceNumber} - ${store.name}`;
    const body = `Dear ${invoice.customerName},\n\nThank you for shopping at ${store.name}.\nInvoice No: ${invoice.invoiceNumber}\nDate: ${formatDateTime(invoice.date)}\nPlace of Supply: ${placeOfSupplyText}\nAmount: ${formatCurrency(invoice.amountPayable || invoice.grandTotal)}\n\nBest regards,\n${store.name}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Action Ribbon - Suppressed in print */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-xl border border-[#E5DDD0] shadow-2xs">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/invoices')}
            className="text-xs gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to History
          </Button>
          <span className="text-xs font-mono font-bold text-[#2D2A26] px-2.5 py-1 rounded bg-[#FAF7F2] border border-[#E5DDD0]">
            {invoice.invoiceNumber}
          </span>
          <Badge
            variant={invoice.paymentStatus === 'Paid' ? 'success' : 'warning'}
            className="text-[10px]"
          >
            {invoice.paymentStatus}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-mono">
            {isInterState ? 'IGST 3%' : 'CGST + SGST (1.5% each)'}
          </Badge>
        </div>

        {/* Format Selector & Print Actions */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-[#E5DDD0] p-0.5 bg-[#FAF7F2] text-xs">
            {(['A4', 'A5', '80mm', '58mm'] as InvoiceFormat[]).map(fmt => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  format === fmt
                    ? 'bg-white text-[#2D2A26] shadow-xs'
                    : 'text-[#8A8278] hover:text-[#2D2A26]'
                }`}
              >
                {fmt === 'A4'
                  ? 'A4 Tax Invoice'
                  : fmt === 'A5'
                  ? 'A5 Half'
                  : `${fmt} Thermal`}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={handlePrint} className="gap-1.5 shadow-xs">
            <Printer className="h-3.5 w-3.5" /> Print Invoice
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleWhatsAppShare}
            className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          >
            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
          </Button>

          <Button size="sm" variant="outline" onClick={handleEmailShare} className="gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Email
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyLink}
            title="Copy Direct Link"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied && <span className="text-[10px] text-emerald-700 ml-1">Copied!</span>}
          </Button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PRINTABLE INVOICE DOCUMENT (RULE 46 COMPLIANT) */}
      {/* ============================================================== */}
      <div
        id="printable-tax-invoice"
        className={`bg-white border border-[#2D2A26]/30 shadow-md rounded-xl mx-auto transition-all text-[#2D2A26] ${
          format === '80mm'
            ? 'max-w-[340px] p-4 text-[11px]'
            : format === '58mm'
            ? 'max-w-[260px] p-3 text-[10px]'
            : format === 'A5'
            ? 'max-w-2xl p-6 text-xs'
            : 'max-w-4xl p-8 text-xs'
        }`}
      >
        {/* ==================== A4 & A5 FULL TAX INVOICE ==================== */}
        {format === 'A4' || format === 'A5' ? (
          <div className="space-y-4">
            {/* Header: Legal / Trade Name, GSTIN & TAX INVOICE title */}
            <div className="border-b-2 border-[#2D2A26] pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-serif text-xl font-bold tracking-wide text-[#2D2A26] uppercase">
                    {store.legalName || 'Shree Lakshmi Jewellers Private Limited'}
                  </h1>
                  <p className="text-xs font-semibold text-[#8F6F2C]">
                    Trade Name: {store.tradeName || store.name}
                  </p>
                  <p className="text-[11px] text-[#5C564E] leading-relaxed mt-0.5">
                    {store.address}, {store.city}, {store.state} - {store.pincode}
                  </p>
                  <p className="text-[11px] text-[#5C564E]">
                    Phone: {store.phone} • Email: {store.email}
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-[#2D2A26] text-white font-bold text-sm tracking-wider uppercase rounded-xs mb-1">
                    TAX INVOICE
                  </div>
                  <p className="text-[10px] font-medium text-[#8A8278]">
                    (Under Rule 46 of CGST / SGST Rules, 2017)
                  </p>
                  <div className="mt-1 font-mono text-xs font-bold text-[#2D2A26]">
                    GSTIN: {store.gstin}
                  </div>
                  <p className="text-[11px] text-[#5C564E]">
                    State: <strong>{store.state}</strong> (Code: <strong>{store.stateCode || '33'}</strong>)
                  </p>
                </div>
              </div>
            </div>

            {/* Invoice Meta & Buyer Details Grid */}
            <div className="grid grid-cols-2 gap-4 border-b border-[#2D2A26]/30 pb-3 text-xs">
              {/* Left Column: Buyer Details */}
              <div className="pr-2 border-r border-[#E5DDD0]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8278] block mb-1">
                  Details of Receiver (Billed To):
                </span>
                <p className="font-serif font-bold text-sm text-[#2D2A26]">
                  {invoice.customerName || 'Walk-in Customer'}
                </p>
                {invoice.customerMobile && (
                  <p className="text-[#5C564E] mt-0.5">Mobile: {invoice.customerMobile}</p>
                )}
                {invoice.customerAddress && (
                  <p className="text-[#5C564E] mt-0.5">Address: {invoice.customerAddress}</p>
                )}
                <p className="text-[#5C564E] mt-0.5">
                  State: <strong>{invoice.customerState || store.state}</strong> (Code: <strong>{invoice.customerStateCode || store.stateCode || '33'}</strong>)
                </p>
                {invoice.customerGstin && (
                  <p className="font-mono text-xs font-bold text-[#8F6F2C] mt-1">
                    Buyer GSTIN: {invoice.customerGstin}
                  </p>
                )}
              </div>

              {/* Right Column: Invoice Meta */}
              <div className="pl-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#8A8278]">Invoice Number:</span>
                  <span className="font-mono font-bold text-sm text-[#2D2A26]">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8278]">Invoice Date & Time:</span>
                  <span className="font-mono text-[#2D2A26]">{formatDateTime(invoice.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8278]">Place of Supply:</span>
                  <span className="font-semibold text-[#2D2A26]">{placeOfSupplyText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8278]">Reverse Charge Applicable:</span>
                  <span className="font-bold text-[#2D2A26]">{invoice.reverseCharge || 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8278]">Billing Cashier:</span>
                  <span className="text-[#2D2A26]">{invoice.cashierName} (Counter 1)</span>
                </div>
              </div>
            </div>

            {/* ITEM TABLE (RULE 46 COMPLIANT) */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-[#2D2A26]">
                <thead className="bg-[#FAF7F2] text-[#2D2A26] border-b border-[#2D2A26] font-semibold">
                  <tr>
                    <th className="p-2 text-center w-8 border-r border-[#2D2A26]">#</th>
                    <th className="p-2 text-left border-r border-[#2D2A26]">Description of Goods</th>
                    <th className="p-2 text-center border-r border-[#2D2A26]">HSN</th>
                    <th className="p-2 text-center border-r border-[#2D2A26]">Purity</th>
                    <th className="p-2 text-right border-r border-[#2D2A26]">Gross Wt</th>
                    <th className="p-2 text-right border-r border-[#2D2A26]">Net Wt</th>
                    <th className="p-2 text-right border-r border-[#2D2A26]">Rate (₹/g)</th>
                    <th className="p-2 text-right border-r border-[#2D2A26]">Metal Value</th>
                    <th className="p-2 text-right border-r border-[#2D2A26]">Making (₹)</th>
                    <th className="p-2 text-right border-r border-[#2D2A26]">Taxable (₹)</th>
                    <th className="p-2 text-center border-r border-[#2D2A26]">GST %</th>
                    <th className="p-2 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DDD0]">
                  {invoice.items.map((item, idx) => {
                    const hsn = item.hsnCode || (item.category === 'Coins' ? '7118' : '7113');
                    return (
                      <tr key={item.id} className="text-[#2D2A26]">
                        <td className="p-2 text-center font-mono border-r border-[#E5DDD0]">{idx + 1}</td>
                        <td className="p-2 border-r border-[#E5DDD0]">
                          <p className="font-semibold">{item.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-[#8A8278] font-mono">
                            <span>Code: {item.itemCode}</span>
                            {item.huid && (
                              <span className="text-[#C9A96E] font-bold">HUID: {item.huid}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-center font-mono border-r border-[#E5DDD0] font-medium">{hsn}</td>
                        <td className="p-2 text-center border-r border-[#E5DDD0]">{item.purity}</td>
                        <td className="p-2 text-right font-mono border-r border-[#E5DDD0]">{formatWeight(item.grossWeight)}</td>
                        <td className="p-2 text-right font-mono font-medium border-r border-[#E5DDD0]">{formatWeight(item.netWeight)}</td>
                        <td className="p-2 text-right font-mono border-r border-[#E5DDD0]">{formatCurrency(item.metalRate)}</td>
                        <td className="p-2 text-right font-mono border-r border-[#E5DDD0]">{formatCurrency(item.metalValue)}</td>
                        <td className="p-2 text-right font-mono border-r border-[#E5DDD0]">{formatCurrency(item.makingCharges)}</td>
                        <td className="p-2 text-right font-mono font-bold border-r border-[#E5DDD0]">
                          {formatCurrency(item.taxableValue)}
                        </td>
                        <td className="p-2 text-center font-mono border-r border-[#E5DDD0]">3%</td>
                        <td className="p-2 text-right font-mono font-bold">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Aggregate Weights and Taxable Footer */}
                <tfoot className="bg-[#FAF7F2] font-semibold border-t border-[#2D2A26]">
                  <tr>
                    <td colSpan={4} className="p-2 text-right font-bold uppercase tracking-wider border-r border-[#2D2A26]">
                      Totals:
                    </td>
                    <td className="p-2 text-right font-mono font-bold border-r border-[#2D2A26]">
                      {formatWeight(totalGrossWeight)}
                    </td>
                    <td className="p-2 text-right font-mono font-bold border-r border-[#2D2A26]">
                      {formatWeight(totalNetWeight)}
                    </td>
                    <td colSpan={3} className="p-2 border-r border-[#2D2A26]"></td>
                    <td className="p-2 text-right font-mono font-bold text-[#2D2A26] border-r border-[#2D2A26]">
                      {formatCurrency(invoice.taxableAmount)}
                    </td>
                    <td className="p-2 text-center border-r border-[#2D2A26]">—</td>
                    <td className="p-2 text-right font-mono font-bold text-sm text-[#2D2A26]">
                      {formatCurrency(invoice.amountPayable || invoice.grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* HSN-WISE GST SUMMARY TABLE */}
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8278] block mb-1">
                HSN / SAC Wise GST Summary:
              </span>
              <table className="w-full text-xs border border-[#2D2A26]/40">
                <thead className="bg-[#FAF7F2] text-[#5C564E] border-b border-[#2D2A26]/40 font-semibold">
                  <tr>
                    <th className="p-1.5 text-center border-r border-[#E5DDD0]">HSN Code</th>
                    <th className="p-1.5 text-left border-r border-[#E5DDD0]">Description</th>
                    <th className="p-1.5 text-right border-r border-[#E5DDD0]">Taxable Value</th>
                    {!isInterState ? (
                      <>
                        <th className="p-1.5 text-right border-r border-[#E5DDD0]">CGST (1.5%)</th>
                        <th className="p-1.5 text-right border-r border-[#E5DDD0]">SGST (1.5%)</th>
                      </>
                    ) : (
                      <th className="p-1.5 text-right border-r border-[#E5DDD0]">IGST (3.0%)</th>
                    )}
                    <th className="p-1.5 text-right">Total Tax Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DDD0]">
                  {hsnSummaryList.map(row => (
                    <tr key={row.hsn} className="font-mono text-[11px]">
                      <td className="p-1.5 text-center font-bold border-r border-[#E5DDD0]">{row.hsn}</td>
                      <td className="p-1.5 text-left font-sans border-r border-[#E5DDD0]">{row.description}</td>
                      <td className="p-1.5 text-right border-r border-[#E5DDD0]">{formatCurrency(row.taxableValue)}</td>
                      {!isInterState ? (
                        <>
                          <td className="p-1.5 text-right border-r border-[#E5DDD0]">{formatCurrency(row.cgstAmount)}</td>
                          <td className="p-1.5 text-right border-r border-[#E5DDD0]">{formatCurrency(row.sgstAmount)}</td>
                        </>
                      ) : (
                        <td className="p-1.5 text-right border-r border-[#E5DDD0]">{formatCurrency(row.igstAmount)}</td>
                      )}
                      <td className="p-1.5 text-right font-bold">{formatCurrency(row.totalTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Amount in Words */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
              {/* Left Column: Words & Tender */}
              <div className="md:col-span-7 space-y-3">
                <div className="p-3 rounded-md bg-[#FAF7F2] border border-[#E5DDD0]">
                  <span className="text-[10px] uppercase font-bold text-[#8A8278] block">
                    Invoice Amount in Words:
                  </span>
                  <p className="font-serif font-bold text-xs text-[#2D2A26] mt-0.5 italic">
                    {numberToWords(invoice.amountPayable || invoice.grandTotal)}
                  </p>
                </div>

                {/* Tender Breakdown */}
                <div className="p-3 rounded-md border border-[#E5DDD0]">
                  <span className="text-[10px] uppercase font-bold text-[#8A8278] block mb-1">
                    Settlement & Payment Details:
                  </span>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {invoice.payments.map(p => (
                      <div key={p.id} className="flex items-center gap-1.5 bg-[#FAF7F2] px-2 py-1 rounded border border-[#E5DDD0]">
                        <span className="font-semibold text-[#2D2A26]">{p.method}:</span>
                        <span className="font-mono font-bold text-[#8F6F2C]">{formatCurrency(p.amount)}</span>
                        {p.referenceNumber && (
                          <span className="text-[10px] text-[#8A8278] font-mono">({p.referenceNumber})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Totals Summary Block */}
              <div className="md:col-span-5">
                <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#2D2A26]/30 space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#5C564E]">
                    <span>Total Taxable Amount:</span>
                    <span className="font-mono font-semibold text-[#2D2A26]">{formatCurrency(invoice.taxableAmount)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Special Discount:</span>
                      <span className="font-mono font-semibold">-{formatCurrency(invoice.discount)}</span>
                    </div>
                  )}
                  {!isInterState ? (
                    <>
                      <div className="flex justify-between text-[#5C564E]">
                        <span>CGST (1.5%):</span>
                        <span className="font-mono text-[#2D2A26]">{formatCurrency(invoice.cgst)}</span>
                      </div>
                      <div className="flex justify-between text-[#5C564E]">
                        <span>SGST (1.5%):</span>
                        <span className="font-mono text-[#2D2A26]">{formatCurrency(invoice.sgst)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-[#5C564E]">
                      <span>IGST (3.0%):</span>
                      <span className="font-mono text-[#2D2A26]">{formatCurrency(invoice.igst)}</span>
                    </div>
                  )}
                  {invoice.loyaltyRedemptionValue > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Loyalty Redemption:</span>
                      <span className="font-mono font-semibold">-{formatCurrency(invoice.loyaltyRedemptionValue)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#5C564E]">
                    <span>Round Off:</span>
                    <span className="font-mono text-[#2D2A26]">₹0.00</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-[#2D2A26] text-sm font-bold text-[#2D2A26]">
                    <span>Total Amount Payable:</span>
                    <span className="font-serif text-lg text-[#C9A96E]">
                      {formatCurrency(invoice.amountPayable || invoice.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Statutory Declarations & Hallmarking */}
            <div className="p-3 rounded-lg border border-[#E5DDD0] text-[11px] text-[#5C564E] space-y-1 leading-relaxed">
              <p>
                <strong>Statutory Declaration:</strong> Certified that the particulars given above are true and correct and the amount indicated represents the price actually charged and that there is no flow of additional consideration directly or indirectly from the buyer.
              </p>
              <p>
                <strong>Hallmarking Compliance:</strong> Gold jewellery items sold under this invoice are 100% certified under Bureau of Indian Standards (BIS) Hallmarking specifications with verified 6-digit HUID codes.
              </p>
              <p>
                <strong>Terms & Conditions:</strong> {store.returnPolicy}
              </p>
            </div>

            {/* Dual Signatures: Customer & Store */}
            <div className="grid grid-cols-2 gap-8 pt-6 text-xs">
              <div>
                <div className="w-48 border-b border-[#2D2A26]/40 pb-1 mb-1"></div>
                <p className="font-bold text-[#2D2A26]">Customer Signature / Acknowledgement</p>
                <p className="text-[10px] text-[#8A8278]">Received the articles in good condition</p>
              </div>

              <div className="text-right flex flex-col items-end">
                <div className="w-48 border-b border-[#2D2A26]/40 pb-1 mb-1"></div>
                <p className="font-bold text-[#2D2A26]">For {store.name}</p>
                <p className="text-[10px] text-[#8A8278]">Authorized Signatory</p>
              </div>
            </div>
          </div>
        ) : (
          /* ==================== THERMAL RECEIPT (80mm & 58mm) ==================== */
          <div className="space-y-3 font-mono leading-tight">
            {/* Store Header */}
            <div className="text-center pb-2 border-b border-dashed border-gray-400">
              <p className="font-serif font-bold text-sm tracking-wide uppercase">{store.name}</p>
              <p className="text-[10px]">{store.address}, {store.city}</p>
              <p className="text-[10px]">GSTIN: {store.gstin}</p>
              <p className="text-[10px]">State: {store.state} (33)</p>
              <p className="font-bold text-xs uppercase mt-1">*** TAX INVOICE ***</p>
            </div>

            {/* Bill Info */}
            <div className="text-[10px] space-y-0.5 border-b border-dashed border-gray-400 pb-2">
              <div className="flex justify-between">
                <span>Inv: {invoice.invoiceNumber}</span>
                <span>{formatDate(invoice.date)}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer: {invoice.customerName}</span>
                <span>{invoice.customerMobile || ''}</span>
              </div>
              <div>POS: Tamil Nadu (33) • RCM: No</div>
            </div>

            {/* Items */}
            <div className="border-b border-dashed border-gray-400 pb-2 space-y-1.5 text-[10px]">
              {invoice.items.map((i, idx) => (
                <div key={i.id}>
                  <div className="flex justify-between font-bold">
                    <span>{idx + 1}. {i.name}</span>
                    <span>{formatCurrency(i.totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-700">
                    <span>{i.purity} • NW: {i.netWeight}g</span>
                    <span>Rate: {i.metalRate}/g</span>
                  </div>
                  {i.huid && <div className="text-[8px] text-gray-600">HUID: {i.huid}</div>}
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="text-[10px] space-y-1 border-b border-dashed border-gray-400 pb-2">
              <div className="flex justify-between">
                <span>Taxable Amount:</span>
                <span>{formatCurrency(invoice.taxableAmount)}</span>
              </div>
              {!isInterState ? (
                <>
                  <div className="flex justify-between">
                    <span>CGST (1.5%):</span>
                    <span>{formatCurrency(invoice.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST (1.5%):</span>
                    <span>{formatCurrency(invoice.sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span>IGST (3.0%):</span>
                  <span>{formatCurrency(invoice.igst)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-300">
                <span>GRAND TOTAL:</span>
                <span>{formatCurrency(invoice.amountPayable || invoice.grandTotal)}</span>
              </div>
            </div>

            {/* Payment & Sign */}
            <div className="text-center text-[9px] space-y-1 pt-1">
              <p>Tender: {invoice.payments.map(p => `${p.method}: ${formatCurrency(p.amount)}`).join(', ')}</p>
              <p className="italic">All gold items are BIS Hallmarked.</p>
              <p className="mt-2 font-bold">{store.thankYouMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* PRINT STYLING (@media print) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          #printable-tax-invoice,
          #printable-tax-invoice * {
            visibility: visible;
          }
          #printable-tax-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: ${format === 'A4' ? 'A4 portrait' : format === 'A5' ? 'A5 landscape' : '80mm auto'};
            margin: 5mm;
          }
        }
      `}</style>
    </div>
  );
}
