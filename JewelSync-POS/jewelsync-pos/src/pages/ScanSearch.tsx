import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import {
  ScanLine,
  Search,
  ShoppingBag,
  Printer,
  Eye,
  CheckCircle2,
  AlertCircle,
  Gem,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatWeight } from '@/lib/utils';
import { getJewelleryItems, getJewelleryItemByBarcode } from '@/services/data-service';
import { usePOSStore } from '@/stores';
import type { JewelleryItem } from '@/types';

export default function ScanSearch() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('query') || '';
  const navigate = useNavigate();
  const { addItem } = usePOSStore();
  const allItems = getJewelleryItems();

  const [inputVal, setInputVal] = useState(initialQuery);
  const [matchedItem, setMatchedItem] = useState<JewelleryItem | null>(null);
  const [recentScans, setRecentScans] = useState<JewelleryItem[]>([]);
  const [notFound, setNotFound] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const barcodeSvgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (barcodeSvgRef.current && matchedItem) {
      try {
        JsBarcode(barcodeSvgRef.current, matchedItem.barcode, {
          format: 'CODE128',
          width: 1.6,
          height: 40,
          displayValue: true,
          fontSize: 11,
          font: 'monospace',
          lineColor: '#2D2A26',
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, [matchedItem]);

  const handleSearch = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    // First try exact barcode match
    let item = getJewelleryItemByBarcode(query.trim());

    // Fallback: match by item code, SKU, or name
    if (!item) {
      item = allItems.find(
        i =>
          i.itemCode.toLowerCase() === q ||
          i.sku.toLowerCase() === q ||
          i.barcode.includes(q) ||
          i.name.toLowerCase().includes(q)
      );
    }

    if (item) {
      setMatchedItem(item);
      setNotFound(false);
      setRecentScans(prev => [item, ...prev.filter(p => p.id !== item.id)].slice(0, 5));
    } else {
      setMatchedItem(null);
      setNotFound(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(inputVal);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Scanner Input Header */}
      <Card className="border-[#C9A96E]/40 shadow-xs">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-[#C9A96E]/15 text-[#8F6F2C] flex items-center justify-center shrink-0">
                <ScanLine className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-[#2D2A26]">Scan & Instant Lookup</h3>
                <p className="text-xs text-[#8A8278]">
                  Point physical USB scanner at tag or manually type barcode, SKU or item code
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  placeholder="Scan barcode here (e.g. 200100001001)..."
                  className="h-11 font-mono text-base font-semibold pl-4"
                  autoFocus
                />
              </div>
              <Button type="submit" size="lg" className="gap-2">
                <Search className="h-4 w-4" /> Lookup
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Not Found Warning */}
      {notFound && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>No catalogue piece found matching "<strong>{inputVal}</strong>". Verify tag number or register new item.</span>
        </div>
      )}

      {/* Matched Piece Details Card */}
      {matchedItem && (
        <Card className="border-[#C9A96E] shadow-sm animate-in fade-in zoom-in-95">
          <CardHeader className="pb-3 border-b border-[#E5DDD0] flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{matchedItem.name}</CardTitle>
                <Badge
                  variant={matchedItem.stockStatus === 'Available' ? 'success' : 'secondary'}
                  className="text-xs"
                >
                  {matchedItem.stockStatus}
                </Badge>
              </div>
              <p className="text-xs text-[#8A8278] mt-0.5">
                {matchedItem.category} • SKU: {matchedItem.sku} • Code: {matchedItem.itemCode}
              </p>
            </div>
            <p className="font-serif text-2xl font-bold text-[#C9A96E]">
              {formatCurrency(matchedItem.sellingPrice)}
            </p>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* Specs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] text-xs">
              <div>
                <span className="text-[#8A8278] block text-[10px] uppercase font-bold">Metal & Purity</span>
                <span className="font-semibold text-sm text-[#2D2A26]">{matchedItem.metalType} {matchedItem.purity}</span>
              </div>
              <div>
                <span className="text-[#8A8278] block text-[10px] uppercase font-bold">Gross Wt</span>
                <span className="font-mono text-sm text-[#2D2A26]">{formatWeight(matchedItem.grossWeight)}</span>
              </div>
              <div>
                <span className="text-[#8A8278] block text-[10px] uppercase font-bold">Net Metal Wt</span>
                <span className="font-mono font-bold text-sm text-[#2D2A26]">{formatWeight(matchedItem.netWeight)}</span>
              </div>
              <div>
                <span className="text-[#8A8278] block text-[10px] uppercase font-bold">Hallmark HUID</span>
                <span className="font-mono font-bold text-sm text-[#C9A96E]">{matchedItem.huid || 'None'}</span>
              </div>
            </div>

            {/* Barcode Artwork */}
            <div className="flex flex-col items-center justify-center p-3 bg-white border border-[#E5DDD0] rounded-xl">
              <svg ref={barcodeSvgRef} className="max-w-full"></svg>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/labels?item=${matchedItem.barcode}`)}
                className="gap-1.5 text-xs"
              >
                <Printer className="h-3.5 w-3.5" /> Print Tag
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/catalogue/${matchedItem.id}`)}
                className="gap-1.5 text-xs"
              >
                <Eye className="h-3.5 w-3.5" /> View Details
              </Button>
              {matchedItem.stockStatus === 'Available' && (
                <Button
                  size="sm"
                  onClick={() => {
                    addItem(matchedItem);
                    navigate('/pos');
                  }}
                  className="gap-1.5 text-xs"
                >
                  <ShoppingBag className="h-3.5 w-3.5" /> Add to POS Bill
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Scanned History */}
      {recentScans.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Lookups in this Session</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#F5F0E8] text-xs">
              {recentScans.map(item => (
                <div
                  key={item.id}
                  onClick={() => setMatchedItem(item)}
                  className="p-3 flex items-center justify-between hover:bg-[#FAF7F2] cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-semibold text-[#2D2A26]">{item.name}</span>
                    <p className="text-[10px] text-[#8A8278] font-mono">{item.barcode} • {item.purity}</p>
                  </div>
                  <span className="font-serif font-bold text-[#2D2A26]">{formatCurrency(item.sellingPrice)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
