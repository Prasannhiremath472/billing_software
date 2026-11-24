import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingBag,
  Award,
  BookOpen,
  RotateCcw,
  Receipt,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  getCustomerById,
  getInvoices,
  getReturns,
  getCustomerLedger,
  getLoyaltyTransactions,
} from '@/services/data-service';
import { usePOSStore } from '@/stores';

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setSelectedCustomer } = usePOSStore();
  const customer = id ? getCustomerById(id) : undefined;

  const allInvoices = getInvoices();
  const allReturns = getReturns();
  const ledgerEntries = id ? getCustomerLedger(id) : [];
  const allLoyaltyTx = getLoyaltyTransactions();

  const customerInvoices = allInvoices.filter(i => i.customerId === id);
  const customerReturns = allReturns.filter(r => r.customerId === id);
  const customerLoyalty = allLoyaltyTx.filter(l => l.customerId === id);

  const lifetimePointsEarned = customerLoyalty
    .filter(tx => tx.type === 'Earned')
    .reduce((sum, tx) => sum + tx.points, 0) || (customer?.loyaltyPoints || 0);

  const lifetimePointsRedeemed = customerLoyalty
    .filter(tx => tx.type === 'Redeemed')
    .reduce((sum, tx) => sum + tx.points, 0);

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold">Customer Not Found</h2>
        <Button onClick={() => navigate('/customers')} className="mt-4">Back to Directory</Button>
      </div>
    );
  }

  const handleStartBillForCustomer = () => {
    setSelectedCustomer(customer);
    navigate('/pos');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Profile Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-[#E5DDD0]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/customers')} className="text-xs gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <div className="h-10 w-10 rounded-full bg-[#C9A96E]/20 text-[#8F6F2C] flex items-center justify-center font-bold text-sm">
            {customer.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg font-bold text-[#2D2A26]">{customer.fullName}</h2>
              <Badge variant="gold" className="text-[10px]">{customer.category}</Badge>
            </div>
            <p className="text-xs text-[#8A8278]">{customer.mobile} • {customer.city}, {customer.state}</p>
          </div>
        </div>

        <Button size="sm" onClick={handleStartBillForCustomer} className="gap-1.5 shadow-xs">
          <ShoppingBag className="h-4 w-4" /> Start New Bill
        </Button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Lifetime Spent
            </span>
            <p className="font-serif text-xl font-bold text-[#2D2A26] mt-1">
              {formatCurrency(customer.totalSpent)}
            </p>
            <span className="text-[10px] text-[#8A8278]">{customer.totalPurchases} completed purchases</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Available Loyalty Points
            </span>
            <p className="font-serif text-xl font-bold text-emerald-800 mt-1">
              {customer.loyaltyPoints} Pts
            </p>
            <div className="flex items-center justify-between text-[10px] text-[#8A8278] mt-1 pt-1 border-t border-[#E5DDD0]">
              <span>Earned: <strong className="text-[#C9A96E]">{lifetimePointsEarned}</strong></span>
              <span>Redeemed: <strong className="text-[#8F6F2C]">{lifetimePointsRedeemed}</strong></span>
            </div>
            <span className="text-[10px] text-emerald-700 block mt-0.5">
              Value: ₹{(customer.loyaltyPoints * 0.1).toFixed(0)} (100 pts = ₹10)
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Outstanding Balance
            </span>
            <p className="font-serif text-xl font-bold text-[#C53030] mt-1">
              {formatCurrency(customer.outstandingBalance)}
            </p>
            <span className="text-[10px] text-red-700">Khata credit due</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Store Credit
            </span>
            <p className="font-serif text-xl font-bold text-emerald-800 mt-1">
              {formatCurrency(customer.storeCredit)}
            </p>
            <span className="text-[10px] text-emerald-700">Available return credit</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed History Views */}
      <Tabs defaultValue="invoices">
        <TabsList className="bg-white border border-[#E5DDD0]">
          <TabsTrigger value="invoices" className="gap-1.5 text-xs">
            <Receipt className="h-3.5 w-3.5" /> Purchase Invoices ({customerInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Account Ledger ({ledgerEntries.length})
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="gap-1.5 text-xs">
            <Award className="h-3.5 w-3.5" /> Loyalty Log ({customerLoyalty.length})
          </TabsTrigger>
          <TabsTrigger value="returns" className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Returns & Exchanges ({customerReturns.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Invoices */}
        <TabsContent value="invoices">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                    <tr>
                      <th className="p-3 text-left font-semibold">Invoice #</th>
                      <th className="p-3 text-left font-semibold">Date</th>
                      <th className="p-3 text-center font-semibold">Items</th>
                      <th className="p-3 text-right font-semibold">Amount</th>
                      <th className="p-3 text-center font-semibold">Status</th>
                      <th className="p-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F0E8]">
                    {customerInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-[#8A8278]">No invoices recorded</td>
                      </tr>
                    ) : (
                      customerInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-[#FAF7F2]/60">
                          <td className="p-3 font-mono font-bold text-[#2D2A26]">{inv.invoiceNumber}</td>
                          <td className="p-3 text-[#8A8278]">{formatDateTime(inv.date)}</td>
                          <td className="p-3 text-center font-mono">{inv.items.length}</td>
                          <td className="p-3 text-right font-serif font-bold text-[#2D2A26]">{formatCurrency(inv.grandTotal)}</td>
                          <td className="p-3 text-center">
                            <Badge variant={inv.paymentStatus === 'Paid' ? 'success' : 'warning'} className="text-[10px]">
                              {inv.paymentStatus}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/invoices/${inv.id}`)}
                              className="h-6 text-[11px] text-[#C9A96E]"
                            >
                              View Bill
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Ledger */}
        <TabsContent value="ledger">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                    <tr>
                      <th className="p-3 text-left font-semibold">Date</th>
                      <th className="p-3 text-left font-semibold">Description</th>
                      <th className="p-3 text-right font-semibold">Debit (+)</th>
                      <th className="p-3 text-right font-semibold">Credit (-)</th>
                      <th className="p-3 text-right font-semibold">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F0E8]">
                    {ledgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-[#8A8278]">No ledger transactions recorded</td>
                      </tr>
                    ) : (
                      ledgerEntries.map(entry => (
                        <tr key={entry.id} className="hover:bg-[#FAF7F2]/60 font-mono">
                          <td className="p-3 text-[#8A8278] font-sans">{formatDateTime(entry.date)}</td>
                          <td className="p-3 font-sans text-[#2D2A26]">{entry.description}</td>
                          <td className="p-3 text-right text-[#C53030]">
                            {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                          </td>
                          <td className="p-3 text-right text-emerald-800">
                            {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                          </td>
                          <td className="p-3 text-right font-bold text-[#2D2A26]">
                            {formatCurrency(entry.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Loyalty Log */}
        <TabsContent value="loyalty">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                    <tr>
                      <th className="p-3 text-left font-semibold">Date</th>
                      <th className="p-3 text-left font-semibold">Event</th>
                      <th className="p-3 text-center font-semibold">Type</th>
                      <th className="p-3 text-right font-semibold">Points</th>
                      <th className="p-3 text-right font-semibold">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F0E8]">
                    {customerLoyalty.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-[#8A8278]">No loyalty points activity</td>
                      </tr>
                    ) : (
                      customerLoyalty.map(tx => (
                        <tr key={tx.id} className="hover:bg-[#FAF7F2]/60">
                          <td className="p-3 text-[#8A8278]">{formatDateTime(tx.date)}</td>
                          <td className="p-3 text-[#2D2A26]">{tx.description}</td>
                          <td className="p-3 text-center">
                            <Badge variant={tx.type === 'Earned' ? 'success' : 'secondary'} className="text-[10px]">
                              {tx.type}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {tx.type === 'Earned' ? `+${tx.points}` : `-${tx.points}`}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-800">{tx.balance}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Returns */}
        <TabsContent value="returns">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                    <tr>
                      <th className="p-3 text-left font-semibold">Return Voucher</th>
                      <th className="p-3 text-left font-semibold">Original Invoice</th>
                      <th className="p-3 text-left font-semibold">Date</th>
                      <th className="p-3 text-right font-semibold">Refund Value</th>
                      <th className="p-3 text-left font-semibold">Settlement Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F0E8]">
                    {customerReturns.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-[#8A8278]">No return vouchers on record</td>
                      </tr>
                    ) : (
                      customerReturns.map(ret => (
                        <tr key={ret.id} className="hover:bg-[#FAF7F2]/60">
                          <td className="p-3 font-mono font-bold text-[#2D2A26]">{ret.returnNumber}</td>
                          <td className="p-3 font-mono text-[#8A8278]">{ret.originalInvoiceNumber}</td>
                          <td className="p-3 text-[#8A8278]">{formatDateTime(ret.date)}</td>
                          <td className="p-3 text-right font-serif font-bold text-[#C53030]">
                            {formatCurrency(ret.totalRefundAmount)}
                          </td>
                          <td className="p-3">
                            <Badge variant="secondary" className="text-[10px]">{ret.refundMethod}</Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
