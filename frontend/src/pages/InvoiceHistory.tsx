import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Printer,
  Eye,
  Download,
  Filter,
  RotateCcw,
  User,
  Share2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { getInvoices } from '@/services/data-service';
import type { Invoice, PaymentStatus, PaymentMethod } from '@/types';

export default function InvoiceHistory() {
  const navigate = useNavigate();
  const invoices = getInvoices();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [methodFilter, setMethodFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter !== 'All' && inv.paymentStatus !== statusFilter) return false;
    if (methodFilter !== 'All') {
      const hasMethod = inv.payments.some(p => p.method === methodFilter);
      if (!hasMethod) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
      const matchCust = inv.customerName.toLowerCase().includes(q);
      const matchMobile = inv.customerMobile?.includes(q) || false;
      return matchNum || matchCust || matchMobile;
    }
    return true;
  });

  // Sorting newest first
  const sortedInvoices = [...filteredInvoices].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Pagination
  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);
  const paginatedInvoices = sortedInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Invoice Number',
      'Date',
      'Customer',
      'Mobile',
      'Items Count',
      'Grand Total',
      'Payment Status',
      'Payment Modes',
      'Cashier',
    ];
    const rows = sortedInvoices.map(inv => [
      inv.invoiceNumber,
      inv.date,
      `"${inv.customerName}"`,
      inv.customerMobile || '',
      inv.items.length,
      inv.grandTotal,
      inv.paymentStatus,
      `"${inv.payments.map(p => p.method).join(', ')}"`,
      inv.cashierName,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Jewellery_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8A8278]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by invoice #, customer name, mobile..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-md focus:outline-none focus:border-[#C9A96E] text-[#2D2A26]"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26]"
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
                <option value="Refunded">Refunded</option>
              </select>

              <select
                value={methodFilter}
                onChange={e => {
                  setMethodFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26]"
              >
                <option value="All">All Tender Modes</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Store Credit">Store Credit</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-9 text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Data Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-[#E5DDD0]">
          <div>
            <CardTitle className="text-base">All Store Invoices</CardTitle>
            <p className="text-xs text-[#8A8278]">{sortedInvoices.length} total invoice records found</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                <tr>
                  <th className="p-3 text-left font-semibold">Invoice #</th>
                  <th className="p-3 text-left font-semibold">Date & Time</th>
                  <th className="p-3 text-left font-semibold">Customer</th>
                  <th className="p-3 text-center font-semibold">Items</th>
                  <th className="p-3 text-right font-semibold">Grand Total</th>
                  <th className="p-3 text-left font-semibold">Payment Mode</th>
                  <th className="p-3 text-center font-semibold">Status</th>
                  <th className="p-3 text-left font-semibold">Cashier</th>
                  <th className="p-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs text-[#8A8278]">
                      No invoices match the specified criteria
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#2D2A26]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-3 text-[#8A8278]">
                        {formatDateTime(inv.date)}
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-[#2D2A26]">{inv.customerName}</p>
                        {inv.customerMobile && (
                          <p className="text-[10px] text-[#8A8278]">{inv.customerMobile}</p>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono font-medium">
                        {inv.items.length}
                      </td>
                      <td className="p-3 text-right font-serif font-bold text-sm text-[#2D2A26]">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {inv.payments.map((p, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px]">
                              {p.method}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={inv.paymentStatus === 'Paid' ? 'success' : 'warning'}
                          className="text-[10px]"
                        >
                          {inv.paymentStatus}
                        </Badge>
                      </td>
                      <td className="p-3 text-[#8A8278] text-[11px]">
                        {inv.cashierName}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                            className="h-7 px-2 text-xs text-[#C9A96E] hover:text-[#B89555] gap-1"
                            title="View & Print Invoice"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/returns?invoice=${inv.invoiceNumber}`)}
                            className="h-7 px-2 text-xs text-[#8A8278] hover:text-[#C53030] gap-1"
                            title="Initiate Return"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-[#E5DDD0] flex items-center justify-between text-xs text-[#8A8278]">
              <span>
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, sortedInvoices.length)} of {sortedInvoices.length} invoices
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <span className="px-3 py-1 font-mono">{currentPage} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
