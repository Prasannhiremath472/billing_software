import React, { useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import {
  ArrowLeft,
  Printer,
  ShoppingBag,
  Sparkles,
  Barcode as BarcodeIcon,
  Tag,
  Gem,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import { getJewelleryItemById } from '@/services/data-service';
import { usePOSStore } from '@/stores';

export default function ItemDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = usePOSStore();
  const item = id ? getJewelleryItemById(id) : undefined;
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && item) {
      try {
        JsBarcode(barcodeRef.current, item.barcode, {
          format: 'CODE128',
          width: 1.8,
          height: 48,
          displayValue: true,
          fontSize: 12,
          font: 'monospace',
          lineColor: '#2D2A26',
        });
      } catch (e) {
        console.error('Barcode error', e);
      }
    }
  }, [item]);

  if (!item) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold">Jewellery Item Not Found</h2>
        <p className="text-xs text-[#8A8278] mt-1 mb-4">No item matching ID "{id}" was found.</p>
        <Button onClick={() => navigate('/catalogue')}>Back to Catalogue</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-xl border border-[#E5DDD0]">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/catalogue')} className="text-xs gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Catalogue
          </Button>
          <span className="font-mono text-xs text-[#8A8278]">{item.sku}</span>
          <Badge variant={item.stockStatus === 'Available' ? 'success' : 'secondary'} className="text-[10px]">
            {item.stockStatus}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/labels?item=${item.barcode}`)}
            className="text-xs gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" /> Print Label
          </Button>

          {item.stockStatus === 'Available' && (
            <Button
              size="sm"
              onClick={() => {
                addItem(item);
                navigate('/pos');
              }}
              className="text-xs gap-1.5"
            >
              <ShoppingBag className="h-3.5 w-3.5" /> Add to POS Bill
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Barcode & Tag Artwork */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tag & Code 128 Barcode</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-4 space-y-4">
              <div className="w-full p-4 bg-[#FAF7F2] border border-[#E5DDD0] rounded-xl flex flex-col items-center justify-center">
                <svg ref={barcodeRef} className="max-w-full"></svg>
                <p className="font-mono text-xs text-[#8A8278] mt-2">Item Code: {item.itemCode}</p>
              </div>

              <div className="w-full text-xs space-y-1 text-[#8A8278]">
                <div className="flex justify-between">
                  <span>Location / Tray:</span>
                  <span className="font-medium text-[#2D2A26]">{item.location || 'Tray A1'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Supplier Ref:</span>
                  <span className="font-medium text-[#2D2A26]">{item.supplier || 'In-House'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date Added:</span>
                  <span className="font-medium text-[#2D2A26]">{formatDate(item.dateAdded)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 2 Columns: Full Specifications & Pricing Breakdown */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-[#E5DDD0]">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <p className="text-xs text-[#8A8278] mt-0.5">{item.category} • Design Code: {item.designCode}</p>
                </div>
                <p className="font-serif text-xl font-bold text-[#C9A96E]">
                  {formatCurrency(item.sellingPrice)}
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              {/* Metal & Weight Grid */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0]">
                <div>
                  <span className="text-[#8A8278] block text-[10px] uppercase font-bold">Metal & Purity</span>
                  <span className="font-semibold text-sm text-[#2D2A26]">{item.metalType} {item.purity}</span>
                </div>
                <div>
                  <span className="text-[#8A8278] block text-[10px] uppercase font-bold">Gross Weight</span>
                  <span className="font-mono font-semibold text-sm text-[#2D2A26]">{formatWeight(item.grossWeight)}</span>
                </div>
                <div>
                  <span className="text-[#8A8278] block text-[10px] uppercase font-bold">Net Metal Weight</span>
                  <span className="font-mono font-bold text-sm text-[#2D2A26]">{formatWeight(item.netWeight)}</span>
                </div>
              </div>

              {/* Stone & Hallmark Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-[#E5DDD0]">
                  <span className="text-[#8A8278] block text-[10px] uppercase font-bold">Stone / Enamel Weight</span>
                  <span className="font-mono text-sm text-[#2D2A26]">{formatWeight(item.stoneWeight)}</span>
                  {item.stoneValue > 0 && (
                    <p className="text-[11px] text-[#8A8278] mt-0.5">Value: {formatCurrency(item.stoneValue)}</p>
                  )}
                </div>

                <div className="p-3 rounded-lg border border-[#E5DDD0]">
                  <span className="text-[#8A8278] block text-[10px] uppercase font-bold">BIS Hallmark (HUID)</span>
                  <span className="font-mono font-bold text-sm text-[#C9A96E]">{item.huid || 'Un-hallmarked'}</span>
                  <p className="text-[10px] text-[#8A8278] mt-0.5">Bureau of Indian Standards</p>
                </div>
              </div>

              {/* Diamond Specs if present */}
              {item.diamondDetails && (
                <div className="p-3 rounded-lg border border-[#E5DDD0] bg-white space-y-2">
                  <span className="font-bold text-[#2D2A26] uppercase text-[10px] block">Diamond Grading Specs:</span>
                  <div className="grid grid-cols-4 gap-2 font-mono text-center">
                    <div className="p-1.5 bg-[#FAF7F2] rounded">
                      <span className="text-[9px] text-[#8A8278] block">Carats</span>
                      <span className="font-bold">{item.diamondDetails.totalCarat} ct</span>
                    </div>
                    <div className="p-1.5 bg-[#FAF7F2] rounded">
                      <span className="text-[9px] text-[#8A8278] block">Colour</span>
                      <span className="font-bold">{item.diamondDetails.colour}</span>
                    </div>
                    <div className="p-1.5 bg-[#FAF7F2] rounded">
                      <span className="text-[9px] text-[#8A8278] block">Clarity</span>
                      <span className="font-bold">{item.diamondDetails.clarity}</span>
                    </div>
                    <div className="p-1.5 bg-[#FAF7F2] rounded">
                      <span className="text-[9px] text-[#8A8278] block">Cut</span>
                      <span className="font-bold">{item.diamondDetails.cut}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {item.description && (
                <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8278] block mb-1">
                    Product Description:
                  </span>
                  <p className="text-[#3D3A36] leading-relaxed">{item.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
