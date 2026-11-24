import React, { useEffect, useState } from 'react';
import {
  Lock,
  Printer,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils';
import {
  getDailyClosings,
  createDailyClosing,
  getClosingSummary,
  getStoreInfo,
} from '@/services/data-service';
import { errorMessage } from '@/services/api-client';
import { useAppStore } from '@/stores';
import type { DailyClosing as DailyClosingType } from '@/types';

export default function DailyClosing() {
  const { currentUser } = useAppStore();
  const store = getStoreInfo();
  const pastClosings = getDailyClosings();

  const [openingCash, setOpeningCash] = useState<number>(50000);
  const [cashExpenses, setCashExpenses] = useState<number>(1200); // tea, postage, petty cash
  const [actualClosingCash, setActualClosingCash] = useState<number>(50000);
  const [closingNotes, setClosingNotes] = useState('');
  const [closedRecord, setClosedRecord] = useState<DailyClosingType | null>(null);

  // Today's collections are computed by the server from recorded payments and returns
  type Summary = Awaited<ReturnType<typeof getClosingSummary>>;
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getClosingSummary()
      .then(setSummary)
      .catch(err => setLoadError(errorMessage(err, 'Could not load collections for today.')));
  }, []);

  const cashSales = summary?.cashSales ?? 0;
  const upiCollections = summary?.upiCollections ?? 0;
  const cardCollections = summary?.cardCollections ?? 0;
  const bankTransfers = summary?.bankTransfers ?? 0;
  const cashRefunds = summary?.cashRefunds ?? 0;

  const expectedClosingCash = openingCash + cashSales - cashRefunds - cashExpenses;
  const cashDifference = actualClosingCash - expectedClosingCash;

  const handleConfirmClosing = async () => {
    if (saving || !summary) return;
    setSaving(true);
    setLoadError('');
    try {
      const record = await createDailyClosing({
        openingCash,
        cashExpenses,
        actualClosingCash,
        closingNotes: closingNotes || undefined,
      });
      setClosedRecord(record);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not close the register.'));
    } finally {
      setSaving(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#E5DDD0]">
        <div>
          <h2 className="font-serif text-lg font-bold text-[#2D2A26] flex items-center gap-2">
            <Lock className="h-5 w-5 text-[#C9A96E]" />
            <span>Daily Register Closing & Drawer Tally</span>
          </h2>
          <p className="text-xs text-[#8A8278]">
            End of shift cash reconciliation, digital collections audit and register lock
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handlePrintReport} className="gap-1.5 shadow-xs">
            <Printer className="h-3.5 w-3.5" /> Print Shift Report
          </Button>
        </div>
      </div>

      {/* Closed Confirmation Card */}
      {closedRecord && (
        <Card className="border-emerald-200 bg-emerald-50/50 p-6 animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-base text-emerald-900">
                Register Shift Closed & Reconciled!
              </h3>
              <p className="text-xs text-emerald-800">
                Shift closing saved by <strong>{closedRecord.closedBy}</strong> at {formatDateTime(closedRecord.closedAt)}.
                Variance recorded: <strong>{formatCurrency(closedRecord.cashDifference)}</strong>.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Active Shift Tally Sheet */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Collections Breakdown (7 Cols) */}
        <div className="md:col-span-7 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-[#E5DDD0]">
              <CardTitle className="text-sm">Shift Collections Summary</CardTitle>
              <CardDescription>Live totals from today's completed transactions</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#FAF7F2]">
                <span className="text-[#8A8278]">Opening Cash in Till:</span>
                <span className="font-mono font-bold text-[#2D2A26]">{formatCurrency(openingCash)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white border border-[#E5DDD0]">
                <span className="text-[#3D3A36] font-medium">+ Cash Sales Revenue:</span>
                <span className="font-mono font-bold text-emerald-800">{formatCurrency(cashSales)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white border border-[#E5DDD0]">
                <span className="text-[#3D3A36] font-medium">+ UPI / QR Collections:</span>
                <span className="font-mono font-bold text-[#C9A96E]">{formatCurrency(upiCollections)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white border border-[#E5DDD0]">
                <span className="text-[#3D3A36] font-medium">+ Card EDC Collections:</span>
                <span className="font-mono font-bold text-[#4A6FA5]">{formatCurrency(cardCollections)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white border border-[#E5DDD0]">
                <span className="text-[#3D3A36] font-medium">+ Bank Transfers (NEFT/RTGS):</span>
                <span className="font-mono font-bold text-[#2D2A26]">{formatCurrency(bankTransfers)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white border border-[#E5DDD0]">
                <span className="text-[#C53030] font-medium">- Cash Refunds Issued:</span>
                <span className="font-mono font-bold text-[#C53030]">-{formatCurrency(cashRefunds)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white border border-[#E5DDD0]">
                <span className="text-[#8A8278] font-medium">- Petty Cash Expenses:</span>
                <span className="font-mono font-bold text-[#8A8278]">-{formatCurrency(cashExpenses)}</span>
              </div>

              <div className="pt-3 border-t-2 border-[#2D2A26]/10 flex justify-between items-center text-sm font-bold">
                <span className="text-[#2D2A26]">Expected Physical Cash in Till:</span>
                <span className="font-serif text-lg text-emerald-800">
                  {formatCurrency(expectedClosingCash)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Drawer Reconciliation (5 Cols) */}
        <div className="md:col-span-5 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-[#E5DDD0]">
              <CardTitle className="text-sm">Cash Drawer Reconciliation</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div>
                <Label required>Opening Cash Balance (₹)</Label>
                <Input
                  type="number"
                  value={openingCash}
                  onChange={e => setOpeningCash(Number(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>

              <div>
                <Label>Petty Expenses / Vouchers (₹)</Label>
                <Input
                  type="number"
                  value={cashExpenses}
                  onChange={e => setCashExpenses(Number(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>

              <div>
                <Label required>Actual Physically Counted Cash (₹)</Label>
                <Input
                  type="number"
                  value={actualClosingCash}
                  onChange={e => setActualClosingCash(Number(e.target.value) || 0)}
                  className="font-mono font-bold text-base"
                />
              </div>

              {/* Difference Indicator */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                  cashDifference === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <span>Reconciliation Variance:</span>
                <span className="font-mono text-sm">
                  {cashDifference === 0
                    ? '✓ Balanced (₹0)'
                    : `${cashDifference > 0 ? '+' : ''}${formatCurrency(cashDifference)}`}
                </span>
              </div>

              <div>
                <Label>Closing Supervisor Notes</Label>
                <Input
                  placeholder="Denominations tallied, safe envelope ID..."
                  value={closingNotes}
                  onChange={e => setClosingNotes(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
              {loadError && <p role="alert" className="text-xs text-red-600 font-medium">{loadError}</p>}
              <Button
                onClick={() => void handleConfirmClosing()}
                disabled={!!closedRecord || saving || !summary}
                className="w-full gap-2 shadow-xs"
              >
                <Lock className="h-4 w-4" /> {saving ? 'Closing…' : 'Lock & Confirm Shift Closing'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
