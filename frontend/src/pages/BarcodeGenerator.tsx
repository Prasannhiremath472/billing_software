import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import {
  Barcode as BarcodeIcon,
  Search,
  Printer,
  Download,
  Copy,
  RefreshCw,
  CheckCircle2,
  Sliders,
  Layers,
  Sparkles,
  Tag,
  Box,
  Check,
  ChevronRight,
  Filter,
  PlusCircle,
  Gem,
  Plus,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import {
  formatCurrency,
  formatWeight,
  generateBarcode,
  generateUniqueBarcode,
  generateItemCode,
} from '@/lib/utils';
import {
  getJewelleryItems,
  createJewelleryItem,
  updateJewelleryItemBarcodes,
  getMetalRates,
  getTaxConfig,
  getStoreInfo,
} from '@/services/data-service';
import { errorMessage } from '@/services/api-client';
import { calculateItemPricing, getMetalRate } from '@/lib/pricing';
import type {
  JewelleryItem,
  JewelleryCategory,
  MetalType,
  Purity,
  MakingChargeType,
} from '@/types';

type LabelPreset = 'tag-50x25' | 'compact-40x20' | 'box-70x40';

export default function BarcodeGenerator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedIds = searchParams.get('items')?.split(',').filter(Boolean) || [];
  const singleItemId = searchParams.get('item');

  const [items, setItems] = useState<JewelleryItem[]>(getJewelleryItems());
  const storeInfo = getStoreInfo();
  const metalRates = getMetalRates();
  const taxConfig = getTaxConfig();

  // Mode: 'single' | 'bulk'
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>(
    preselectedIds.length > 0 ? 'bulk' : 'single'
  );

  // Selected item in Single Mode
  const [selectedItem, setSelectedItem] = useState<JewelleryItem | null>(() => {
    if (singleItemId) {
      const match = items.find(i => i.id === singleItemId || i.barcode === singleItemId);
      if (match) return match;
    }
    return items[0] || null;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');
  const [labelPreset, setLabelPreset] = useState<LabelPreset>('tag-50x25');
  const [copied, setCopied] = useState(false);
  const [bulkActionSuccess, setBulkActionSuccess] = useState('');

  // Field Toggles
  const [showStoreName, setShowStoreName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showItemCode, setShowItemCode] = useState(true);
  const [showBarcodeImg, setShowBarcodeImg] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(true);
  const [showPurity, setShowPurity] = useState(true);
  const [showGrossWeight, setShowGrossWeight] = useState(true);
  const [showNetWeight, setShowNetWeight] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showHuid, setShowHuid] = useState(true);
  const [printCopies, setPrintCopies] = useState<number>(1);

  // Bulk Selection State
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>(
    preselectedIds.length > 0 ? preselectedIds : items.slice(0, 4).map(i => i.id)
  );

  // SVG ref for single mode barcode
  const singleBarcodeSvgRef = useRef<SVGSVGElement>(null);
  const modalBarcodeSvgRef = useRef<SVGSVGElement>(null);

  // ==============================================================
  // CREATE NEW BARCODE & PRODUCT MODAL STATE
  // ==============================================================
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<JewelleryCategory>('1 Gram Gold Jewellery');
  const [newMetal, setNewMetal] = useState<MetalType>('1 Gram Gold');
  const [newPurity, setNewPurity] = useState<Purity>('22K');
  const [newGrossWeight, setNewGrossWeight] = useState<number>(5.5);
  const [newStoneWeight, setNewStoneWeight] = useState<number>(0);
  const [newHuid, setNewHuid] = useState('');
  const [newMakingType, setNewMakingType] = useState<MakingChargeType>('percentage');
  const [newMakingValue, setNewMakingValue] = useState<number>(12);
  const [newSellingPrice, setNewSellingPrice] = useState<number>(2450);
  const [newBarcode, setNewBarcode] = useState(() =>
    generateUniqueBarcode(items.map(i => i.barcode))
  );
  const [newItemCode, setNewItemCode] = useState(() => generateItemCode());
  const [newLocation, setNewLocation] = useState('Showroom Tray A1');
  const [createError, setCreateError] = useState('');

  const newNetWeight = Math.max(0, Math.round((newGrossWeight - newStoneWeight) * 1000) / 1000);

  // Compute live estimated price for modal
  const baseRate = getMetalRate(metalRates, newMetal, '24K');
  const previewItem: JewelleryItem = {
    id: 'temp-preview',
    productDesignId: 'design-temp',
    name: newName || 'Jewellery Piece',
    description: newName || 'Jewellery Piece',
    designCode: 'DSGN-CUSTOM',
    hsnCode:
      newMetal === '1 Gram Gold' ||
      newMetal === 'Imitation' ||
      newCategory === '1 Gram Gold Jewellery' ||
      newCategory === 'Imitation Jewellery'
        ? '7117'
        : newCategory === 'Coins'
        ? '7118'
        : '7113',
    sku: `SKU-${Date.now().toString().slice(-4)}`,
    barcode: newBarcode,
    itemCode: newItemCode,
    category: newCategory,
    metalType: newMetal,
    purity: newPurity,
    grossWeight: newGrossWeight,
    netWeight: newNetWeight,
    stoneWeight: newStoneWeight,
    makingChargeType: newMakingType,
    makingChargeValue: newMakingValue,
    wastageType: 'percentage',
    wastageValue: 5,
    stoneValue: 0,
    additionalCharges: 0,
    discount: 0,
    sellingPrice:
      newMetal === '1 Gram Gold' || newMetal === 'Imitation' ? newSellingPrice : 0,
    currentValuation:
      newMetal === '1 Gram Gold' || newMetal === 'Imitation' ? newSellingPrice : 0,
    gstRate: 3,
    stockStatus: 'Available',
    stockQuantity: 1,
    isQuantityBased: newMetal === '1 Gram Gold' || newMetal === 'Imitation',
    dateAdded: new Date().toISOString().split('T')[0],
    isActive: true,
  };

  const calculatedPricing = calculateItemPricing(previewItem, baseRate, taxConfig, 0);

  // Active barcode value for preview
  const activeBarcodeValue = selectedItem ? selectedItem.barcode : customBarcode || 'JWL-2026-0001';

  // Render single barcode in main studio
  useEffect(() => {
    if (singleBarcodeSvgRef.current && activeBarcodeValue && showBarcodeImg) {
      try {
        JsBarcode(singleBarcodeSvgRef.current, activeBarcodeValue, {
          format: 'CODE128',
          width: labelPreset === 'compact-40x20' ? 1.2 : 1.5,
          height: labelPreset === 'tag-50x25' ? 28 : labelPreset === 'compact-40x20' ? 22 : 40,
          displayValue: false,
          lineColor: '#000000',
          margin: 0,
        });
      } catch (err) {
        console.error('Barcode generation error:', err);
      }
    }
  }, [activeBarcodeValue, labelPreset, showBarcodeImg, activeTab]);

  // Render barcode in Create Modal
  useEffect(() => {
    if (showCreateModal && modalBarcodeSvgRef.current && newBarcode) {
      try {
        JsBarcode(modalBarcodeSvgRef.current, newBarcode, {
          format: 'CODE128',
          width: 1.4,
          height: 32,
          displayValue: false,
          lineColor: '#000000',
          margin: 0,
        });
      } catch (err) {
        console.error('Modal barcode error:', err);
      }
    }
  }, [showCreateModal, newBarcode]);

  // Bulk barcodes render helper
  useEffect(() => {
    if (activeTab === 'bulk') {
      selectedBulkIds.forEach(id => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        const svgEl = document.getElementById(`bulk-barcode-${id}`) as unknown as SVGSVGElement;
        if (svgEl && item.barcode) {
          try {
            JsBarcode(svgEl, item.barcode, {
              format: 'CODE128',
              width: 1.2,
              height: 24,
              displayValue: false,
              lineColor: '#000000',
              margin: 0,
            });
          } catch (e) {
            console.error('Bulk barcode render error:', e);
          }
        }
      });
    }
  }, [activeTab, selectedBulkIds, items, labelPreset]);

  // Open Create Modal handler
  const handleOpenCreateModal = () => {
    const freshBarcode = generateUniqueBarcode(items.map(i => i.barcode));
    setNewBarcode(freshBarcode);
    setNewItemCode(generateItemCode());
    setNewName('');
    setCreateError('');
    setShowCreateModal(true);
  };

  // Submit and create new product + barcode tag
  const handleCreateProductAndTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newName.trim()) {
      setCreateError('Please enter a product name (e.g. 22K Antique Floral Ring).');
      return;
    }
    if (newGrossWeight <= 0) {
      setCreateError('Gross weight must be greater than 0.');
      return;
    }
    if (newGrossWeight < newStoneWeight) {
      setCreateError('Stone weight cannot exceed gross weight.');
      return;
    }

    const allBarcodes = items.map(i => i.barcode.trim().toUpperCase());
    let finalBc = newBarcode.trim();
    if (!finalBc || allBarcodes.includes(finalBc.toUpperCase())) {
      finalBc = generateUniqueBarcode(items.map(i => i.barcode));
    }

    const catPrefix = newCategory.slice(0, 3).toUpperCase().replace(/\s+/g, '');
    const randSku = Math.floor(100 + Math.random() * 900);
    const generatedSku = `${catPrefix}-${randSku}`;

    const draftPiece: Omit<JewelleryItem, 'id' | 'dateAdded'> = {
      productDesignId: 'design-custom',
      name: newName.trim(),
      description: newName.trim(),
      designCode: `DSGN-${randSku}`,
      sku: generatedSku,
      variant: newHuid.trim() || 'Matte Finish (1 Gram Gold)',
      costPrice: Math.round(newSellingPrice * 0.6),
      mrp: Math.round(newSellingPrice * 1.25),
      barcode: finalBc,
      itemCode: newItemCode.trim() || generateItemCode(),
      category: newCategory,
      metalType: newMetal,
      purity: newPurity,
      hsnCode:
        newMetal === '1 Gram Gold' ||
        newMetal === 'Imitation' ||
        newCategory === '1 Gram Gold Jewellery' ||
        newCategory === 'Imitation Jewellery'
          ? '7117'
          : newCategory === 'Coins'
          ? '7118'
          : '7113',
      huid: newHuid.trim().toUpperCase() || undefined,
      grossWeight: newGrossWeight,
      netWeight: newNetWeight,
      stoneWeight: newStoneWeight,
      makingChargeType: newMakingType,
      makingChargeValue: newMakingValue,
      wastageType: 'percentage',
      wastageValue: 5,
      stoneValue: 0,
      additionalCharges: 0,
      discount: 0,
      sellingPrice:
        newMetal === '1 Gram Gold' || newMetal === 'Imitation'
          ? newSellingPrice
          : calculatedPricing.total,
      currentValuation:
        newMetal === '1 Gram Gold' || newMetal === 'Imitation'
          ? newSellingPrice
          : calculatedPricing.total,
      gstRate: 3,
      stockStatus: 'Available',
      stockQuantity: 5,
      isQuantityBased: true,
      location: newLocation.trim() || 'Showroom Tray 1',
      isActive: true,
    };

    // Save to database
    let newPiece: JewelleryItem;
    try {
      newPiece = await createJewelleryItem(draftPiece);
    } catch (err) {
      setCreateError(errorMessage(err, 'Could not save the product.'));
      return;
    }

    // Refresh local items state
    const refreshed = getJewelleryItems();
    setItems(refreshed);
    setSelectedItem(newPiece);
    setActiveTab('single');
    setShowCreateModal(false);

    setBulkActionSuccess(
      `Product "${newPiece.name}" added to stock with Barcode ${newPiece.barcode}! Physical tag is ready to print.`
    );
    setTimeout(() => setBulkActionSuccess(''), 5000);
  };

  // Handle barcode regeneration for single item
  const handleRegenerateBarcode = async () => {
    if (!selectedItem) {
      setCustomBarcode(generateBarcode());
      return;
    }
    const allBarcodes = items.map(i => i.barcode);
    const newBarcodeVal = generateUniqueBarcode(allBarcodes);
    try {
      await updateJewelleryItemBarcodes([{ id: selectedItem.id, barcode: newBarcodeVal }]);
    } catch (err) {
      setBulkActionSuccess('');
      window.alert(errorMessage(err, 'Could not update the barcode.'));
      return;
    }
    const updatedItems = getJewelleryItems();
    setItems(updatedItems);
    setSelectedItem({ ...selectedItem, barcode: newBarcodeVal });
    setBulkActionSuccess(`Updated barcode to ${newBarcodeVal} and saved to catalogue!`);
    setTimeout(() => setBulkActionSuccess(''), 3000);
  };

  // Handle bulk generate barcodes for all selected
  const handleBulkGenerateUnique = async () => {
    if (selectedBulkIds.length === 0) return;
    const existingList = items
      .filter(i => !selectedBulkIds.includes(i.id))
      .map(i => i.barcode);

    const updates = selectedBulkIds.map(id => {
      const barcode = generateUniqueBarcode(existingList);
      existingList.push(barcode);
      return { id, barcode };
    });

    try {
      await updateJewelleryItemBarcodes(updates);
    } catch (err) {
      window.alert(errorMessage(err, 'Could not update the barcodes.'));
      return;
    }
    const updatedItems = getJewelleryItems();
    setItems(updatedItems);
    setBulkActionSuccess(`Successfully generated unique Code 128 barcodes for ${selectedBulkIds.length} items!`);
    setTimeout(() => setBulkActionSuccess(''), 4000);
  };

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(activeBarcodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSVG = () => {
    if (!singleBarcodeSvgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(singleBarcodeSvgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `Barcode_${activeBarcodeValue}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleDownloadPNG = () => {
    if (!singleBarcodeSvgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(singleBarcodeSvgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2 || 300;
      canvas.height = img.height * 2 || 120;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `Barcode_${activeBarcodeValue}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.itemCode.toLowerCase().includes(q) ||
      item.barcode.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Mode Switcher */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs">
        <div>
          <h1 className="font-serif text-lg font-bold text-[#2D2A26] flex items-center gap-2">
            <BarcodeIcon className="h-5 w-5 text-[#C9A96E]" />
            <span>Barcode & Label Printing Studio</span>
          </h1>
          <p className="text-xs text-[#8A8278]">
            Code 128 barcode generation, rat-tail jewellery tags & bulk thermal print designer
          </p>
        </div>

        {/* Tab Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* PRIMARY CALL TO ACTION: CREATE NEW BARCODE & PRODUCT */}
          <Button
            onClick={handleOpenCreateModal}
            size="sm"
            className="gap-1.5 bg-[#2D6A4F] hover:bg-[#22543d] text-white shadow-xs font-semibold"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Create Barcode & Product</span>
          </Button>

          <div className="flex rounded-lg border border-[#E5DDD0] p-1 bg-[#FAF7F2]">
            <button
              onClick={() => setActiveTab('single')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'single'
                  ? 'bg-white text-[#2D2A26] shadow-xs'
                  : 'text-[#8A8278] hover:text-[#2D2A26]'
              }`}
            >
              Single Item Tag
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'bulk'
                  ? 'bg-[#C9A96E] text-white shadow-xs'
                  : 'text-[#8A8278] hover:text-[#2D2A26]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Bulk Multi-Print</span>
              {selectedBulkIds.length > 0 && (
                <span className="text-[10px] bg-white/30 text-inherit px-1 rounded-full">
                  {selectedBulkIds.length}
                </span>
              )}
            </button>
          </div>

          <Button onClick={handlePrint} size="sm" className="gap-1.5 shadow-xs">
            <Printer className="h-3.5 w-3.5" />
            <span>Print {activeTab === 'single' ? 'Tag' : 'All Labels'}</span>
          </Button>
        </div>
      </div>

      {bulkActionSuccess && (
        <div className="no-print p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{bulkActionSuccess}</span>
        </div>
      )}

      {/* Preset & Field Controls Ribbon (Common to both modes) */}
      <div className="no-print p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Preset Buttons */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#8A8278]">Tag Size Preset:</span>
            <div className="flex rounded-md border border-[#E5DDD0] bg-[#FAF7F2] p-0.5">
              <button
                onClick={() => setLabelPreset('tag-50x25')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  labelPreset === 'tag-50x25'
                    ? 'bg-[#2D2A26] text-white shadow-xs'
                    : 'text-[#5C564E] hover:text-[#2D2A26]'
                }`}
              >
                50x25mm (Jewellery Tag)
              </button>
              <button
                onClick={() => setLabelPreset('compact-40x20')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  labelPreset === 'compact-40x20'
                    ? 'bg-[#2D2A26] text-white shadow-xs'
                    : 'text-[#5C564E] hover:text-[#2D2A26]'
                }`}
              >
                40x20mm (Compact)
              </button>
              <button
                onClick={() => setLabelPreset('box-70x40')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  labelPreset === 'box-70x40'
                    ? 'bg-[#2D2A26] text-white shadow-xs'
                    : 'text-[#5C564E] hover:text-[#2D2A26]'
                }`}
              >
                70x40mm (Box / Pouch)
              </button>
            </div>
          </div>

          {/* Copies (Single Mode) */}
          {activeTab === 'single' && (
            <div className="flex items-center gap-1.5 text-xs text-[#8A8278]">
              <span>Print Copies:</span>
              <input
                type="number"
                min={1}
                max={50}
                value={printCopies}
                onChange={e => setPrintCopies(Math.max(1, Number(e.target.value) || 1))}
                className="w-14 h-8 px-2 border border-[#E5DDD0] rounded text-center font-mono bg-[#FAF7F2] text-[#2D2A26]"
              />
            </div>
          )}
        </div>

        {/* Visibility Toggles */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-[#F5F0E8] text-xs">
          <span className="font-semibold text-[#8A8278]">Show on Label:</span>
          {[
            { label: 'Store Name', state: showStoreName, set: setShowStoreName },
            { label: 'Product Name', state: showProductName, set: setShowProductName },
            { label: 'Item Code', state: showItemCode, set: setShowItemCode },
            { label: 'Barcode Graphic', state: showBarcodeImg, set: setShowBarcodeImg },
            { label: 'Barcode Text', state: showBarcodeText, set: setShowBarcodeText },
            { label: 'Purity', state: showPurity, set: setShowPurity },
            { label: 'Gross Wt', state: showGrossWeight, set: setShowGrossWeight },
            { label: 'Net Wt', state: showNetWeight, set: setShowNetWeight },
            { label: 'Price / MRP', state: showPrice, set: setShowPrice },
            { label: 'HUID', state: showHuid, set: setShowHuid },
          ].map(toggle => (
            <label key={toggle.label} className="flex items-center gap-1.5 cursor-pointer text-[#3D3A36] select-none">
              <input
                type="checkbox"
                checked={toggle.state}
                onChange={e => toggle.set(e.target.checked)}
                className="rounded border-[#C9A96E] text-[#C9A96E] focus:ring-[#C9A96E] h-3.5 w-3.5 cursor-pointer"
              />
              <span>{toggle.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODE 1: SINGLE ITEM TAG GENERATOR */}
      {/* ============================================================== */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Select Item & Barcode Tools (5 Cols) */}
          <div className="no-print lg:col-span-5 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Select Jewellery Item</CardTitle>
                <CardDescription className="text-xs">
                  Pick from catalogue to generate or inspect its unique Code 128 tag
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* FRESH PIECE CREATION SHORTCUT BANNER */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-[#FAF7F2] to-white border border-[#E5DDD0] flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <p className="font-serif font-bold text-xs text-[#2D2A26] flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#C9A96E]" />
                      <span>Tagging a fresh piece?</span>
                    </p>
                    <p className="text-[11px] text-[#8A8278]">Add product & generate barcode tag instantly</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleOpenCreateModal}
                    className="h-8 px-2.5 text-xs bg-[#2D2A26] hover:bg-[#3D3A36] text-white gap-1.5 shadow-xs shrink-0"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-[#C9A96E]" />
                    <span>+ Add & Create</span>
                  </Button>
                </div>

                {/* Search in catalogue */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8A8278]" />
                  <Input
                    placeholder="Search by name, SKU or item code..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>

                {/* Dropdown Selector */}
                <div>
                  <Label className="text-xs text-[#8A8278] mb-1 block">Active Piece</Label>
                  <select
                    value={selectedItem?.id || ''}
                    onChange={e => {
                      const found = items.find(i => i.id === e.target.value);
                      setSelectedItem(found || null);
                    }}
                    className="w-full h-9 px-3 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26] font-medium"
                  >
                    {filteredItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.itemCode}) — {item.barcode}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item Details Summary */}
                {selectedItem && (
                  <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#8A8278]">Item Code:</span>
                      <span className="font-mono font-bold text-[#2D2A26]">{selectedItem.itemCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8A8278]">SKU:</span>
                      <span className="font-mono text-[#2D2A26]">{selectedItem.sku}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8A8278]">Metal & Purity:</span>
                      <span className="font-semibold text-[#8F6F2C]">
                        {selectedItem.metalType} {selectedItem.purity}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8A8278]">Gross / Net Weight:</span>
                      <span className="font-mono text-[#2D2A26]">
                        {formatWeight(selectedItem.grossWeight)} / {formatWeight(selectedItem.netWeight)}
                      </span>
                    </div>
                    {selectedItem.huid && (
                      <div className="flex justify-between">
                        <span className="text-[#8A8278]">HUID:</span>
                        <span className="font-mono font-bold text-[#C9A96E]">{selectedItem.huid}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-[#E5DDD0]">
                      <span className="text-[#8A8278]">Selling Price:</span>
                      <span className="font-mono font-bold text-sm text-[#2D2A26]">
                        {formatCurrency(selectedItem.sellingPrice)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Barcode Number & Actions */}
                <div className="space-y-2 pt-2 border-t border-[#E5DDD0]">
                  <Label className="text-xs text-[#8A8278] flex items-center justify-between">
                    <span>Code 128 Barcode Value</span>
                    <button
                      onClick={handleRegenerateBarcode}
                      className="text-[#C9A96E] hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Regenerate Unique</span>
                    </button>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={activeBarcodeValue}
                      readOnly
                      className="font-mono font-bold text-sm tracking-wider bg-white h-9"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyBarcode}
                      className="h-9 px-3 shrink-0"
                      title="Copy Barcode"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied && <span className="text-[10px] text-emerald-700 ml-1">Copied!</span>}
                    </Button>
                  </div>
                </div>

                {/* Export Artwork Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadSVG}
                    className="text-xs gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download SVG</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPNG}
                    className="text-xs gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download PNG</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Physical Label Preview & Print Studio (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Physical Label Preview</CardTitle>
                  <CardDescription className="text-xs">
                    Actual size representation for standard jewellery thermal roll printing
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {labelPreset === 'tag-50x25'
                    ? '50mm × 25mm'
                    : labelPreset === 'compact-40x20'
                    ? '40mm × 20mm'
                    : '70mm × 40mm'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Live Preview Container with soft background */}
                <div className="p-8 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] flex flex-col items-center justify-center min-h-[260px]">
                  {/* PHYSICAL TAG CARD */}
                  <div
                    id="printable-single-tag"
                    className={`bg-white border border-[#2D2A26] rounded-sm shadow-md text-[#2D2A26] p-2 flex flex-col justify-between overflow-hidden transition-all ${
                      labelPreset === 'tag-50x25'
                        ? 'w-[280px] h-[140px]'
                        : labelPreset === 'compact-40x20'
                        ? 'w-[226px] h-[113px]'
                        : 'w-[360px] h-[180px]'
                    }`}
                  >
                    {/* Top Row: Store Name & Item Code */}
                    <div className="flex items-start justify-between border-b border-gray-200 pb-1">
                      {showStoreName && (
                        <span className="font-serif font-bold text-[10px] tracking-tight uppercase truncate max-w-[140px]">
                          {storeInfo.name}
                        </span>
                      )}
                      {showItemCode && (
                        <span className="font-mono font-bold text-[9px] text-gray-700 ml-auto">
                          {selectedItem?.itemCode || 'JW000000'}
                        </span>
                      )}
                    </div>

                    {/* Middle: Product Name & Specs */}
                    <div className="my-0.5">
                      {showProductName && (
                        <p className="font-semibold text-[10px] leading-tight truncate">
                          {selectedItem?.name || 'Jewellery Piece'}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-2 text-[9px] text-gray-700 mt-0.5 font-medium">
                        {selectedItem?.variant ? (
                          <span className="text-[#8F6F2C] font-semibold">{selectedItem.variant}</span>
                        ) : showPurity && (
                          <span>
                            {selectedItem?.metalType} {selectedItem?.purity}
                          </span>
                        )}
                        <span className="font-mono text-[#8A8278]">HSN {selectedItem?.hsnCode || '7117'}</span>
                      </div>
                    </div>

                    {/* Barcode SVG graphic */}
                    {showBarcodeImg && (
                      <div className="flex flex-col items-center justify-center my-0.5">
                        <svg ref={singleBarcodeSvgRef} className="max-w-full" />
                      </div>
                    )}

                    {/* Bottom: Barcode Numeric Text & Price / HUID */}
                    <div className="flex items-end justify-between border-t border-gray-200 pt-0.5 text-[9px]">
                      <div>
                        {showBarcodeText && (
                          <span className="font-mono font-bold tracking-wider text-[9px] block">
                            {activeBarcodeValue}
                          </span>
                        )}
                        {showHuid && selectedItem?.huid && (
                          <span className="font-mono text-[8px] text-gray-600 block">
                            HUID: {selectedItem.huid}
                          </span>
                        )}
                      </div>

                      {showPrice && (
                        <span className="font-mono font-bold text-[10px] text-[#2D2A26]">
                          {formatCurrency(selectedItem?.sellingPrice || 0)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rat-tail / Dumbbell representation hint */}
                  {labelPreset === 'tag-50x25' && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#8A8278]">
                      <div className="w-8 h-1 bg-[#C9A96E]/50 rounded-full" />
                      <span>Rat-tail ribbon cord area attaches here</span>
                      <div className="w-8 h-1 bg-[#C9A96E]/50 rounded-full" />
                    </div>
                  )}
                </div>

                {/* Print Action Bottom Bar */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-[#8A8278]">
                    Printing <strong className="text-[#2D2A26]">{printCopies}</strong> {printCopies === 1 ? 'copy' : 'copies'} to thermal tag printer
                  </div>
                  <Button onClick={handlePrint} className="gap-2 shadow-xs">
                    <Printer className="h-4 w-4" />
                    <span>Print Tag Now</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: BULK BATCH GENERATION & MULTI-LABEL PRINT */}
      {/* ============================================================== */}
      {activeTab === 'bulk' && (
        <div className="space-y-6">
          {/* Top Bulk Action Bar */}
          <Card className="no-print">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#C9A96E]/20 text-[#8F6F2C] flex items-center justify-center font-bold">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#2D2A26]">
                    Bulk Batch Label Studio
                  </h3>
                  <p className="text-xs text-[#8A8278]">
                    Selected <strong className="text-[#2D2A26] font-mono">{selectedBulkIds.length}</strong> items from catalogue
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedBulkIds.length === items.length) {
                      setSelectedBulkIds([]);
                    } else {
                      setSelectedBulkIds(items.map(i => i.id));
                    }
                  }}
                  className="text-xs"
                >
                  {selectedBulkIds.length === items.length ? 'Deselect All' : 'Select All Items'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkGenerateUnique}
                  className="text-xs gap-1.5 text-[#8F6F2C] border-[#C9A96E]/50 hover:bg-[#FAF7F2]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Assign Unique Barcodes</span>
                </Button>

                <Button
                  onClick={handlePrint}
                  size="sm"
                  disabled={selectedBulkIds.length === 0}
                  className="text-xs gap-1.5 shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Selected ({selectedBulkIds.length})</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Catalogue Selection Table with Checkboxes */}
          <Card className="no-print">
            <div className="p-3 border-b border-[#E5DDD0] bg-[#FAF7F2]/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#2D2A26]">Catalogue Selection Table</span>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8A8278]" />
                <Input
                  placeholder="Filter catalogue..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-7.5 pl-8 text-xs"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#FAF7F2] text-[#8A8278] sticky top-0 border-b border-[#E5DDD0]">
                  <tr>
                    <th className="p-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedBulkIds.length > 0 && selectedBulkIds.length === items.length}
                        onChange={e => {
                          if (e.target.checked) setSelectedBulkIds(items.map(i => i.id));
                          else setSelectedBulkIds([]);
                        }}
                        className="rounded border-[#C9A96E] text-[#C9A96E] focus:ring-[#C9A96E] h-3.5 w-3.5 cursor-pointer"
                      />
                    </th>
                    <th className="p-2.5 text-left font-semibold">Item & SKU</th>
                    <th className="p-2.5 text-left font-semibold">Current Barcode</th>
                    <th className="p-2.5 text-left font-semibold">Metal / Purity</th>
                    <th className="p-2.5 text-right font-semibold">Gross Wt</th>
                    <th className="p-2.5 text-right font-semibold">Net Wt</th>
                    <th className="p-2.5 text-right font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F0E8]">
                  {filteredItems.map(item => {
                    const isChecked = selectedBulkIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-[#FAF7F2]/60 cursor-pointer ${
                          isChecked ? 'bg-[#FAF7F2]' : ''
                        }`}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedBulkIds(selectedBulkIds.filter(id => id !== item.id));
                          } else {
                            setSelectedBulkIds([...selectedBulkIds, item.id]);
                          }
                        }}
                      >
                        <td className="p-2.5 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) setSelectedBulkIds([...selectedBulkIds, item.id]);
                              else setSelectedBulkIds(selectedBulkIds.filter(id => id !== item.id));
                            }}
                            className="rounded border-[#C9A96E] text-[#C9A96E] focus:ring-[#C9A96E] h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>
                        <td className="p-2.5">
                          <span className="font-semibold text-[#2D2A26] block">{item.name}</span>
                          <span className="text-[10px] text-[#8A8278] font-mono">{item.sku} • {item.itemCode}</span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-[#8F6F2C] text-[11px]">
                          {item.barcode}
                        </td>
                        <td className="p-2.5 text-[#5C564E]">
                          {item.metalType} {item.purity}
                        </td>
                        <td className="p-2.5 text-right font-mono text-[#5C564E]">{formatWeight(item.grossWeight)}</td>
                        <td className="p-2.5 text-right font-mono font-medium text-[#2D2A26]">{formatWeight(item.netWeight)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-[#2D2A26]">{formatCurrency(item.sellingPrice)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* BULK LABELS PREVIEW GRID */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-sm font-bold text-[#2D2A26]">
                Print Preview Grid ({selectedBulkIds.length} Labels)
              </h3>
              <span className="text-xs text-[#8A8278]">
                Formatted for continuous thermal label roll or A4 sticker sheet
              </span>
            </div>

            <div
              id="printable-bulk-grid"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-white border border-[#E5DDD0]"
            >
              {selectedBulkIds.length === 0 ? (
                <div className="col-span-full p-8 text-center text-xs text-[#8A8278]">
                  Select jewellery items from the catalogue above to preview and batch-print labels
                </div>
              ) : (
                selectedBulkIds.map(id => {
                  const item = items.find(i => i.id === id);
                  if (!item) return null;

                  return (
                    <div
                      key={item.id}
                      className="print-label-item bg-white border border-[#2D2A26] rounded-sm p-2 flex flex-col justify-between text-[#2D2A26] min-h-[130px] shadow-xs"
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between border-b border-gray-200 pb-0.5">
                        {showStoreName && (
                          <span className="font-serif font-bold text-[9px] tracking-tight uppercase truncate">
                            {storeInfo.name}
                          </span>
                        )}
                        {showItemCode && (
                          <span className="font-mono font-bold text-[8px] text-gray-700 ml-auto">
                            {item.itemCode}
                          </span>
                        )}
                      </div>

                      {/* Product Name & Specs */}
                      <div className="my-0.5">
                        {showProductName && (
                          <p className="font-semibold text-[9px] leading-tight truncate">
                            {item.name}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[8px] text-gray-700 mt-0.5 font-medium">
                          {item.variant ? (
                            <span className="text-[#8F6F2C] font-semibold truncate max-w-[120px]">{item.variant}</span>
                          ) : showPurity ? (
                            <span>{item.metalType} {item.purity}</span>
                          ) : null}
                          <span className="font-mono text-[#8A8278]">HSN {item.hsnCode || '7117'}</span>
                        </div>
                      </div>

                      {/* Barcode Graphic */}
                      {showBarcodeImg && (
                        <div className="flex items-center justify-center my-0.5">
                          <svg id={`bulk-barcode-${item.id}`} className="max-w-full" />
                        </div>
                      )}

                      {/* Bottom row */}
                      <div className="flex items-end justify-between border-t border-gray-200 pt-0.5 text-[8px]">
                        <div>
                          {showBarcodeText && (
                            <span className="font-mono font-bold tracking-wider text-[8px] block">
                              {item.barcode}
                            </span>
                          )}
                          {showHuid && item.huid && (
                            <span className="font-mono text-[7px] text-gray-600 block">
                              HUID: {item.huid}
                            </span>
                          )}
                        </div>
                        {showPrice && (
                          <span className="font-mono font-bold text-[9px] text-[#2D2A26]">
                            {formatCurrency(item.sellingPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DIALOG: CREATE NEW BARCODE & ADD PRODUCT */}
      {/* ============================================================== */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <div className="max-w-2xl mx-auto space-y-4">
          <DialogHeader onClose={() => setShowCreateModal(false)}>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-[#2D6A4F]" />
              <span>Create New Barcode & Add Jewellery Product</span>
            </DialogTitle>
            <DialogDescription>
              Register a fresh physical piece into inventory, generate a guaranteed unique Code 128 barcode, and produce a printable tag immediately.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateProductAndTag} className="space-y-4">
            {/* Row 1: Product Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label required>Product Title / Description</Label>
                <Input
                  placeholder="e.g. 22K Traditional Peacock Bangle"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="text-xs h-9"
                  autoFocus
                />
              </div>

              <div>
                <Label>Catalogue Category</Label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as JewelleryCategory)}
                  className="w-full h-9 px-3 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26]"
                >
                  <option value="Gold Rings">Gold Rings</option>
                  <option value="Gold Necklaces">Gold Necklaces</option>
                  <option value="Gold Chains">Gold Chains</option>
                  <option value="Bangles">Bangles</option>
                  <option value="Earrings">Earrings</option>
                  <option value="Bracelets">Bracelets</option>
                  <option value="Pendants">Pendants</option>
                  <option value="Mangalsutra">Mangalsutra</option>
                  <option value="1 Gram Gold Jewellery">1 Gram Gold Jewellery</option>
                  <option value="Imitation Jewellery">Imitation Jewellery</option>
                  <option value="Diamond Jewellery">Diamond Jewellery</option>
                  <option value="Silver Jewellery">Silver Jewellery</option>
                  <option value="Platinum Jewellery">Platinum Jewellery</option>
                  <option value="Coins">Coins & Bullion</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Row 2: Metal, Purity & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Metal Type</Label>
                <select
                  value={newMetal}
                  onChange={e => {
                    const m = e.target.value as MetalType;
                    setNewMetal(m);
                    if (m === 'Gold') setNewPurity('22K');
                    else if (m === '1 Gram Gold') {
                      setNewPurity('1gm Micro Plated');
                      setNewCategory('1 Gram Gold Jewellery');
                    } else if (m === 'Imitation') {
                      setNewPurity('Micro Plated');
                      setNewCategory('Imitation Jewellery');
                    } else if (m === 'Silver') setNewPurity('999');
                    else if (m === 'Platinum') setNewPurity('950');
                  }}
                  className="w-full h-9 px-3 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26]"
                >
                  <option value="Gold">Gold</option>
                  <option value="1 Gram Gold">1 Gram Gold</option>
                  <option value="Imitation">Imitation Jewellery</option>
                  <option value="Silver">Silver</option>
                  <option value="Platinum">Platinum</option>
                  <option value="Diamond">Diamond</option>
                </select>
              </div>

              <div>
                <Label>Purity</Label>
                <select
                  value={newPurity}
                  onChange={e => setNewPurity(e.target.value as Purity)}
                  className="w-full h-9 px-3 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26]"
                >
                  {newMetal === 'Gold' && (
                    <>
                      <option value="22K">22K (916 Hallmarked)</option>
                      <option value="18K">18K (750 Purity)</option>
                      <option value="24K">24K (999 Fine Gold)</option>
                      <option value="14K">14K (585 Purity)</option>
                    </>
                  )}
                  {newMetal === '1 Gram Gold' && (
                    <>
                      <option value="1gm Micro Plated">1gm Micro Plated</option>
                      <option value="1g Formed Gold">1g Formed Gold</option>
                      <option value="Micro Gold Plated">Micro Gold Plated</option>
                    </>
                  )}
                  {newMetal === 'Imitation' && (
                    <>
                      <option value="Micro Plated">Micro Plated</option>
                      <option value="Kemp/Antique">Kemp / Antique Finish</option>
                      <option value="Gold Plated">Gold Plated</option>
                    </>
                  )}
                  {newMetal === 'Silver' && (
                    <>
                      <option value="999">999 Fine Silver</option>
                      <option value="925">925 Sterling Silver</option>
                    </>
                  )}
                  {newMetal === 'Platinum' && <option value="950">950 Platinum</option>}
                  {newMetal === 'Diamond' && <option value="18K">18K Diamond Studded</option>}
                </select>
              </div>

              <div>
                <Label>Showroom Location / Tray</Label>
                <Input
                  placeholder="e.g. Tray B-12"
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Row 3: Precision Weights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0]">
              <div>
                <Label required>Gross Weight (grams)</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={newGrossWeight}
                  onChange={e => setNewGrossWeight(Number(e.target.value) || 0)}
                  className="text-xs h-9 font-mono font-semibold"
                />
              </div>

              <div>
                <Label>Stone / Enamel Wt (grams)</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={newStoneWeight}
                  onChange={e => setNewStoneWeight(Number(e.target.value) || 0)}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div>
                <Label>Net Pure Weight</Label>
                <div className="h-9 px-3 flex items-center rounded-md border border-[#E5DDD0] bg-white font-mono text-xs font-bold text-[#2D2A26]">
                  {formatWeight(newNetWeight)}
                </div>
              </div>
            </div>

            {/* Row 4: Pricing / Making Charges & Tag Ref */}
            {newMetal === '1 Gram Gold' || newMetal === 'Imitation' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-amber-50/50 rounded-lg border border-amber-200">
                <div>
                  <Label required>Piece Selling Price / MRP (₹)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newSellingPrice}
                    onChange={e => setNewSellingPrice(Number(e.target.value) || 0)}
                    className="text-xs h-9 font-mono font-bold text-[#2D2A26] border-[#C9A96E] bg-white"
                    placeholder="e.g. 2450"
                  />
                </div>

                <div>
                  <Label>GST HSN Code</Label>
                  <div className="h-9 px-3 flex items-center rounded-md border border-[#E5DDD0] bg-white font-mono text-xs font-semibold text-[#2D2A26]">
                    7117 (3% GST)
                  </div>
                </div>

                <div>
                  <Label>Tag Subtitle / Note</Label>
                  <Input
                    placeholder="e.g. Temple Matte Finish"
                    value={newHuid}
                    onChange={e => setNewHuid(e.target.value)}
                    className="text-xs h-9 text-[#2D2A26] bg-white"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Making Charge Type</Label>
                  <select
                    value={newMakingType}
                    onChange={e => setNewMakingType(e.target.value as MakingChargeType)}
                    className="w-full h-9 px-3 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26]"
                  >
                    <option value="percentage">Percentage on Metal (%)</option>
                    <option value="per_gram">Per Gram Rate (₹/g)</option>
                    <option value="fixed">Flat Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <Label>Making Charge Value</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newMakingValue}
                    onChange={e => setNewMakingValue(Number(e.target.value) || 0)}
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div>
                  <Label>Hallmark HUID (6-digit)</Label>
                  <Input
                    placeholder="e.g. HA9421"
                    maxLength={6}
                    value={newHuid}
                    onChange={e => setNewHuid(e.target.value.toUpperCase())}
                    className="text-xs h-9 font-mono uppercase text-[#C9A96E] font-bold"
                  />
                </div>
              </div>
            )}

            {/* Row 5: Guaranteed Unique Barcode Generation Block */}
            <div className="p-3.5 rounded-lg bg-white border border-[#2D2A26]/30 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-xs text-[#2D2A26] block">
                    Auto-Generated Code 128 Barcode
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    ✓ Verified 100% unique against entire store database
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewBarcode(generateUniqueBarcode(items.map(i => i.barcode)))}
                  className="text-xs text-[#C9A96E] hover:underline flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Regenerate Unique</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <Input
                  value={newBarcode}
                  readOnly
                  className="font-mono font-bold text-sm text-[#2D2A26] bg-[#FAF7F2] h-9 w-48"
                />
                <div className="flex-1 flex justify-center py-1 bg-[#FAF7F2] rounded border border-[#E5DDD0] overflow-hidden">
                  <svg ref={modalBarcodeSvgRef} className="max-w-full" />
                </div>
              </div>
            </div>

            {/* Calculated Pricing Summary Strip */}
            <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] flex flex-wrap items-center justify-between text-xs">
              {newMetal === '1 Gram Gold' || newMetal === 'Imitation' ? (
                <>
                  <div>
                    <span className="text-[#8A8278]">Article Type: </span>
                    <strong className="text-[#2D2A26]">1gm Micro-Plated Article</strong>
                  </div>
                  <div>
                    <span className="text-[#8A8278]">GST Classification: </span>
                    <strong className="font-mono text-[#2D2A26]">HSN 7117 (3% GST)</strong>
                  </div>
                  <div>
                    <span className="text-[#8A8278]">Taxable Value: </span>
                    <strong className="font-mono text-[#2D2A26]">
                      {formatCurrency(Math.round((newSellingPrice / 1.03) * 100) / 100)}
                    </strong>
                  </div>
                  <div className="pt-1 sm:pt-0">
                    <span className="text-[#8A8278]">Published Tag Price: </span>
                    <strong className="font-serif font-bold text-sm text-[#C9A96E]">
                      {formatCurrency(newSellingPrice)}
                    </strong>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-[#8A8278]">Rate applied: </span>
                    <strong className="font-mono text-[#2D2A26]">{formatCurrency(calculatedPricing.metalRate)}/g</strong>
                  </div>
                  <div>
                    <span className="text-[#8A8278]">Metal Value: </span>
                    <strong className="font-mono text-[#2D2A26]">{formatCurrency(calculatedPricing.metalValue)}</strong>
                  </div>
                  <div>
                    <span className="text-[#8A8278]">Making: </span>
                    <strong className="font-mono text-[#2D2A26]">{formatCurrency(calculatedPricing.makingCharges)}</strong>
                  </div>
                  <div className="pt-1 sm:pt-0">
                    <span className="text-[#8A8278]">Published Tag Price: </span>
                    <strong className="font-serif font-bold text-sm text-[#C9A96E]">
                      {formatCurrency(calculatedPricing.total)}
                    </strong>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2 bg-[#2D6A4F] hover:bg-[#22543d] text-white shadow-xs">
                <Check className="h-4 w-4" />
                <span>Save Product & Preview Barcode Tag</span>
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>

      {/* PRINT CSS STYLING */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          #printable-single-tag,
          #printable-single-tag *,
          #printable-bulk-grid,
          #printable-bulk-grid * {
            visibility: visible;
          }
          #printable-single-tag {
            position: absolute;
            left: 0;
            top: 0;
            width: 50mm !important;
            height: 25mm !important;
            border: 1px solid #000;
            page-break-after: always;
            box-shadow: none !important;
          }
          #printable-bulk-grid {
            position: absolute;
            left: 0;
            top: 0;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 2mm !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .print-label-item {
            width: 48mm !important;
            height: 24mm !important;
            page-break-inside: avoid;
            box-shadow: none !important;
            border: 1px solid #000 !important;
          }
        }
      `}</style>
    </div>
  );
}
