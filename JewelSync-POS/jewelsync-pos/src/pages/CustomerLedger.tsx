import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Printer,
  Search,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  User,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils';
import { getCustomers, getLedgerEntries, getStoreInfo } from '@/services/data-service';
import type { Customer, LedgerEntry } from '@/types';

export default function CustomerLedger() {
  const [searchParams] = useSearchParams();
  const preselectedCustId = searchParams.get('customer');
  const navigate = useNavigate();

  const customers = getCustomers();
  const allLedger = getLedgerEntries();
  const store = getStoreInfo();

  const [selectedCustId, setSelectedCustId] = useState<string>(
    preselectedCustId || customers.find(c => c.outstandingBalance > 0)?.id || customers[0]?.id || ''
  );

  const selectedCustomer = customers.find(c => c.id === selectedCustId);
  const customerEntries = allLedger.filter(l => l.customerId === selectedCustId);

  const totalDebit = customerEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = customerEntries.reduce((sum, e) => sum + e.credit, 0);
  const netBalance = selectedCustomer?.outstandingBalance ?? (totalDebit - totalCredit);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Control Ribbon */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-xl border border-[#E5DDD0]">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <label className="text-xs font-semibold text-[#8A8278] uppercase tracking-wider shrink-0">
            Customer Khata:
          </label>
          <select
            value={selectedCustId}
            onChange={e => setSelectedCustId(e.target.value)}
            className="w-full h-9 px-3 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26]"
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.fullName} ({c.mobile}) {c.outstandingBalance > 0 ? `• Dues: ₹${c.outstandingBalance}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {selectedCustomer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/customers/${selectedCustomer.id}`)}
              className="text-xs"
            >
              <User className="h-3.5 w-3.5 mr-1" /> Profile
            </Button>
          )}
          <Button size="sm" onClick={handlePrint} className="gap-1.5 shadow-xs">
            <Printer className="h-3.5 w-3.5" /> Print Account Statement
          </Button>
        </div>
      </div>

      {/* Statement Sheet */}
      <div className="bg-white border border-[#E5DDD0] rounded-xl p-6 shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-[#E5DDD0] mb-4">
          <div>
            <h1 className="font-serif text-lg font-bold text-[#2D2A26] uppercase">{store.name}</h1>
            <p className="text-[11px] text-[#8A8278]">{store.address}, {store.city}</p>
            <p className="text-[11px] text-[#8A8278]">GSTIN: {store.gstin}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C9A96E]">
              Customer Account Statement
            </span>
            <p className="text-xs text-[#8A8278] mt-1">Generated: {formatDate(new Date())}</p>
          </div>
        </div>

        {/* Customer Info Card */}
        {selectedCustomer && (
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
            <div>
              <span className="text-[#8A8278] block text-[10px] uppercase font-bold">Account Holder</span>
              <span className="font-semibold text-[#2D2A26] text-sm">{selectedCustomer.fullName}</span>
            </div>
            <div>
              <span className="text-[#8A8278] block text-[10px] uppercase font-bold">Contact Mobile</span>
              <span className="font-mono text-[#2D2A26]">{selectedCustomer.mobile}</span>
            </div>
            <div>
              <span className="text-[#8A8278] block text-[10px] uppercase font-bold">Account Category</span>
              <span className="text-[#2D2A26]">{selectedCustomer.category} Customer</span>
            </div>
            <div className="text-right">
              <span className="text-[#8A8278] block text-[10px] uppercase font-bold">Current Net Balance</span>
              <span className={`font-serif text-base font-bold ${netBalance > 0 ? 'text-[#C53030]' : 'text-emerald-800'}`}>
                {formatCurrency(netBalance)} {netBalance > 0 ? '(Dr Due)' : '(Clear)'}
              </span>
            </div>
          </div>
        )}

        {/* Ledger Transactions Table */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
              <tr>
                <th className="p-3 text-left font-semibold">Date & Time</th>
                <th className="p-3 text-left font-semibold">Description</th>
                <th className="p-3 text-left font-semibold">Reference</th>
                <th className="p-3 text-right font-semibold">Debit (+)</th>
                <th className="p-3 text-right font-semibold">Credit (-)</th>
                <th className="p-3 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F0E8] font-mono">
              {customerEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-[#8A8278] font-sans">
                    No ledger transactions recorded for this customer
                  </td>
                </tr>
              ) : (
                customerEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-[#FAF7F2]/60">
                    <td className="p-3 text-[#8A8278] font-sans">{formatDateTime(entry.date)}</td>
                    <td className="p-3 font-sans text-[#2D2A26] font-medium">{entry.description}</td>
                    <td className="p-3 text-[#8A8278] text-[11px]">{entry.referenceType || 'Entry'}</td>
                    <td className="p-3 text-right text-[#C53030]">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                    </td>
                    <td className="p-3 text-right text-emerald-800 font-medium">
                      {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-[#2D2A26]">
                      {formatCurrency(entry.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {customerEntries.length > 0 && (
              <tfoot className="border-t-2 border-[#2D2A26]/10 font-mono font-bold bg-[#FAF7F2]">
                <tr>
                  <td colSpan={3} className="p-3 font-sans uppercase text-[11px] text-[#2D2A26]">
                    Total Ledger Activity:
                  </td>
                  <td className="p-3 text-right text-[#C53030]">{formatCurrency(totalDebit)}</td>
                  <td className="p-3 text-right text-emerald-800">{formatCurrency(totalCredit)}</td>
                  <td className="p-3 text-right text-[#2D2A26]">{formatCurrency(netBalance)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer Note */}
        <div className="pt-4 border-t border-[#E5DDD0] flex justify-between items-center text-[10px] text-[#8A8278]">
          <p>This is a computer-generated account ledger statement from {store.name}.</p>
          <p>Customer Signature: _______________________</p>
        </div>
      </div>
    </div>
  );
}
