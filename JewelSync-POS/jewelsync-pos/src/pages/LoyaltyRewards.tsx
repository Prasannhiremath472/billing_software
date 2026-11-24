import React, { useState } from 'react';
import {
  Award,
  Sparkles,
  TrendingUp,
  Users,
  Search,
  CheckCircle2,
  Gift,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  getLoyaltyTransactions,
  getLoyaltyConfig,
  getCustomers,
} from '@/services/data-service';

export default function LoyaltyRewards() {
  const transactions = getLoyaltyTransactions();
  const config = getLoyaltyConfig();
  const customers = getCustomers();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');

  const filteredTx = transactions.filter(t => {
    if (filterType !== 'All' && t.type !== filterType) return false;
    if (searchQuery.trim()) {
      return t.description.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const totalPointsAwarded = transactions
    .filter(t => t.type === 'Earned')
    .reduce((sum, t) => sum + t.points, 0);

  const totalPointsRedeemed = transactions
    .filter(t => t.type === 'Redeemed')
    .reduce((sum, t) => sum + t.points, 0);

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Total Points Issued
            </span>
            <p className="font-serif text-xl font-bold text-[#C9A96E] mt-1">
              {totalPointsAwarded} Pts
            </p>
            <span className="text-[10px] text-[#8A8278]">Issued on completed purchases</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Points Redeemed at POS
            </span>
            <p className="font-serif text-xl font-bold text-emerald-800 mt-1">
              {totalPointsRedeemed} Pts
            </p>
            <span className="text-[10px] text-emerald-700">₹{totalPointsRedeemed} checkout discounts</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Active Reward Policy
            </span>
            <p className="font-serif text-base font-bold text-[#2D2A26] mt-1">
              1 Pt per ₹100
            </p>
            <span className="text-[10px] text-[#8A8278]">1 Point = ₹1.00 store discount</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Loyalty Rules and Slabs (4 Cols) */}
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-[#E5DDD0]">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Gift className="h-4 w-4 text-[#C9A96E]" />
                <span>Tier Multipliers & Slabs</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] space-y-1">
                <span className="font-bold text-[#2D2A26] block">Standard Tier (&lt; ₹50,000)</span>
                <p className="text-[#8A8278]">1.0x Base rate (1 point per ₹100 spent)</p>
              </div>

              <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] space-y-1">
                <span className="font-bold text-[#C9A96E] block">Gold Tier (₹50,000 - ₹2,00,000)</span>
                <p className="text-[#8A8278]">1.5x Multiplier (1.5 points per ₹100 spent)</p>
              </div>

              <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] space-y-1">
                <span className="font-bold text-[#8F6F2C] block">Platinum Elite (&gt; ₹2,00,000)</span>
                <p className="text-[#8A8278]">2.0x Double Points (2 points per ₹100 spent)</p>
              </div>

              <div className="pt-2 text-[11px] text-[#8A8278] space-y-1">
                <p>• Minimum redemption threshold: <strong>100 Points</strong></p>
                <p>• Max bill discount via points: <strong>10% of cart total</strong></p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Transactions Log (8 Cols) */}
        <div className="md:col-span-8 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-[#E5DDD0] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Loyalty Points Activity Log</CardTitle>
                <CardDescription>Live audit trail of points earned and redeemed</CardDescription>
              </div>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="h-8 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26] px-2"
              >
                <option value="All">All Events</option>
                <option value="Earned">Earned</option>
                <option value="Redeemed">Redeemed</option>
              </select>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                    <tr>
                      <th className="p-3 text-left font-semibold">Date & Time</th>
                      <th className="p-3 text-left font-semibold">Description</th>
                      <th className="p-3 text-center font-semibold">Type</th>
                      <th className="p-3 text-right font-semibold">Points</th>
                      <th className="p-3 text-right font-semibold">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F0E8]">
                    {filteredTx.map(tx => (
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
                        <td className="p-3 text-right font-mono font-bold text-[#2D2A26]">{tx.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
