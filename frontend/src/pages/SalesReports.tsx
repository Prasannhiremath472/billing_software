import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  Receipt,
  DollarSign,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getInvoices, getReturns } from '@/services/data-service';

export default function SalesReports() {
  const allInvoices = getInvoices();
  const allReturns = getReturns();

  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'week'>('all');

  const filteredInvoices = allInvoices;

  // Key metrics
  const totalSales = filteredInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalBills = filteredInvoices.length;
  const avgBill = totalBills > 0 ? Math.round(totalSales / totalBills) : 0;
  const totalReturnsVal = allReturns.reduce((sum, r) => sum + r.totalRefundAmount, 0);
  const netRevenue = totalSales - totalReturnsVal;

  // Category sales breakdown
  const categorySalesMap: Record<string, number> = {};
  filteredInvoices.flatMap(i => i.items).forEach(item => {
    categorySalesMap[item.category] = (categorySalesMap[item.category] || 0) + item.totalPrice;
  });

  const categoryChartData = Object.entries(categorySalesMap)
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 7);

  // Metal sales breakdown
  const metalSalesMap: Record<string, number> = {};
  filteredInvoices.flatMap(i => i.items).forEach(item => {
    metalSalesMap[item.metalType] = (metalSalesMap[item.metalType] || 0) + item.totalPrice;
  });

  const metalChartData = Object.entries(metalSalesMap).map(([name, value]) => ({ name, value }));
  const METAL_COLORS = ['#C9A96E', '#4A6FA5', '#2D6A4F', '#8A8278'];

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Invoice Number', 'Date', 'Customer', 'Items', 'Grand Total', 'Status'];
    const rows = filteredInvoices.map(i => [
      i.invoiceNumber,
      i.date,
      `"${i.customerName}"`,
      i.items.length,
      i.grandTotal,
      i.paymentStatus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Sales_Summary_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#E5DDD0]">
        <div>
          <h2 className="font-serif text-lg font-bold text-[#2D2A26] flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#C9A96E]" />
            <span>Sales Analytics & Business Intelligence</span>
          </h2>
          <p className="text-xs text-[#8A8278]">
            Multi-dimensional reporting across categories, metals, tender modes and returns
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export Full Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Gross Sales Revenue
            </span>
            <p className="font-serif text-xl font-bold text-[#2D2A26] mt-1">
              {formatCurrency(totalSales)}
            </p>
            <span className="text-[10px] text-[#8A8278]">{totalBills} total invoices generated</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Total Returns & Refunds
            </span>
            <p className="font-serif text-xl font-bold text-[#C53030] mt-1">
              -{formatCurrency(totalReturnsVal)}
            </p>
            <span className="text-[10px] text-red-700">{allReturns.length} return claims</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Net Sales Value
            </span>
            <p className="font-serif text-xl font-bold text-emerald-800 mt-1">
              {formatCurrency(netRevenue)}
            </p>
            <span className="text-[10px] text-emerald-700">Gross sales minus returns</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Average Ticket Size
            </span>
            <p className="font-serif text-xl font-bold text-[#C9A96E] mt-1">
              {formatCurrency(avgBill)}
            </p>
            <span className="text-[10px] text-[#8A8278]">Revenue per completed bill</span>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Revenue Bar Chart (7 Cols) */}
        <Card className="lg:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Performing Categories</CardTitle>
            <CardDescription>Revenue contribution by jewellery classification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5DDD0" />
                  <XAxis
                    dataKey="category"
                    stroke="#8A8278"
                    fontSize={10}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#8A8278"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={val => `₹${Math.round(val / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Revenue']}
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5DDD0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="revenue" fill="#C9A96E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Metal Share Pie Chart (5 Cols) */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Metal-Wise Distribution</CardTitle>
            <CardDescription>Volume share across Gold, Silver, Diamond & Platinum</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metalChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {metalChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={METAL_COLORS[index % METAL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Share Value']}
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5DDD0', borderRadius: '8px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
