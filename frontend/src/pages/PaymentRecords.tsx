import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Search,
  Download,
  Filter,
  CreditCard,
  Building,
  Smartphone,
  Banknote,
  Eye,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { getPayments } from '@/services/data-service';
import type { Payment, PaymentMethod } from '@/types';

export default function PaymentRecords() {
  const navigate = useNavigate();
  const allPayments = getPayments();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const filteredPayments = allPayments.filter(p => {
    if (methodFilter !== 'All' && p.method !== methodFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const sortedPayments = [...filteredPayments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalPages = Math.ceil(sortedPayments.length / itemsPerPage);
  const paginatedPayments = sortedPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalCollected = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  // Method totals
  const cashTotal = allPayments.filter(p => p.method === 'Cash').reduce((s, p) => s + p.amount, 0);
  const upiTotal = allPayments.filter(p => p.method === 'UPI').reduce((s, p) => s + p.amount, 0);
  const cardTotal = allPayments.filter(p => p.method === 'Card').reduce((s, p) => s + p.amount, 0);
  const bankTotal = allPayments.filter(p => p.method === 'Bank Transfer').reduce((s, p) => s + p.amount, 0);

  const handleExportCSV = () => {
    const headers = ['Txn ID', 'Invoice #', 'Customer', 'Method', 'Amount', 'Ref Number', 'Date', 'Cashier'];
    const rows = sortedPayments.map(p => [
      p.id,
      p.invoiceNumber,
      `"${p.customerName}"`,
      p.method,
      p.amount,
      p.referenceNumber || '',
      p.date,
      p.cashierName,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `Payment_Records_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Tender Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8278] block">Cash Drawer</span>
              <p className="font-serif text-lg font-bold text-emerald-800 mt-0.5">{formatCurrency(cashTotal)}</p>
            </div>
            <Banknote className="h-6 w-6 text-emerald-600/40" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8278] block">UPI / QR</span>
              <p className="font-serif text-lg font-bold text-[#C9A96E] mt-0.5">{formatCurrency(upiTotal)}</p>
            </div>
            <Smartphone className="h-6 w-6 text-[#C9A96E]/40" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8278] block">POS Card EDC</span>
              <p className="font-serif text-lg font-bold text-[#4A6FA5] mt-0.5">{formatCurrency(cardTotal)}</p>
            </div>
            <CreditCard className="h-6 w-6 text-[#4A6FA5]/40" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8278] block">Bank Transfers</span>
              <p className="font-serif text-lg font-bold text-[#2D2A26] mt-0.5">{formatCurrency(bankTotal)}</p>
            </div>
            <Building className="h-6 w-6 text-[#8A8278]/40" />
          </CardContent>
        </Card>
      </div>

      {/* Control Ribbon */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8A8278]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by invoice #, customer name or ref code..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-md focus:outline-none focus:border-[#C9A96E] text-[#2D2A26]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={methodFilter}
                onChange={e => setMethodFilter(e.target.value)}
                className="h-9 px-3 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26]"
              >
                <option value="All">All Payment Modes</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>

              <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 text-xs gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-[#E5DDD0] flex flex-row items-center justify-between">
          <CardTitle className="text-base">Payment Transactions Log</CardTitle>
          <span className="text-xs text-[#8A8278]">
            Total in view: <strong className="font-serif text-sm text-[#2D2A26] ml-1">{formatCurrency(totalCollected)}</strong>
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                <tr>
                  <th className="p-3 text-left font-semibold">Date & Time</th>
                  <th className="p-3 text-left font-semibold">Invoice #</th>
                  <th className="p-3 text-left font-semibold">Customer</th>
                  <th className="p-3 text-left font-semibold">Payment Mode</th>
                  <th className="p-3 text-right font-semibold">Amount</th>
                  <th className="p-3 text-left font-semibold">Reference #</th>
                  <th className="p-3 text-left font-semibold">Cashier</th>
                  <th className="p-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {paginatedPayments.map(p => (
                  <tr key={p.id} className="hover:bg-[#FAF7F2]/60">
                    <td className="p-3 text-[#8A8278]">{formatDateTime(p.date)}</td>
                    <td className="p-3 font-mono font-bold text-[#2D2A26]">{p.invoiceNumber}</td>
                    <td className="p-3 font-medium text-[#2D2A26]">{p.customerName}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-[10px]">{p.method}</Badge>
                    </td>
                    <td className="p-3 text-right font-serif font-bold text-[#2D2A26]">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-[#8A8278]">{p.referenceNumber || '-'}</td>
                    <td className="p-3 text-[#8A8278]">{p.cashierName}</td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/invoices/${p.invoiceId}`)}
                        className="h-6 text-[11px] text-[#C9A96E]"
                      >
                        <Eye className="h-3 w-3 mr-1" /> Bill
                      </Button>
                    </td>
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
