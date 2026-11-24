import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Barcode as BarcodeIcon,
  DollarSign,
  Gem,
  Printer,
  FileText,
  RefreshCw,
  Tag,
  Package,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import {
  formatCurrency,
  generateId,
  generateBarcode,
  generateItemCode,
  generateUniqueBarcode,
} from '@/lib/utils';
import {
  getTaxConfig,
  addJewelleryItem,
  getJewelleryItems,
  getStoreInfo,
} from '@/services/data-service';
import type {
  JewelleryItem,
  JewelleryCategory,
} from '@/types';

const CATEGORIES: JewelleryCategory[] = [
  '1 Gram Gold Jewellery',
  'Imitation Jewellery',
  'Gold Necklaces',
  'Gold Rings',
  'Gold Chains',
  'Bangles',
  'Earrings',
  'Bracelets',
  'Pendants',
  'Mangalsutra',
];

const VARIANTS = [
  'Matte Finish (1 Gram Gold)',
  'Kemp Stone Antique Plated',
  'Micro Gold Plated',
  'CZ Ruby & Emerald Work',
  'Meenakari Hand-Painted',
  'Rhodium High-Polish',
  'Temple Heritage Nakshi',
  'Rose Gold Plated',
];

export default function AddJewelleryItem() {
  const navigate = useNavigate();
  const storeInfo = getStoreInfo();
  const taxConfig = getTaxConfig();

  const [currentStep, setCurrentStep] = useState(1);
  const barcodeSvgRef = useRef<SVGSVGElement>(null);

  // Step 1: Product Information
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<JewelleryCategory>('1 Gram Gold Jewellery');
  const [variant, setVariant] = useState('Matte Finish (1 Gram Gold)');
  const [customVariant, setCustomVariant] = useState('');
  const [location, setLocation] = useState('Tray A1');
  const [supplier, setSupplier] = useState('In-House');
  const [description, setDescription] = useState('');

  // Step 2: Retail Pricing & GST
  const [costPrice, setCostPrice] = useState<number>(850);
  const [mrp, setMrp] = useState<number>(2499);
  const [sellingPrice, setSellingPrice] = useState<number>(1899);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(5);
  const [hsnCode, setHsnCode] = useState('7117');
  const [gstRate, setGstRate] = useState<number>(3); // 3% for Imitation Jewellery

  // Step 3: Barcode & Tag Setup
  const [barcode, setBarcode] = useState(() =>
    generateUniqueBarcode(getJewelleryItems().map(i => i.barcode))
  );
  const [itemCode, setItemCode] = useState(() => generateItemCode());

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate SKU
  useEffect(() => {
    if (!sku) {
      const catCode = category.slice(0, 3).toUpperCase().replace(/\s+/g, '');
      const rand = Math.floor(100 + Math.random() * 900);
      setSku(`${catCode}-${rand}`);
    }
  }, [category]);

  // Adjust selling price when discount changes
  const handleDiscountChange = (disc: number) => {
    setDiscountPercent(disc);
    if (mrp > 0) {
      const discounted = Math.round(mrp * (1 - disc / 100));
      setSellingPrice(discounted);
    }
  };

  const handleSellingPriceChange = (price: number) => {
    setSellingPrice(price);
    if (mrp > 0 && price <= mrp) {
      const disc = Math.round(((mrp - price) / mrp) * 100);
      setDiscountPercent(disc);
    } else {
      setDiscountPercent(0);
    }
  };

  // Render Barcode dynamically
  useEffect(() => {
    if (barcodeSvgRef.current && barcode) {
      try {
        JsBarcode(barcodeSvgRef.current, barcode, {
          format: 'CODE128',
          width: 1.5,
          height: 38,
          displayValue: true,
          fontSize: 10,
          font: 'monospace',
          lineColor: '#2D2A26',
        });
      } catch (err) {
        console.error('JsBarcode rendering error:', err);
      }
    }
  }, [barcode, currentStep]);

  // Regenerate unique barcode
  const handleRefreshBarcode = () => {
    const existing = getJewelleryItems().map(i => i.barcode);
    setBarcode(generateUniqueBarcode(existing));
    setItemCode(generateItemCode());
  };

  // Taxable Value & GST Breakdown (inclusive 3% GST calculation)
  const taxableAmount = Math.round((sellingPrice / (1 + gstRate / 100)) * 100) / 100;
  const totalTax = Math.round((sellingPrice - taxableAmount) * 100) / 100;
  const cgstAmount = Math.round((totalTax / 2) * 100) / 100;
  const sgstAmount = Math.round((totalTax / 2) * 100) / 100;
  const profitMargin = sellingPrice > 0 ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 100) : 0;

  const finalVariant = customVariant.trim() || variant;

  // Step Validation
  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!name.trim()) errs.name = 'Product name is required';
      if (!sku.trim()) errs.sku = 'SKU reference code is required';
    }
    if (step === 2) {
      if (mrp <= 0) errs.mrp = 'MRP must be greater than ₹0';
      if (sellingPrice <= 0) errs.sellingPrice = 'Selling price must be greater than ₹0';
      if (stockQuantity < 0) errs.stockQuantity = 'Stock quantity cannot be negative';
    }
    if (step === 3) {
      const existingBarcodes = getJewelleryItems().map(i => i.barcode.trim().toUpperCase());
      const currentVal = barcode.trim().toUpperCase();
      if (!currentVal) {
        errs.barcode = 'Barcode number is required';
      } else if (existingBarcodes.includes(currentVal)) {
        errs.barcode = `Barcode "${barcode}" is already assigned to another item. Every physical piece must have a unique barcode.`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(4, prev + 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const createItemObject = (): JewelleryItem => {
    const existingBarcodes = getJewelleryItems().map(i => i.barcode);
    const existingSet = new Set(existingBarcodes.map(b => b.trim().toUpperCase()));
    let finalBarcode = barcode.trim();
    if (!finalBarcode || existingSet.has(finalBarcode.toUpperCase())) {
      finalBarcode = generateUniqueBarcode(existingBarcodes);
    }

    return {
      id: generateId('item'),
      productDesignId: 'pd-1gm-retail',
      name: name.trim(),
      description: description.trim() || `${name.trim()} (${finalVariant})`,
      designCode: sku.trim(),
      supplierRef: supplier,
      variant: finalVariant,
      costPrice,
      mrp,
      sellingPrice,
      discount: discountPercent,
      currentValuation: sellingPrice,
      sku: sku.trim(),
      barcode: finalBarcode,
      itemCode: itemCode.trim() || generateItemCode(),
      category,
      metalType: '1 Gram Gold',
      purity: '22K',
      grossWeight: 1,
      netWeight: 1,
      stoneWeight: 0,
      makingChargeType: 'fixed',
      makingChargeValue: 0,
      wastageType: 'percentage',
      wastageValue: 0,
      stoneValue: 0,
      additionalCharges: 0,
      gstRate,
      hsnCode: hsnCode || '7117',
      stockStatus: stockQuantity > 0 ? 'Available' : 'Sold',
      stockQuantity,
      isQuantityBased: true,
      location,
      supplier,
      dateAdded: new Date().toISOString().split('T')[0],
      isActive: true,
    };
  };

  const handleSaveAndPrint = () => {
    const item = createItemObject();
    addJewelleryItem(item);
    navigate(`/barcode?item=${item.id}`);
  };

  const handleSaveAndAddAnother = () => {
    const item = createItemObject();
    addJewelleryItem(item);
    // Reset form
    setName('');
    setSku('');
    setDescription('');
    handleRefreshBarcode();
    setCurrentStep(1);
    setErrors({});
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Wizard Steps Header */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#E5DDD0]">
        {[
          { step: 1, label: 'Product Info' },
          { step: 2, label: 'Pricing & GST' },
          { step: 3, label: 'Barcode & Tag' },
          { step: 4, label: 'Review & Save' },
        ].map(s => (
          <div key={s.step} className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                currentStep === s.step
                  ? 'bg-[#C9A96E] text-white shadow-xs'
                  : currentStep > s.step
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#FAF7F2] text-[#8A8278] border border-[#E5DDD0]'
              }`}
            >
              {currentStep > s.step ? '✓' : s.step}
            </div>
            <span
              className={`text-xs hidden sm:inline font-medium ${
                currentStep === s.step ? 'text-[#2D2A26] font-bold' : 'text-[#8A8278]'
              }`}
            >
              {s.label}
            </span>
            {s.step < 4 && <div className="h-px w-4 sm:w-8 bg-[#E5DDD0] mx-1" />}
          </div>
        ))}
      </div>

      {/* ========================================================
          STEP 1: PRODUCT INFO
         ======================================================== */}
      {currentStep === 1 && (
        <Card className="border-[#E5DDD0]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gem className="h-4 w-4 text-[#C9A96E]" />
              <span>1 Gram Jewellery Product Details</span>
            </CardTitle>
            <CardDescription>
              Enter product specifications, finish variant, and inventory location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Product Name *</Label>
              <Input
                placeholder="e.g. Antique Lakshmi Choker Set with Kemp Earrings"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                className={`mt-1 text-xs ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Category *</Label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as JewelleryCategory)}
                  className="w-full h-9 px-3 mt-1 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26]"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">SKU / Design Reference *</Label>
                <Input
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                  placeholder="e.g. 1GM-CHK-742"
                  className="mt-1 text-xs font-mono"
                />
                {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku}</p>}
              </div>
            </div>

            {/* Variant / Polish */}
            <div>
              <Label className="text-xs">Finish / Variant</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                {VARIANTS.slice(0, 4).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setVariant(v);
                      setCustomVariant('');
                    }}
                    className={`p-2 text-left rounded-md text-[11px] border transition-all ${
                      variant === v && !customVariant
                        ? 'border-[#C9A96E] bg-[#FAF7F2] font-semibold text-[#8F6F2C]'
                        : 'border-[#E5DDD0] bg-white text-[#2D2A26] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <Input
                  placeholder="Or enter custom variant (e.g. Temple Nakshi Matte Polish)"
                  value={customVariant}
                  onChange={e => setCustomVariant(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Display Location / Tray</Label>
                <Input
                  placeholder="e.g. Tray A1 / Front Glass Case"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Supplier / Artisan Code</Label>
                <Input
                  placeholder="e.g. Jaipur Crafts / In-House"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Description & Feature Notes (Optional)</Label>
              <Textarea
                placeholder="Product description for invoice and display..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="mt-1 text-xs"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-[#E5DDD0] pt-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/catalogue')} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              className="text-xs gap-1 bg-[#C9A96E] hover:bg-[#B89555] text-white"
            >
              Next: Pricing & GST <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ========================================================
          STEP 2: RETAIL PRICING & GST
         ======================================================== */}
      {currentStep === 2 && (
        <Card className="border-[#E5DDD0]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[#C9A96E]" />
              <span>Standard Retail Pricing & GST (HSN 7117)</span>
            </CardTitle>
            <CardDescription>
              Set MRP, Selling Price, inventory quantity, and 3% composite GST
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Price Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-[#8A8278]">Cost Price (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={costPrice}
                  onChange={e => setCostPrice(Number(e.target.value))}
                  className="mt-1 text-xs font-mono"
                />
                <span className="text-[10px] text-[#8A8278]">Store purchase cost</span>
              </div>

              <div>
                <Label className="text-xs text-[#8A8278]">MRP (Maximum Retail Price ₹) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={mrp}
                  onChange={e => {
                    const newMrp = Number(e.target.value);
                    setMrp(newMrp);
                    if (discountPercent > 0) {
                      setSellingPrice(Math.round(newMrp * (1 - discountPercent / 100)));
                    } else {
                      setSellingPrice(newMrp);
                    }
                  }}
                  className={`mt-1 text-xs font-mono ${errors.mrp ? 'border-red-500' : ''}`}
                />
                <span className="text-[10px] text-[#8A8278]">Printed on physical tag</span>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#2D2A26]">Actual Selling Price (₹) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={sellingPrice}
                  onChange={e => handleSellingPriceChange(Number(e.target.value))}
                  className={`mt-1 text-xs font-mono font-bold text-[#2D2A26] border-[#C9A96E] ${
                    errors.sellingPrice ? 'border-red-500' : ''
                  }`}
                />
                <span className="text-[10px] text-emerald-700">Charged at POS checkout</span>
              </div>
            </div>

            {/* Discount & Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-[#8A8278]">Discount Offered (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={90}
                  value={discountPercent}
                  onChange={e => handleDiscountChange(Number(e.target.value))}
                  className="mt-1 text-xs font-mono"
                />
                <span className="text-[10px] text-[#8A8278]">
                  Save {discountPercent > 0 ? `₹${mrp - sellingPrice}` : '₹0'}
                </span>
              </div>

              <div>
                <Label className="text-xs text-[#8A8278]">Stock Quantity (Units) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={stockQuantity}
                  onChange={e => setStockQuantity(Number(e.target.value))}
                  className="mt-1 text-xs font-mono font-bold"
                />
                <span className="text-[10px] text-[#8A8278]">Available pieces in inventory</span>
              </div>

              <div>
                <Label className="text-xs text-[#8A8278]">HSN Code & GST Rate</Label>
                <div className="flex items-center gap-1.5 mt-1">
                  <Input
                    value={hsnCode}
                    onChange={e => setHsnCode(e.target.value)}
                    className="text-xs font-mono w-24"
                    placeholder="7117"
                  />
                  <div className="h-9 px-3 bg-[#FAF7F2] border border-[#E5DDD0] rounded-md flex items-center text-xs font-mono font-bold text-[#2D2A26]">
                    3% GST
                  </div>
                </div>
                <span className="text-[10px] text-[#8A8278]">HSN 7117: Imitation Jewellery</span>
              </div>
            </div>

            {/* Live GST & Margin Summary Card */}
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#2D2A26] pb-2 border-b border-[#E5DDD0]">
                <span>Tax Invoice Breakdown (Rule 46 GST)</span>
                <Badge variant="gold" className="text-[10px]">
                  Gross Profit Margin: {profitMargin}%
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[#8A8278] block text-[11px]">Taxable Value:</span>
                  <p className="font-mono font-semibold text-[#2D2A26]">₹{taxableAmount.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[#8A8278] block text-[11px]">CGST (1.5%):</span>
                  <p className="font-mono text-[#2D2A26]">₹{cgstAmount.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[#8A8278] block text-[11px]">SGST (1.5%):</span>
                  <p className="font-mono text-[#2D2A26]">₹{sgstAmount.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[#8A8278] block text-[11px]">Total Payable:</span>
                  <p className="font-mono font-bold text-emerald-800">₹{sellingPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-[#E5DDD0] pt-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="text-xs gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              className="text-xs gap-1 bg-[#C9A96E] hover:bg-[#B89555] text-white"
            >
              Next: Barcode & Tag <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ========================================================
          STEP 3: BARCODE & PHYSICAL TAG SETUP
         ======================================================== */}
      {currentStep === 3 && (
        <Card className="border-[#E5DDD0]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarcodeIcon className="h-4 w-4 text-[#C9A96E]" />
              <span>Barcode Generation & Printable Tag Setup</span>
            </CardTitle>
            <CardDescription>
              Assign a guaranteed unique Code 128 barcode for optical scanning at checkout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Unique Barcode Value *</Label>
                <div className="flex items-center gap-1.5 mt-1">
                  <Input
                    value={barcode}
                    onChange={e => {
                      setBarcode(e.target.value.toUpperCase());
                      if (errors.barcode) setErrors(prev => ({ ...prev, barcode: '' }));
                    }}
                    className={`text-xs font-mono font-bold ${
                      errors.barcode ? 'border-red-500' : ''
                    }`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshBarcode}
                    className="h-9 px-3 text-xs gap-1 border-[#E5DDD0]"
                    title="Generate New Unique Barcode"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {errors.barcode ? (
                  <p className="text-xs text-red-500 mt-1">{errors.barcode}</p>
                ) : (
                  <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Guaranteed unique barcode
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs">Item Code / Display Tag Ref</Label>
                <Input
                  value={itemCode}
                  onChange={e => setItemCode(e.target.value)}
                  className="mt-1 text-xs font-mono"
                />
                <span className="text-[10px] text-[#8A8278]">Internal inventory reference</span>
              </div>
            </div>

            {/* Live Physical Tag Preview */}
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2D2A26] flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-[#C9A96E]" />
                  <span>Physical Jewellery Tag Preview (50 × 25 mm)</span>
                </span>
                <Badge variant="outline" className="text-[10px]">Rat-tail / Adhesive</Badge>
              </div>

              <div className="flex justify-center p-4">
                <div className="w-72 bg-white rounded-lg border-2 border-dashed border-[#C9A96E] p-3 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-1">
                    <span className="font-serif text-[10px] font-bold text-[#2D2A26] uppercase tracking-wide">
                      {storeInfo.name}
                    </span>
                    <span className="text-[9px] font-mono font-semibold text-[#8A8278]">
                      HSN 7117
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-[#2D2A26] leading-tight line-clamp-1">
                      {name || '1 Gram Jewellery Piece'}
                    </p>
                    <p className="text-[10px] text-[#8A8278]">{finalVariant}</p>
                  </div>

                  <div className="flex justify-center py-1">
                    <svg ref={barcodeSvgRef} className="max-w-full" />
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#E5DDD0] text-xs">
                    <div>
                      {discountPercent > 0 && (
                        <span className="text-[10px] line-through text-[#8A8278] block">
                          MRP: ₹{mrp}
                        </span>
                      )}
                      <span className="font-serif font-bold text-sm text-[#2D2A26]">
                        ₹{sellingPrice}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#8A8278]">{sku}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-[#E5DDD0] pt-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="text-xs gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              className="text-xs gap-1 bg-[#C9A96E] hover:bg-[#B89555] text-white"
            >
              Next: Review & Save <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ========================================================
          STEP 4: REVIEW & SAVE
         ======================================================== */}
      {currentStep === 4 && (
        <Card className="border-[#E5DDD0]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Review Product & Add to Catalogue</span>
            </CardTitle>
            <CardDescription>
              Verify item details before committing to inventory and generating barcode labels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#2D2A26]">{name}</h3>
                  <p className="text-xs text-[#8A8278] mt-0.5">
                    {category} • {finalVariant} • {location}
                  </p>
                </div>
                <Badge variant="gold" className="text-xs">
                  {stockQuantity} Units In Stock
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E5DDD0] text-xs">
                <div>
                  <span className="text-[11px] text-[#8A8278] block">SKU Code:</span>
                  <p className="font-mono font-bold text-[#2D2A26]">{sku}</p>
                </div>
                <div>
                  <span className="text-[11px] text-[#8A8278] block">Barcode (128):</span>
                  <p className="font-mono font-bold text-emerald-800">{barcode}</p>
                </div>
                <div>
                  <span className="text-[11px] text-[#8A8278] block">MRP:</span>
                  <p className="font-mono text-[#8A8278]">₹{mrp}</p>
                </div>
                <div>
                  <span className="text-[11px] text-[#8A8278] block">Selling Price:</span>
                  <p className="font-serif font-bold text-base text-[#2D2A26]">₹{sellingPrice}</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>
                Ready to add to Shree Lakshmi Jewellers catalogue. You can immediately print physical tags or scan this item at POS checkout.
              </span>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5DDD0] pt-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="text-xs gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAndAddAnother}
                className="text-xs border-[#E5DDD0]"
              >
                Save & Add Another
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAndPrint}
                className="text-xs gap-1.5 bg-[#C9A96E] hover:bg-[#B89555] text-white shadow-xs"
              >
                <Printer className="h-3.5 w-3.5" /> Save & Print Label
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
