import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Users,
  Award,
  DollarSign,
  Phone,
  Eye,
  BookOpen,
  Filter,
  Sparkles,
  ShoppingBag,
  Sliders,
  CheckCircle2,
  Gift,
  TrendingUp,
  Receipt,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { QuickCustomerModal } from '@/components/pos/QuickCustomerModal';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  getCustomers,
  getLoyaltyTransactions,
  getLoyaltyConfig,
  saveLoyaltyConfig,
  getInvoices,
} from '@/services/data-service';
import { usePOSStore } from '@/stores';
import type { Customer, CustomerCategory, LoyaltyConfig, LoyaltyTransaction } from '@/types';

export default function CustomerManagement() {
  const navigate = useNavigate();
  const { setSelectedCustomer } = usePOSStore();
  const [activeTab, setActiveTab] = useState('directory');

  const [customers, setCustomers] = useState<Customer[]>(() => getCustomers());
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>(() => getLoyaltyTransactions());
  const [loyaltyConfig, setConfigState] = useState<LoyaltyConfig>(() => getLoyaltyConfig());
  const [invoices] = useState(() => getInvoices());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Selected customer for Profile Viewer tab
  const [selectedProfileId, setSelectedProfileId] = useState<string>(customers[0]?.id || '');

  // Loyalty Config Form state
  // pointsPerRupee: 0.01 means ₹100 = 1 pt (spendPerPoint = 1 / 0.01 = 100)
  const initialSpendPerPoint = loyaltyConfig.pointsPerRupee > 0 ? Math.round(1 / loyaltyConfig.pointsPerRupee) : 100;
  // pointValue: 0.1 means 100 points = ₹10 (valuePer100 = 0.1 * 100 = 10)
  const initialValuePer100 = Math.round((loyaltyConfig.pointValue || 0.1) * 100);

  const [spendPerPoint, setSpendPerPoint] = useState<number>(initialSpendPerPoint);
  const [pointsPerSpend, setPointsPerSpend] = useState<number>(1);
  const [pointsToRedeem100, setPointsToRedeem100] = useState<number>(100);
  const [discountValue100, setDiscountValue100] = useState<number>(initialValuePer100);
  const [minRedeem, setMinRedeem] = useState<number>(loyaltyConfig.minRedemptionPoints || 50);
  const [maxRedeemPercent, setMaxRedeemPercent] = useState<number>(loyaltyConfig.maxRedemptionPercentage || 20);
  const [configSavedSuccess, setConfigSavedSuccess] = useState(false);

  // Filter customers for directory
  const filteredCustomers = customers.filter(c => {
    if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.fullName.toLowerCase().includes(q);
      const matchMobile = c.mobile.includes(q);
      const matchCity = c.city?.toLowerCase().includes(q) || false;
      return matchName || matchMobile || matchCity;
    }
    return true;
  });

  // KPI aggregates
  const totalSpentAll = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalDuesAll = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);

  // Loyalty Dashboard Aggregates
  const totalLoyaltyMembers = customers.filter(c => (c.loyaltyPoints || 0) > 0 || c.totalPurchases > 0).length;
  const totalPointsEarned = transactions
    .filter(t => t.type === 'Earned')
    .reduce((sum, t) => sum + t.points, 0);
  const totalPointsRedeemed = transactions
    .filter(t => t.type === 'Redeemed')
    .reduce((sum, t) => sum + t.points, 0);

  // Top Loyalty Members (ranked by points balance)
  const topLoyaltyMembers = [...customers]
    .sort((a, b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0))
    .slice(0, 5);

  // Active customer for profile tab
  const activeCustomer = customers.find(c => c.id === selectedProfileId) || customers[0];
  const activeCustomerLoyalty = activeCustomer
    ? transactions.filter(t => t.customerId === activeCustomer.id)
    : [];
  const activeCustomerInvoices = activeCustomer
    ? invoices.filter(inv => inv.customerId === activeCustomer.id)
    : [];
  const activeCustomerEarned = activeCustomerLoyalty
    .filter(t => t.type === 'Earned')
    .reduce((sum, t) => sum + t.points, 0) || (activeCustomer?.loyaltyPoints || 0);
  const activeCustomerRedeemed = activeCustomerLoyalty
    .filter(t => t.type === 'Redeemed')
    .reduce((sum, t) => sum + t.points, 0);

  // Save Loyalty Rules handler
  const handleSaveLoyaltyRules = (e: React.FormEvent) => {
    e.preventDefault();
    const newPointsPerRupee = spendPerPoint > 0 ? pointsPerSpend / spendPerPoint : 0.01;
    const newPointValue = pointsToRedeem100 > 0 ? discountValue100 / pointsToRedeem100 : 0.1;

    const newConfig: LoyaltyConfig = {
      ...loyaltyConfig,
      pointsPerRupee: newPointsPerRupee,
      pointValue: newPointValue,
      minRedemptionPoints: minRedeem,
      maxRedemptionPercentage: maxRedeemPercent,
    };

    saveLoyaltyConfig(newConfig);
    setConfigState(newConfig);
    setConfigSavedSuccess(true);
    setTimeout(() => setConfigSavedSuccess(false), 3000);
  };

  const handleResetToDefaultRules = () => {
    const defaultConfig: LoyaltyConfig = {
      pointsPerRupee: 0.01, // 1 pt per ₹100
      pointValue: 0.1, // 100 pts = ₹10
      minRedemptionPoints: 50,
      maxRedemptionPercentage: 20,
      slabs: [
        { minSpend: 0, maxSpend: 10000, pointsMultiplier: 1 },
        { minSpend: 10000, maxSpend: 50000, pointsMultiplier: 1.5 },
        { minSpend: 50000, maxSpend: Infinity, pointsMultiplier: 2 },
      ],
    };
    saveLoyaltyConfig(defaultConfig);
    setConfigState(defaultConfig);
    setSpendPerPoint(100);
    setPointsPerSpend(1);
    setPointsToRedeem100(100);
    setDiscountValue100(10);
    setMinRedeem(50);
    setMaxRedeemPercent(20);
    setConfigSavedSuccess(true);
    setTimeout(() => setConfigSavedSuccess(false), 3000);
  };

  const handleStartBill = (cust: Customer) => {
    setSelectedCustomer(cust);
    navigate('/pos');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Customer Summary KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-[#E5DDD0]">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Registered Customers
            </span>
            <p className="font-serif text-xl font-bold text-[#2D2A26] mt-1">{customers.length}</p>
            <span className="text-[10px] text-[#8A8278]">Profiles in CRM database</span>
          </CardContent>
        </Card>

        <Card className="border-[#E5DDD0]">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Lifetime Spend (All)
            </span>
            <p className="font-serif text-xl font-bold text-[#C9A96E] mt-1">
              {formatCurrency(totalSpentAll)}
            </p>
            <span className="text-[10px] text-[#8A8278]">Gross customer value</span>
          </CardContent>
        </Card>

        <Card className="border-[#E5DDD0]">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Total Outstanding Khata
            </span>
            <p className="font-serif text-xl font-bold text-amber-800 mt-1">
              {formatCurrency(totalDuesAll)}
            </p>
            <span className="text-[10px] text-amber-700">Pending customer ledger dues</span>
          </CardContent>
        </Card>

        <Card className="border-[#E5DDD0]">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Total Loyalty Points
            </span>
            <p className="font-serif text-xl font-bold text-emerald-800 mt-1">
              {totalLoyaltyPoints} Pts
            </p>
            <span className="text-[10px] text-emerald-700">
              Worth ₹{(totalLoyaltyPoints * (loyaltyConfig.pointValue || 0.1)).toFixed(0)} rewards
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5DDD0]">
          <TabsList className="bg-white border border-[#E5DDD0] h-10 p-1">
            <TabsTrigger value="directory" className="gap-2 text-xs font-medium px-4">
              <Users className="h-3.5 w-3.5 text-[#C9A96E]" />
              <span>Customer Directory</span>
            </TabsTrigger>
            <TabsTrigger value="profiles" className="gap-2 text-xs font-medium px-4">
              <UserCheck className="h-3.5 w-3.5 text-[#C9A96E]" />
              <span>Customer Profiles</span>
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="gap-2 text-xs font-medium px-4">
              <Award className="h-3.5 w-3.5 text-[#C9A96E]" />
              <span>Loyalty Points</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2 text-xs font-medium px-4">
              <Sparkles className="h-3.5 w-3.5 text-[#C9A96E]" />
              <span>Transaction History</span>
            </TabsTrigger>
          </TabsList>

          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="h-9 text-xs gap-1.5 shadow-xs bg-[#C9A96E] hover:bg-[#B89555] text-white"
          >
            <UserPlus className="h-3.5 w-3.5" /> Register Customer
          </Button>
        </div>

        {/* ========================================================
            TAB 1: CUSTOMER DIRECTORY
           ======================================================== */}
        <TabsContent value="directory" className="space-y-4 mt-4">
          {/* Search and Filter Ribbon */}
          <Card className="border-[#E5DDD0]">
            <CardContent className="p-3">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8A8278]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by customer name, mobile or city..."
                    className="w-full h-9 pl-9 pr-3 text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-md focus:outline-none focus:border-[#C9A96E] text-[#2D2A26]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="h-9 px-3 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26]"
                  >
                    <option value="All">All Categories</option>
                    <option value="Regular">Regular</option>
                    <option value="Premium">Premium VIP</option>
                    <option value="Wholesale">Wholesale</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Directory Table */}
          <Card className="border-[#E5DDD0]">
            <CardHeader className="pb-3 border-b border-[#E5DDD0] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Customer Accounts Directory</CardTitle>
                <CardDescription>Verified retail client records and accounts</CardDescription>
              </div>
              <span className="text-xs text-[#8A8278]">
                Showing {filteredCustomers.length} of {customers.length}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                    <tr>
                      <th className="p-3 text-left font-semibold">Customer</th>
                      <th className="p-3 text-left font-semibold">Mobile & City</th>
                      <th className="p-3 text-center font-semibold">Category</th>
                      <th className="p-3 text-right font-semibold">Lifetime Spend</th>
                      <th className="p-3 text-center font-semibold">Purchases</th>
                      <th className="p-3 text-right font-semibold">Loyalty Pts</th>
                      <th className="p-3 text-right font-semibold">Outstanding Dues</th>
                      <th className="p-3 text-right font-semibold">Store Credit</th>
                      <th className="p-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F0E8]">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-xs text-[#8A8278]">
                          No customers found matching the search criteria
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map(cust => (
                        <tr key={cust.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                          <td className="p-3">
                            <p className="font-semibold text-[#2D2A26]">{cust.fullName}</p>
                            <p className="text-[10px] text-[#8A8278]">Reg: {formatDate(cust.registrationDate)}</p>
                          </td>
                          <td className="p-3">
                            <p className="font-mono text-[#2D2A26]">{cust.mobile}</p>
                            <p className="text-[10px] text-[#8A8278]">{cust.city || 'Chennai'}</p>
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={
                                cust.category === 'Premium'
                                  ? 'gold'
                                  : cust.category === 'Wholesale'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="text-[10px]"
                            >
                              {cust.category}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-serif font-bold text-[#2D2A26]">
                            {formatCurrency(cust.totalSpent)}
                          </td>
                          <td className="p-3 text-center font-mono font-medium">
                            {cust.totalPurchases} bills
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">
                            {cust.loyaltyPoints || 0}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold">
                            {cust.outstandingBalance > 0 ? (
                              <span className="text-[#C53030]">{formatCurrency(cust.outstandingBalance)}</span>
                            ) : (
                              <span className="text-[#8A8278]">₹0</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-800">
                            {cust.storeCredit > 0 ? formatCurrency(cust.storeCredit) : '₹0'}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedProfileId(cust.id);
                                  setActiveTab('profiles');
                                }}
                                className="h-7 px-2 text-xs text-[#C9A96E] hover:text-[#B89555] gap-1"
                                title="View Customer Profile"
                              >
                                <Eye className="h-3.5 w-3.5" /> Profile
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartBill(cust)}
                                className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800 gap-1"
                                title="Start Bill with Customer"
                              >
                                <ShoppingBag className="h-3.5 w-3.5" /> Bill
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/ledger?customer=${cust.id}`)}
                                className="h-7 px-2 text-xs text-[#8A8278] hover:text-[#2D2A26]"
                                title="View Ledger Statement"
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                              </Button>
                            </div>
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

        {/* ========================================================
            TAB 2: CUSTOMER PROFILES
           ======================================================== */}
        <TabsContent value="profiles" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Customer Selector List */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="border-[#E5DDD0]">
                <CardHeader className="pb-3 border-b border-[#E5DDD0]">
                  <CardTitle className="text-sm">Select Customer</CardTitle>
                  <CardDescription>Click a profile to inspect loyalty and details</CardDescription>
                </CardHeader>
                <CardContent className="p-2 space-y-1 max-h-[520px] overflow-y-auto">
                  {customers.map(c => {
                    const isSelected = c.id === activeCustomer?.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedProfileId(c.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#FAF7F2] border-[#C9A96E] shadow-2xs'
                            : 'border-transparent hover:bg-[#FAF7F2]/60 hover:border-[#E5DDD0]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              isSelected
                                ? 'bg-[#C9A96E] text-white'
                                : 'bg-[#E5DDD0] text-[#2D2A26]'
                            }`}
                          >
                            {c.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#2D2A26]">{c.fullName}</p>
                            <p className="text-[11px] text-[#8A8278]">{c.mobile}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-emerald-700 block">
                            {c.loyaltyPoints || 0} Pts
                          </span>
                          <span className="text-[10px] text-[#8A8278]">{c.category}</span>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Right: Selected Customer Profile Inspector */}
            <div className="lg:col-span-8 space-y-6">
              {activeCustomer ? (
                <>
                  {/* Customer Identity Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-[#E5DDD0] shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-[#C9A96E]/20 text-[#8F6F2C] flex items-center justify-center font-bold text-base">
                        {activeCustomer.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-serif text-lg font-bold text-[#2D2A26]">
                            {activeCustomer.fullName}
                          </h2>
                          <Badge variant="gold" className="text-[10px]">
                            {activeCustomer.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-[#8A8278]">
                          Mobile: <span className="font-mono text-[#2D2A26] font-semibold">{activeCustomer.mobile}</span> • {activeCustomer.city || 'Chennai'}, {activeCustomer.state || 'Tamil Nadu'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleStartBill(activeCustomer)}
                        className="h-9 text-xs gap-1.5 shadow-xs bg-[#C9A96E] hover:bg-[#B89555] text-white"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" /> Start New Bill
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/customers/${activeCustomer.id}`)}
                        className="h-9 text-xs border-[#E5DDD0]"
                      >
                        Full Details
                      </Button>
                    </div>
                  </div>

                  {/* Customer Loyalty Profile Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className="border-[#E5DDD0]">
                      <CardContent className="p-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8278] block">
                          Available Points
                        </span>
                        <p className="font-serif text-xl font-bold text-emerald-700 mt-1">
                          {activeCustomer.loyaltyPoints || 0} Pts
                        </p>
                        <span className="text-[10px] text-emerald-800">
                          = ₹{((activeCustomer.loyaltyPoints || 0) * (loyaltyConfig.pointValue || 0.1)).toFixed(0)} discount
                        </span>
                      </CardContent>
                    </Card>

                    <Card className="border-[#E5DDD0]">
                      <CardContent className="p-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8278] block">
                          Lifetime Earned
                        </span>
                        <p className="font-serif text-xl font-bold text-[#C9A96E] mt-1">
                          {activeCustomerEarned} Pts
                        </p>
                        <span className="text-[10px] text-[#8A8278]">Cumulative rewards</span>
                      </CardContent>
                    </Card>

                    <Card className="border-[#E5DDD0]">
                      <CardContent className="p-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8278] block">
                          Points Redeemed
                        </span>
                        <p className="font-serif text-xl font-bold text-[#8F6F2C] mt-1">
                          {activeCustomerRedeemed} Pts
                        </p>
                        <span className="text-[10px] text-[#8A8278]">Saved at checkout</span>
                      </CardContent>
                    </Card>

                    <Card className="border-[#E5DDD0]">
                      <CardContent className="p-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8278] block">
                          Total Purchases
                        </span>
                        <p className="font-serif text-xl font-bold text-[#2D2A26] mt-1">
                          {activeCustomer.totalPurchases} Bills
                        </p>
                        <span className="text-[10px] text-[#8A8278]">{formatCurrency(activeCustomer.totalSpent)}</span>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Customer's Loyalty Transaction History */}
                  <Card className="border-[#E5DDD0]">
                    <CardHeader className="pb-3 border-b border-[#E5DDD0] flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">Loyalty Activity History</CardTitle>
                        <CardDescription>
                          Points credit and debit ledger for {activeCustomer.fullName}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-[11px] font-mono">
                        {activeCustomerLoyalty.length} transactions
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                            <tr>
                              <th className="p-3 text-left font-semibold">Date</th>
                              <th className="p-3 text-left font-semibold">Event Description</th>
                              <th className="p-3 text-center font-semibold">Type</th>
                              <th className="p-3 text-right font-semibold">Points</th>
                              <th className="p-3 text-right font-semibold">Running Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F5F0E8]">
                            {activeCustomerLoyalty.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-xs text-[#8A8278]">
                                  No loyalty points recorded yet for this customer
                                </td>
                              </tr>
                            ) : (
                              activeCustomerLoyalty.map(tx => (
                                <tr key={tx.id} className="hover:bg-[#FAF7F2]/60">
                                  <td className="p-3 text-[#8A8278]">{formatDateTime(tx.date)}</td>
                                  <td className="p-3 text-[#2D2A26] font-medium">{tx.description}</td>
                                  <td className="p-3 text-center">
                                    <Badge
                                      variant={tx.type === 'Earned' ? 'success' : 'secondary'}
                                      className="text-[10px]"
                                    >
                                      {tx.type}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold">
                                    {tx.type === 'Earned' ? (
                                      <span className="text-emerald-700">+{tx.points}</span>
                                    ) : (
                                      <span className="text-[#C53030]">-{tx.points}</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-emerald-800">
                                    {tx.balance}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>
          </div>
        </TabsContent>

        {/* ========================================================
            TAB 3: LOYALTY POINTS DASHBOARD & CONFIGURATION
           ======================================================== */}
        <TabsContent value="loyalty" className="space-y-6 mt-4">
          {/* LOYALTY DASHBOARD: 4 Required Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-[#E5DDD0]">
              <CardContent className="p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
                  Total Loyalty Members
                </span>
                <p className="font-serif text-xl font-bold text-[#2D2A26] mt-1">
                  {totalLoyaltyMembers}
                </p>
                <span className="text-[10px] text-[#8A8278]">Customers enrolled in rewards</span>
              </CardContent>
            </Card>

            <Card className="border-[#E5DDD0]">
              <CardContent className="p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
                  Total Points Earned
                </span>
                <p className="font-serif text-xl font-bold text-[#C9A96E] mt-1">
                  {totalPointsEarned} Pts
                </p>
                <span className="text-[10px] text-[#8A8278]">Awarded on eligible store spend</span>
              </CardContent>
            </Card>

            <Card className="border-[#E5DDD0]">
              <CardContent className="p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
                  Total Points Redeemed
                </span>
                <p className="font-serif text-xl font-bold text-[#8F6F2C] mt-1">
                  {totalPointsRedeemed} Pts
                </p>
                <span className="text-[10px] text-[#8F6F2C]">
                  ₹{(totalPointsRedeemed * (loyaltyConfig.pointValue || 0.1)).toFixed(0)} redeemed in bill discounts
                </span>
              </CardContent>
            </Card>

            <Card className="border-[#E5DDD0]">
              <CardContent className="p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
                  Available Points
                </span>
                <p className="font-serif text-xl font-bold text-emerald-800 mt-1">
                  {totalLoyaltyPoints} Pts
                </p>
                <span className="text-[10px] text-emerald-700">
                  ₹{(totalLoyaltyPoints * (loyaltyConfig.pointValue || 0.1)).toFixed(0)} unredeemed balance
                </span>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Configurable Demo Rules Form (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              <Card className="border-[#E5DDD0]">
                <CardHeader className="pb-3 border-b border-[#E5DDD0]">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-[#C9A96E]" />
                        <span>Configurable Loyalty Rules</span>
                      </CardTitle>
                      <CardDescription>
                        Customize point earning and redemption formulas for 1 Gram Jewellery
                      </CardDescription>
                    </div>
                    {configSavedSuccess && (
                      <Badge variant="success" className="text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Saved Live
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <form onSubmit={handleSaveLoyaltyRules} className="space-y-4">
                    {/* Point Earning Rule */}
                    <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] space-y-2">
                      <Label className="text-xs font-bold text-[#2D2A26] flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-[#C9A96E]" />
                        <span>Point Earning Rule</span>
                      </Label>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[#8A8278]">Every</span>
                        <div className="relative w-24">
                          <span className="absolute left-2.5 top-2 text-[#8A8278] text-xs">₹</span>
                          <Input
                            type="number"
                            min={1}
                            value={spendPerPoint}
                            onChange={e => setSpendPerPoint(Math.max(1, Number(e.target.value)))}
                            className="h-8 pl-6 pr-2 text-xs bg-white text-right font-mono"
                          />
                        </div>
                        <span className="text-[#8A8278]">of eligible purchase =</span>
                        <div className="w-16">
                          <Input
                            type="number"
                            min={1}
                            value={pointsPerSpend}
                            onChange={e => setPointsPerSpend(Math.max(1, Number(e.target.value)))}
                            className="h-8 px-2 text-xs bg-white text-center font-mono font-bold"
                          />
                        </div>
                        <span className="text-[#2D2A26] font-medium">loyalty point(s)</span>
                      </div>
                      <p className="text-[11px] text-[#8A8278]">
                        Example: ₹1,000 bill awards {Math.floor(1000 / spendPerPoint) * pointsPerSpend} points at POS checkout.
                      </p>
                    </div>

                    {/* Point Redemption Rule */}
                    <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] space-y-2">
                      <Label className="text-xs font-bold text-[#2D2A26] flex items-center gap-1.5">
                        <Gift className="h-3.5 w-3.5 text-[#C9A96E]" />
                        <span>Point Redemption Rule</span>
                      </Label>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-20">
                          <Input
                            type="number"
                            min={1}
                            value={pointsToRedeem100}
                            onChange={e => setPointsToRedeem100(Math.max(1, Number(e.target.value)))}
                            className="h-8 px-2 text-xs bg-white text-center font-mono font-bold"
                          />
                        </div>
                        <span className="text-[#8A8278]">points =</span>
                        <div className="relative w-24">
                          <span className="absolute left-2.5 top-2 text-[#8A8278] text-xs">₹</span>
                          <Input
                            type="number"
                            min={1}
                            value={discountValue100}
                            onChange={e => setDiscountValue100(Math.max(1, Number(e.target.value)))}
                            className="h-8 pl-6 pr-2 text-xs bg-white text-right font-mono"
                          />
                        </div>
                        <span className="text-[#2D2A26] font-medium">discount</span>
                      </div>
                      <p className="text-[11px] text-[#8A8278]">
                        Current redemption rate: <strong>1 point = ₹{(discountValue100 / pointsToRedeem100).toFixed(2)}</strong> deduction from payable total.
                      </p>
                    </div>

                    {/* Thresholds */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <Label className="text-[11px] text-[#8A8278]">Min Points to Redeem</Label>
                        <Input
                          type="number"
                          min={0}
                          value={minRedeem}
                          onChange={e => setMinRedeem(Number(e.target.value))}
                          className="h-8 mt-1 text-xs bg-white font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-[#8A8278]">Max Bill Discount (%)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={maxRedeemPercent}
                          onChange={e => setMaxRedeemPercent(Number(e.target.value))}
                          className="h-8 mt-1 text-xs bg-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResetToDefaultRules}
                        className="text-xs text-[#8A8278] hover:text-[#2D2A26] gap-1"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Reset to Defaults
                      </Button>

                      <Button
                        type="submit"
                        size="sm"
                        className="h-8 text-xs bg-[#C9A96E] hover:bg-[#B89555] text-white shadow-xs px-4"
                      >
                        Save Loyalty Rules
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right: Top Loyalty Customers & Tier Multipliers (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Top Members */}
              <Card className="border-[#E5DDD0]">
                <CardHeader className="pb-3 border-b border-[#E5DDD0] flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Top Loyalty Members</CardTitle>
                    <CardDescription>Customers with highest accumulated reward points</CardDescription>
                  </div>
                  <Badge variant="gold" className="text-[10px]">Leaderboard</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-[#F5F0E8] text-xs">
                    {topLoyaltyMembers.map((member, idx) => (
                      <div
                        key={member.id}
                        className="p-3 flex items-center justify-between hover:bg-[#FAF7F2]/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-serif font-bold text-sm text-[#C9A96E] w-5 text-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-[#2D2A26]">{member.fullName}</p>
                            <p className="text-[11px] text-[#8A8278]">{member.mobile} • {member.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-mono font-bold text-emerald-800 text-sm block">
                              {member.loyaltyPoints} Pts
                            </span>
                            <span className="text-[10px] text-[#8A8278]">
                              Worth ₹{((member.loyaltyPoints || 0) * (loyaltyConfig.pointValue || 0.1)).toFixed(0)}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProfileId(member.id);
                              setActiveTab('profiles');
                            }}
                            className="h-7 px-2 text-[#C9A96E]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tier Multipliers */}
              <Card className="border-[#E5DDD0]">
                <CardHeader className="pb-2 border-b border-[#E5DDD0]">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#C9A96E]" />
                    <span>Loyalty Membership Tiers</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0]">
                    <span className="font-bold text-[#2D2A26] block">Regular</span>
                    <span className="text-[11px] text-[#8A8278] block mt-0.5">&lt; ₹25,000 spend</span>
                    <Badge variant="outline" className="mt-1 text-[10px]">1.0x Points</Badge>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#C9A96E]/50">
                    <span className="font-bold text-[#C9A96E] block">Gold VIP</span>
                    <span className="text-[11px] text-[#8A8278] block mt-0.5">₹25k - ₹1L spend</span>
                    <Badge variant="gold" className="mt-1 text-[10px]">1.5x Points</Badge>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#8F6F2C]/50">
                    <span className="font-bold text-[#8F6F2C] block">Platinum Elite</span>
                    <span className="text-[11px] text-[#8A8278] block mt-0.5">&gt; ₹1L spend</span>
                    <Badge variant="gold" className="mt-1 text-[10px]">2.0x Points</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================
            TAB 4: TRANSACTION HISTORY
           ======================================================== */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          <Card className="border-[#E5DDD0]">
            <CardHeader className="pb-3 border-b border-[#E5DDD0] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Complete Loyalty Points Audit Log</CardTitle>
                <CardDescription>
                  Real-time history of all reward points earned on purchases and redeemed at POS
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {transactions.length} Total Records
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                    <tr>
                      <th className="p-3 text-left font-semibold">Date & Time</th>
                      <th className="p-3 text-left font-semibold">Customer</th>
                      <th className="p-3 text-left font-semibold">Description / Invoice</th>
                      <th className="p-3 text-center font-semibold">Action</th>
                      <th className="p-3 text-right font-semibold">Points</th>
                      <th className="p-3 text-right font-semibold">Balance After</th>
                      <th className="p-3 text-center font-semibold">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F0E8]">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-xs text-[#8A8278]">
                          No loyalty transactions recorded yet
                        </td>
                      </tr>
                    ) : (
                      transactions.map(tx => {
                        const cust = customers.find(c => c.id === tx.customerId);
                        return (
                          <tr key={tx.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                            <td className="p-3 text-[#8A8278] font-mono">{formatDateTime(tx.date)}</td>
                            <td className="p-3">
                              <p className="font-semibold text-[#2D2A26]">{cust?.fullName || 'Walk-in Customer'}</p>
                              {cust && <p className="text-[10px] text-[#8A8278]">{cust.mobile}</p>}
                            </td>
                            <td className="p-3 text-[#2D2A26] font-medium">{tx.description}</td>
                            <td className="p-3 text-center">
                              <Badge
                                variant={tx.type === 'Earned' ? 'success' : 'secondary'}
                                className="text-[10px]"
                              >
                                {tx.type}
                              </Badge>
                            </td>
                            <td className="p-3 text-right font-mono font-bold">
                              {tx.type === 'Earned' ? (
                                <span className="text-emerald-700">+{tx.points}</span>
                              ) : (
                                <span className="text-[#C53030]">-{tx.points}</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-800">
                              {tx.balance}
                            </td>
                            <td className="p-3 text-center">
                              {cust && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProfileId(cust.id);
                                    setActiveTab('profiles');
                                  }}
                                  className="h-6 text-[11px] text-[#C9A96E] hover:text-[#B89555]"
                                >
                                  View
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Customer Registration Modal */}
      <QuickCustomerModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onCustomerCreated={newCust => {
          setCustomers(getCustomers());
          setSelectedProfileId(newCust.id);
        }}
      />
    </div>
  );
}
