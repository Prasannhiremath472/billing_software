import React, { useState } from 'react';
import {
  TrendingUp,
  Save,
  Clock,
  Sparkles,
  RefreshCw,
  Calendar,
  History,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils';
import { useAppStore, usePOSStore } from '@/stores';
import { getRateHistory } from '@/services/data-service';

export default function GoldRateManagement() {
  const { metalRates, updateMetalRate, refreshMetalRates } = useAppStore();
  const { recalculate } = usePOSStore();
  const rateHistory = getRateHistory();

  const [editingRates, setEditingRates] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    metalRates.forEach(r => {
      init[r.id] = r.ratePerGram;
    });
    return init;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleRateChange = (id: string, val: number) => {
    setEditingRates(prev => ({ ...prev, [id]: val }));
  };

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    const changed = Object.entries(editingRates).filter(([id, rate]) => {
      const current = metalRates.find(r => r.id === id)?.ratePerGram;
      return rate > 0 && rate !== current;
    });
    try {
      for (const [id, rate] of changed) await updateMetalRate(id, rate);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not update the rates.');
      refreshMetalRates();
      return;
    }
    // Trigger POS recalculation
    recalculate();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // 24k gold rate updates from 24k benchmark
  const handleGold24kQuickSet = (rate24k: number) => {
    const gold24k = metalRates.find(r => r.metalType === 'Gold' && r.purity === '24K');
    const gold22k = metalRates.find(r => r.metalType === 'Gold' && r.purity === '22K');
    const gold20k = metalRates.find(r => r.metalType === 'Gold' && r.purity === '20K');
    const gold18k = metalRates.find(r => r.metalType === 'Gold' && r.purity === '18K');

    const updates = { ...editingRates };
    if (gold24k) updates[gold24k.id] = rate24k;
    if (gold22k) updates[gold22k.id] = Math.round((22 / 24) * rate24k);
    if (gold20k) updates[gold20k.id] = Math.round((20 / 24) * rate24k);
    if (gold18k) updates[gold18k.id] = Math.round((18 / 24) * rate24k);

    setEditingRates(updates);
  };

  // Trend chart data from rate history
  const chartData = [...rateHistory]
    .reverse()
    .filter(r => r.metalType === 'Gold' && r.purity === '24K')
    .map(h => ({
      date: formatDate(h.date),
      rate: h.ratePerGram,
    }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#E5DDD0]">
        <div>
          <h2 className="font-serif text-lg font-bold text-[#2D2A26] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#C9A96E]" />
            <span>Daily Metal Benchmark Rates</span>
          </h2>
          <p className="text-xs text-[#8A8278]">
            Benchmark rates per gram applied across all POS billing calculations and inventory valuations
          </p>
        </div>

        {savedSuccess && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 animate-in fade-in">
            ✓ Metal rates updated and synchronized with POS
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Rate Entry Form (7 Cols) */}
        <div className="md:col-span-7 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-[#E5DDD0]">
              <CardTitle className="text-sm">Update Metal Rates (Per Gram in INR)</CardTitle>
              <CardDescription>Enter morning opening benchmark rates</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSaveRates} className="space-y-4">
                {/* 24K Quick Setter */}
                <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2D2A26]">Gold 24K Benchmark Auto-Purity Setter</span>
                    <span className="text-[10px] text-[#8A8278]">Calculates 22K, 20K & 18K automatically</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="e.g. 7850"
                      onChange={e => {
                        const val = Number(e.target.value);
                        if (val > 1000) handleGold24kQuickSet(val);
                      }}
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGold24kQuickSet(7850)}
                      className="text-xs shrink-0"
                    >
                      Reset ₹7,850
                    </Button>
                  </div>
                </div>

                {/* Individual Rate Fields */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {metalRates.map(rate => (
                    <div key={rate.id} className="p-2.5 rounded-lg border border-[#E5DDD0] bg-white space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[#2D2A26]">{rate.metalType} {rate.purity}</span>
                        <span className="text-[10px] text-[#8A8278]">{formatDateTime(rate.updatedAt)}</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-[#8A8278] text-xs">₹</span>
                        <input
                          type="number"
                          step="1"
                          value={editingRates[rate.id] ?? rate.ratePerGram}
                          onChange={e => handleRateChange(rate.id, Number(e.target.value) || 0)}
                          className="w-full h-8 pl-6 pr-2 font-mono font-bold text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26] focus:outline-none focus:border-[#C9A96E]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" className="gap-2 shadow-xs">
                    <Save className="h-4 w-4" /> Save Rates & Update Cart
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Trend Chart & History Table (5 Cols) */}
        <div className="md:col-span-5 space-y-6">
          {/* Rate Trend Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Gold 24K Benchmark History</CardTitle>
              <CardDescription>Daily closing gold rates per gram (INR)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5DDD0" />
                    <XAxis dataKey="date" stroke="#8A8278" fontSize={10} tickLine={false} />
                    <YAxis
                      domain={['auto', 'auto']}
                      stroke="#8A8278"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={val => `₹${val}`}
                    />
                    <Tooltip
                      formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Rate/g']}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E5DDD0',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#C9A96E"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#C9A96E' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Rate History Log Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <History className="h-4 w-4 text-[#8A8278]" />
                <span>Historical Benchmarks</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[#F5F0E8] text-xs max-h-52 overflow-y-auto scrollbar-thin">
                {rateHistory.map(entry => (
                  <div key={entry.id} className="p-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-[#2D2A26]">{entry.metalType} {entry.purity}</span>
                      <p className="text-[10px] text-[#8A8278]">{formatDate(entry.date)}</p>
                    </div>
                    <span className="font-mono font-bold text-[#C9A96E]">
                      {formatCurrency(entry.ratePerGram)}/g
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
