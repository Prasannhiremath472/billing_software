import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Coins,
  Calculator,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatWeight, generateId } from '@/lib/utils';
import {
  getMetalRates,
  getCustomers,
  addOldGoldExchange,
  getOldGoldExchanges,
  getStoreInfo,
} from '@/services/data-service';
import { useAppStore } from '@/stores';
import type { MetalType, OldGoldExchange as OldGoldRecord } from '@/types';

export default function OldGoldExchange() {
  const navigate = useNavigate();
  const metalRates = getMetalRates();
  const customers = getCustomers();
  const store = getStoreInfo();
  const { currentUser } = useAppStore();
  const pastExchanges = getOldGoldExchanges();

  // Exchange calculation state
  const [selectedCustId, setSelectedCustId] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [metalType, setMetalType] = useState<MetalType>('Gold');
  const [declaredPurity, setDeclaredPurity] = useState('22K');
  const [testedPurity, setTestedPurity] = useState('22K');
  const [grossWeight, setGrossWeight] = useState<number>(10.0);
  const [stoneWeight, setStoneWeight] = useState<number>(0.5);
  const [deductions, setDeductions] = useState<number>(500); // testing or melting deduction in INR
  const [meltingLossPercent, setMeltingLossPercent] = useState<number>(2);
  const [settlementType, setSettlementType] = useState<'Against Purchase' | 'Store Credit' | 'Cash'>('Against Purchase');
  const [staffNotes, setStaffNotes] = useState('');
  const [successRecord, setSuccessRecord] = useState<OldGoldRecord | null>(null);

  // Sync customer name
  useEffect(() => {
    const cust = customers.find(c => c.id === selectedCustId);
    if (cust) setCustomerName(cust.fullName);
  }, [selectedCustId, customers]);

  // Net metal weight calculation
  const netWeightBeforeLoss = Math.max(0, grossWeight - stoneWeight);
  const meltingLossWeight = (meltingLossPercent / 100) * netWeightBeforeLoss;
  const effectiveNetWeight = Math.max(0, netWeightBeforeLoss - meltingLossWeight);

  // Metal Rate lookup based on tested purity
  const goldRate = metalRates.find(r => r.metalType === 'Gold' && r.purity === testedPurity)?.ratePerGram || 7195;
  const metalValue = Math.round(effectiveNetWeight * goldRate);
  const finalExchangeValue = Math.max(0, metalValue - deductions);

  const handleProcessExchange = () => {
    const exNumber = `OG-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const record: OldGoldRecord = {
      id: generateId('og'),
      exchangeNumber: exNumber,
      customerId: selectedCustId || undefined,
      customerName,
      date: new Date().toISOString(),
      metalType,
      declaredPurity,
      testedPurity,
      grossWeight,
      stoneWeight,
      netWeight: effectiveNetWeight,
      applicableRate: goldRate,
      deductions,
      finalExchangeValue,
      settlementType,
      staffNotes: staffNotes || undefined,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
    };

    addOldGoldExchange(record);
    setSuccessRecord(record);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#E5DDD0]">
        <div>
          <h2 className="font-serif text-lg font-bold text-[#2D2A26] flex items-center gap-2">
            <Coins className="h-5 w-5 text-[#C9A96E]" />
            <span>Old Gold & Silver Exchange Valuation</span>
          </h2>
          <p className="text-xs text-[#8A8278]">
            Customer scrap valuation calculator with transparent purity & melting loss verification
          </p>
        </div>

        {/* Legal Disclaimer Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Values entered are tested estimates prior to refining</span>
        </div>
      </div>

      {/* Success Notification */}
      {successRecord && (
        <Card className="border-emerald-200 bg-emerald-50/50 p-6 animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h3 className="font-serif font-bold text-base text-emerald-900">
                Old Gold Exchange Voucher Generated!
              </h3>
              <p className="text-xs text-emerald-800">
                Voucher <strong className="font-mono">{successRecord.exchangeNumber}</strong> for{' '}
                <strong>{formatCurrency(successRecord.finalExchangeValue)}</strong> ({formatWeight(successRecord.netWeight)} Net).
                Settlement marked: {successRecord.settlementType}.
              </p>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => setSuccessRecord(null)} className="text-xs">
                  Calculate Another Scrap Exchange
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.print()} className="text-xs gap-1">
                  <Printer className="h-3.5 w-3.5" /> Print Trade-In Receipt
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Calculator Form */}
      {!successRecord && (
        <Card>
          <CardHeader className="pb-3 border-b border-[#E5DDD0]">
            <CardTitle className="text-sm">Scrap Metal Evaluation & Testing</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            {/* Customer Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Registered Customer (Optional)</Label>
                <select
                  value={selectedCustId}
                  onChange={e => setSelectedCustId(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26]"
                >
                  <option value="">Walk-in Customer (Unregistered)</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.fullName} ({c.mobile})</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Customer Name</Label>
                <Input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
              </div>
            </div>

            {/* Metal & Purity Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0]">
              <div>
                <Label>Metal Category</Label>
                <Select
                  value={metalType}
                  onChange={e => setMetalType(e.target.value as MetalType)}
                  options={[
                    { value: 'Gold', label: 'Gold' },
                    { value: 'Silver', label: 'Silver' },
                    { value: 'Platinum', label: 'Platinum' },
                  ]}
                />
              </div>

              <div>
                <Label>Customer-Declared Purity</Label>
                <Select
                  value={declaredPurity}
                  onChange={e => setDeclaredPurity(e.target.value)}
                  options={[
                    { value: '24K', label: '24K' },
                    { value: '22K', label: '22K' },
                    { value: '20K', label: '20K' },
                    { value: '18K', label: '18K' },
                    { value: '14K', label: '14K' },
                  ]}
                />
              </div>

              <div>
                <Label required>Lab/Touchstone Tested Purity</Label>
                <Select
                  value={testedPurity}
                  onChange={e => setTestedPurity(e.target.value)}
                  options={[
                    { value: '24K', label: '24K' },
                    { value: '22K', label: '22K' },
                    { value: '20K', label: '20K' },
                    { value: '18K', label: '18K' },
                    { value: '14K', label: '14K' },
                  ]}
                />
              </div>
            </div>

            {/* Weights and Deductions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label required>Gross Scale Wt (g)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={grossWeight}
                  onChange={e => setGrossWeight(Number(e.target.value) || 0)}
                  className="font-mono font-bold"
                />
              </div>

              <div>
                <Label>Dirt / Enamel / Stone Wt (g)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={stoneWeight}
                  onChange={e => setStoneWeight(Number(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>

              <div>
                <Label>Melting Loss Tolerance (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={meltingLossPercent}
                  onChange={e => setMeltingLossPercent(Number(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>

              <div>
                <Label>Assaying / Testing Fee (₹)</Label>
                <Input
                  type="number"
                  value={deductions}
                  onChange={e => setDeductions(Number(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>
            </div>

            {/* Valuation Transparency Box */}
            <div className="p-4 rounded-xl border border-[#C9A96E]/40 bg-[#FAF7F2] space-y-2">
              <span className="font-bold text-[#2D2A26] uppercase text-[10px] block">
                Valuation Formula & Breakdown:
              </span>
              <div className="flex justify-between text-[#8A8278]">
                <span>Tested Benchmark Rate ({metalType} {testedPurity}):</span>
                <span className="font-mono font-medium text-[#2D2A26]">{formatCurrency(goldRate)}/g</span>
              </div>
              <div className="flex justify-between text-[#8A8278]">
                <span>Calculated Pure Metal Weight:</span>
                <span className="font-mono text-[#2D2A26]">
                  {formatWeight(effectiveNetWeight)} (after {meltingLossPercent}% refining tolerance)
                </span>
              </div>
              <div className="flex justify-between text-[#8A8278]">
                <span>Gross Metal Value:</span>
                <span className="font-mono text-[#2D2A26]">{formatCurrency(metalValue)}</span>
              </div>
              <div className="flex justify-between text-[#8A8278]">
                <span>Testing Deductions:</span>
                <span className="font-mono text-[#C53030]">-{formatCurrency(deductions)}</span>
              </div>
              <div className="pt-2 border-t border-[#E5DDD0] flex justify-between items-center text-sm font-bold">
                <span className="text-[#2D2A26]">Final Customer Trade-In Credit:</span>
                <span className="font-serif text-lg text-[#C9A96E]">
                  {formatCurrency(finalExchangeValue)}
                </span>
              </div>
            </div>

            {/* Settlement Type & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Settlement Method</Label>
                <Select
                  value={settlementType}
                  onChange={e => setSettlementType(e.target.value as any)}
                  options={[
                    { value: 'Against Purchase', label: 'Credit Against New Jewellery Purchase' },
                    { value: 'Store Credit', label: 'Issue Store Credit Voucher' },
                    { value: 'Cash', label: 'Cash Settlement' },
                  ]}
                />
              </div>
              <div>
                <Label>Testing Staff Remarks</Label>
                <Input
                  placeholder="XRF spectrometer report or acid test result..."
                  value={staffNotes}
                  onChange={e => setStaffNotes(e.target.value)}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-end">
            <Button onClick={handleProcessExchange} className="gap-2 shadow-xs">
              <CheckCircle2 className="h-4 w-4" /> Issue Trade-In Voucher
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Past Exchanges Log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Scrap Exchange Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                <tr>
                  <th className="p-3 text-left font-semibold">Voucher #</th>
                  <th className="p-3 text-left font-semibold">Customer</th>
                  <th className="p-3 text-left font-semibold">Metal & Purity</th>
                  <th className="p-3 text-right font-semibold">Gross Wt</th>
                  <th className="p-3 text-right font-semibold">Net Wt</th>
                  <th className="p-3 text-right font-semibold">Trade-In Value</th>
                  <th className="p-3 text-left font-semibold">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {pastExchanges.map(ex => (
                  <tr key={ex.id} className="hover:bg-[#FAF7F2]/60">
                    <td className="p-3 font-mono font-bold text-[#2D2A26]">{ex.exchangeNumber}</td>
                    <td className="p-3 text-[#2D2A26]">{ex.customerName}</td>
                    <td className="p-3">{ex.metalType} ({ex.testedPurity})</td>
                    <td className="p-3 text-right font-mono text-[#8A8278]">{formatWeight(ex.grossWeight)}</td>
                    <td className="p-3 text-right font-mono font-medium">{formatWeight(ex.netWeight)}</td>
                    <td className="p-3 text-right font-serif font-bold text-emerald-800">
                      {formatCurrency(ex.finalExchangeValue)}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-[10px]">{ex.settlementType}</Badge>
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
