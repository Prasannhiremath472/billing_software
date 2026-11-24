import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Search,
  CheckCircle,
  Clock,
  Printer,
  ShoppingBag,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { getCreditNotes, getStoreInfo } from '@/services/data-service';
import type { CreditNote } from '@/types';

export default function CreditNotes() {
  const navigate = useNavigate();
  const creditNotes = getCreditNotes();
  const store = getStoreInfo();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<string>('All');

  const filteredNotes = creditNotes.filter(cn => {
    if (filterActive === 'Active' && !cn.isActive) return false;
    if (filterActive === 'Consumed' && cn.isActive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        cn.creditNoteNumber.toLowerCase().includes(q) ||
        cn.customerName.toLowerCase().includes(q) ||
        cn.originalInvoiceNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalActiveCredit = creditNotes
    .filter(cn => cn.isActive)
    .reduce((sum, cn) => sum + cn.remainingAmount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#E5DDD0]">
        <div>
          <h2 className="font-serif text-lg font-bold text-[#2D2A26] flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#C9A96E]" />
            <span>Customer Credit Notes & Vouchers</span>
          </h2>
          <p className="text-xs text-[#8A8278]">
            Valid store credit vouchers issued for jewellery returns and trade-in adjustments
          </p>
        </div>

        <div className="px-4 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-right">
          <span className="text-[10px] text-[#8A8278] uppercase font-bold tracking-wider block">
            Total Active Store Credit
          </span>
          <span className="font-serif font-bold text-base text-emerald-800">
            {formatCurrency(totalActiveCredit)}
          </span>
        </div>
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
                placeholder="Search by voucher #, customer or invoice..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-md focus:outline-none focus:border-[#C9A96E] text-[#2D2A26]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterActive}
                onChange={e => setFilterActive(e.target.value)}
                className="h-9 px-3 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26]"
              >
                <option value="All">All Vouchers</option>
                <option value="Active">Active Unredeemed</option>
                <option value="Consumed">Fully Consumed</option>
              </select>

              <Button size="sm" onClick={() => navigate('/returns')} variant="outline" className="text-xs">
                Issue New Voucher
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Notes Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-[#E5DDD0]">
          <CardTitle className="text-base">Store Credit Notes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                <tr>
                  <th className="p-3 text-left font-semibold">Credit Note #</th>
                  <th className="p-3 text-left font-semibold">Issue Date</th>
                  <th className="p-3 text-left font-semibold">Customer</th>
                  <th className="p-3 text-left font-semibold">Original Invoice</th>
                  <th className="p-3 text-right font-semibold">Total Amount</th>
                  <th className="p-3 text-right font-semibold">Used Amount</th>
                  <th className="p-3 text-right font-semibold">Remaining Credit</th>
                  <th className="p-3 text-center font-semibold">Status</th>
                  <th className="p-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {filteredNotes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs text-[#8A8278]">
                      No credit note vouchers match the specified filter
                    </td>
                  </tr>
                ) : (
                  filteredNotes.map(note => (
                    <tr key={note.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="p-3 font-mono font-bold text-[#2D2A26]">{note.creditNoteNumber}</td>
                      <td className="p-3 text-[#8A8278]">{formatDateTime(note.date)}</td>
                      <td className="p-3 font-medium text-[#2D2A26]">{note.customerName}</td>
                      <td className="p-3 font-mono text-[#8A8278]">{note.originalInvoiceNumber}</td>
                      <td className="p-3 text-right font-serif font-bold text-[#2D2A26]">
                        {formatCurrency(note.amount)}
                      </td>
                      <td className="p-3 text-right font-mono text-[#8A8278]">
                        {formatCurrency(note.usedAmount)}
                      </td>
                      <td className="p-3 text-right font-serif font-bold text-emerald-800">
                        {formatCurrency(note.remainingAmount)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={note.isActive ? 'success' : 'secondary'} className="text-[10px]">
                          {note.isActive ? 'Active' : 'Consumed'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {note.isActive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate('/pos')}
                            className="h-6 text-[11px] text-[#C9A96E] hover:text-[#B89555]"
                            title="Apply on POS Bill"
                          >
                            Redeem on POS
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
