import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Clock,
  ShoppingCart,
  Gem,
  Barcode,
  Users,
  Lock,
  Coins,
  ArrowRight,
  Eye,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  getInvoices,
  getCustomers,
} from '@/services/data-service';

export default function Dashboard() {
  const navigate = useNavigate();

  const invoices = getInvoices();
  const customers = getCustomers();

  // Exact 4 KPIs
  // 1. Today's Sales (grand total of invoices)
  const todaySalesRevenue = invoices.reduce((sum, inv) => sum + (inv.amountPayable || inv.grandTotal), 0);
  // 2. Total Bills
  const totalBillsCount = invoices.length;
  // 3. Average Bill Value
  const avgBillValue = totalBillsCount > 0 ? Math.round(todaySalesRevenue / totalBillsCount) : 0;
  // 4. Pending Dues (total customer outstanding balance)
  const totalCustomerDues = customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);

  // Recent Transactions (sorted newest first)
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Store Information & Shift Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-[#FAF7F2] via-white to-[#FAF7F2] border border-[#E5DDD0] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#C9A96E]/20 text-[#8F6F2C] flex items-center justify-center font-bold">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold text-[#2D2A26]">
              Shree Lakshmi Jewellers — POS Terminal
            </h1>
            <p className="text-xs text-[#8A8278]">
              GST Registered Store • Tamil Nadu (Code 33) • 1 Gram Jewellery Retail
            </p>
          </div>
        </div>

        {/* Shift and Register Status */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-[#E5DDD0]">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-[#8A8278]">Register:</span>
            <span className="font-semibold text-[#2D2A26]">Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-[#E5DDD0]">
            <span className="text-[#8A8278]">Cashier:</span>
            <span className="font-semibold text-[#2D2A26]">Priya Sharma</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-[#E5DDD0]">
            <span className="text-[#8A8278]">Retail Type:</span>
            <span className="font-semibold text-[#C9A96E]">1 Gram Jewellery</span>
          </div>
        </div>
      </div>

      {/* EXACT 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Sales */}
        <Card className="hover:shadow-xs transition-shadow border-[#E5DDD0]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8278]">
                Today's Sales
              </span>
              <div className="h-9 w-9 rounded-lg bg-[#2D6A4F]/10 text-[#2D6A4F] flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-[#2D2A26] tracking-tight">
                {formatCurrency(todaySalesRevenue)}
              </span>
              <p className="text-[11px] text-[#2D6A4F] font-medium mt-1">
                Total gross billings settled today
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Bills */}
        <Card className="hover:shadow-xs transition-shadow border-[#E5DDD0]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8278]">
                Total Bills
              </span>
              <div className="h-9 w-9 rounded-lg bg-[#C9A96E]/15 text-[#8F6F2C] flex items-center justify-center">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-[#2D2A26] tracking-tight">
                {totalBillsCount}
              </span>
              <p className="text-[11px] text-[#8A8278] mt-1">
                Completed invoices in register
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Average Bill Value */}
        <Card className="hover:shadow-xs transition-shadow border-[#E5DDD0]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8278]">
                Average Bill Value
              </span>
              <div className="h-9 w-9 rounded-lg bg-[#4A6FA5]/10 text-[#4A6FA5] flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-[#2D2A26] tracking-tight">
                {formatCurrency(avgBillValue)}
              </span>
              <p className="text-[11px] text-[#8A8278] mt-1">
                Average ticket size per customer
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Pending Dues */}
        <Card className="hover:shadow-xs transition-shadow border-[#E5DDD0]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8278]">
                Pending Dues
              </span>
              <div className="h-9 w-9 rounded-lg bg-[#C53030]/10 text-[#C53030] flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-serif text-2xl font-bold text-[#C53030] tracking-tight">
                {formatCurrency(totalCustomerDues)}
              </span>
              <p className="text-[11px] text-[#8A8278] mt-1">
                Outstanding balance in customer khata
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QUICK ACTIONS BAR */}
      <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-[#8A8278]">
            Quick Operations
          </h3>
          <span className="text-[11px] text-[#8A8278]">Direct keyboard-ready shortcuts</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <Button
            onClick={() => navigate('/pos')}
            className="h-11 flex items-center justify-center gap-2 bg-[#C9A96E] hover:bg-[#B8985D] text-white shadow-xs font-medium text-xs"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>New Bill (POS)</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/catalogue')}
            className="h-11 flex items-center justify-center gap-2 border-[#E5DDD0] hover:bg-[#FAF7F2] text-[#2D2A26] text-xs"
          >
            <Gem className="h-4 w-4 text-[#C9A96E]" />
            <span>Catalogue</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/barcode')}
            className="h-11 flex items-center justify-center gap-2 border-[#E5DDD0] hover:bg-[#FAF7F2] text-[#2D2A26] text-xs"
          >
            <Barcode className="h-4 w-4 text-[#8A8278]" />
            <span>Barcode & Labels</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/customers')}
            className="h-11 flex items-center justify-center gap-2 border-[#E5DDD0] hover:bg-[#FAF7F2] text-[#2D2A26] text-xs"
          >
            <Users className="h-4 w-4 text-[#8A8278]" />
            <span>Customers</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/old-gold')}
            className="h-11 flex items-center justify-center gap-2 border-[#E5DDD0] hover:bg-[#FAF7F2] text-[#2D2A26] text-xs"
          >
            <Coins className="h-4 w-4 text-amber-600" />
            <span>Old Gold</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/daily-closing')}
            className="h-11 flex items-center justify-center gap-2 border-[#E5DDD0] hover:bg-[#FAF7F2] text-[#2D2A26] text-xs"
          >
            <Lock className="h-4 w-4 text-[#8A8278]" />
            <span>Daily Closing</span>
          </Button>
        </div>
      </div>

      {/* RECENT TRANSACTIONS TABLE */}
      <Card className="border-[#E5DDD0]">
        <div className="p-4 flex items-center justify-between border-b border-[#E5DDD0] bg-[#FAF7F2]/40">
          <div>
            <h2 className="font-serif text-sm font-bold text-[#2D2A26]">Recent Invoices</h2>
            <p className="text-[11px] text-[#8A8278]">Latest retail billing transactions and payment settlements</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/invoices')}
            className="text-xs text-[#8F6F2C] hover:text-[#2D2A26] gap-1"
          >
            <span>View All Invoices</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
              <tr>
                <th className="p-3 text-left font-semibold">Invoice No</th>
                <th className="p-3 text-left font-semibold">Date & Time</th>
                <th className="p-3 text-left font-semibold">Customer</th>
                <th className="p-3 text-left font-semibold">Items</th>
                <th className="p-3 text-left font-semibold">Payment Mode</th>
                <th className="p-3 text-center font-semibold">Status</th>
                <th className="p-3 text-right font-semibold">Total Amount</th>
                <th className="p-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F0E8]">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-[#8A8278]">
                    No transactions recorded today
                  </td>
                </tr>
              ) : (
                recentInvoices.map(inv => {
                  const paymentMethods = Array.from(new Set(inv.payments.map(p => p.method)));
                  const itemCount = inv.items.reduce((sum, i) => sum + i.quantity, 0);

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-[#FAF7F2]/60 transition-colors cursor-pointer"
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                      <td className="p-3 font-mono font-bold text-[#2D2A26]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-3 text-[#8A8278] whitespace-nowrap">
                        {formatDateTime(inv.date)}
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-[#2D2A26] block">
                          {inv.customerName || 'Walk-in Customer'}
                        </span>
                        {inv.customerMobile && (
                          <span className="text-[10px] text-[#8A8278]">
                            {inv.customerMobile}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-[#8A8278]">
                        <span className="font-mono text-[#2D2A26] font-medium">{itemCount}</span> items
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {paymentMethods.map(method => (
                            <Badge
                              key={method}
                              variant="secondary"
                              className="text-[10px] font-normal px-1.5 py-0"
                            >
                              {method}
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
                      <td className="p-3 text-right font-mono font-bold text-sm text-[#2D2A26]">
                        {formatCurrency(inv.amountPayable || inv.grandTotal)}
                      </td>
                      <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="h-7 px-2 text-xs text-[#8A8278] hover:text-[#2D2A26]"
                          title="View Tax Invoice"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
