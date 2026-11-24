import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Barcode as BarcodeIcon,
  ShoppingCart,
  Trash2,
  UserPlus,
  Plus,
  Minus,
  Sparkles,
  Award,
  PauseCircle,
  PlayCircle,
  Keyboard,
  CheckCircle2,
  X,
  AlertCircle,
  Percent,
  Edit3,
  RotateCcw,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { QuickCustomerModal } from '@/components/pos/QuickCustomerModal';
import { CheckoutModal } from '@/components/pos/CheckoutModal';
import { formatCurrency, formatWeight } from '@/lib/utils';
import { usePOSStore } from '@/stores';
import {
  getJewelleryItems,
  getCustomers,
  getJewelleryItemByBarcode,
  getParkedBills,
} from '@/services/data-service';
import type { JewelleryItem, Customer, JewelleryCategory, MetalType, ParkedBill, CartItem } from '@/types';

export default function POSBilling() {
  const {
    items,
    selectedCustomer,
    billTotals,
    overallDiscount,
    loyaltyPointsToRedeem,
    addItem,
    removeItem,
    updateItemQuantity,
    updateItemDiscount,
    updateItemPrice,
    resetItemPrice,
    setOverallDiscount,
    setSelectedCustomer,
    setLoyaltyPointsToRedeem,
    clearCart,
    parkBill,
    resumeBill,
  } = usePOSStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedMetal, setSelectedMetal] = useState<string>('All');
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showParkedBillsModal, setShowParkedBillsModal] = useState(false);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Line item price override modal state
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [overridePriceInput, setOverridePriceInput] = useState<string>('');
  const [priceEditError, setPriceEditError] = useState<string>('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allItems = getJewelleryItems();
  const allCustomers = getCustomers();
  const parkedBills = getParkedBills();

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setShowQuickCustomerModal(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (items.length > 0) setShowCheckoutModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length]);

  // Barcode Scan Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const matchedItem = getJewelleryItemByBarcode(code);
    if (!matchedItem) {
      setScanMessage({ text: `Barcode "${code}" not found in catalogue`, type: 'error' });
      setBarcodeInput('');
      return;
    }

    if (matchedItem.stockStatus === 'Sold') {
      setScanMessage({ text: `Item ${matchedItem.name} (${code}) is already SOLD!`, type: 'error' });
      setBarcodeInput('');
      return;
    }

    const added = addItem(matchedItem);
    if (added) {
      setScanMessage({ text: `Added ${matchedItem.name} to cart`, type: 'success' });
    } else {
      setScanMessage({ text: `Item already in active bill`, type: 'error' });
    }
    setBarcodeInput('');
    setTimeout(() => setScanMessage(null), 3000);
  };

  // Filter catalogue items
  const filteredProducts = allItems.filter(item => {
    if (item.stockStatus === 'Sold') return false;
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (selectedMetal !== 'All') {
      const finishQ = selectedMetal.toLowerCase();
      const matchMetal = item.metalType.toLowerCase().includes(finishQ);
      const matchPurity = item.purity.toLowerCase().includes(finishQ);
      const matchName = item.name.toLowerCase().includes(finishQ);
      const matchDesc = item.description?.toLowerCase().includes(finishQ) || false;
      const matchCategory = item.category.toLowerCase().includes(finishQ);
      if (!matchMetal && !matchPurity && !matchName && !matchDesc && !matchCategory) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCode = item.itemCode.toLowerCase().includes(q);
      const matchBarcode = item.barcode.includes(q);
      const matchSKU = item.sku.toLowerCase().includes(q);
      const matchHUID = item.huid?.toLowerCase().includes(q) || false;
      return matchName || matchCode || matchBarcode || matchSKU || matchHUID;
    }
    return true;
  });

  const handleSavePriceOverride = () => {
    if (!editingCartItem) return;
    const val = Number(overridePriceInput);
    if (isNaN(val) || val <= 0) {
      setPriceEditError('Please enter a valid price greater than ₹0');
      return;
    }
    updateItemPrice(editingCartItem.id, val);
    setEditingCartItem(null);
  };

  const categories: JewelleryCategory[] = [
    'Gold Rings',
    'Gold Necklaces',
    'Gold Chains',
    'Bangles',
    'Earrings',
    '1 Gram Gold Jewellery',
    'Imitation Jewellery',
    'Coins',
    'Diamond Jewellery',
    'Silver Jewellery',
    'Platinum Jewellery',
  ];

  return (
    <div className="space-y-4">
      {/* POS Header Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-[#E5DDD0] shadow-2xs">
        {/* Left: Barcode Scanner Input */}
        <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <BarcodeIcon className="absolute left-3 top-2.5 h-4 w-4 text-[#C9A96E]" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder="Scan Barcode (F3) or enter Code 128..."
              className="w-full h-9 pl-9 pr-3 text-xs font-mono bg-[#FAF7F2] border border-[#E5DDD0] rounded-md focus:outline-none focus:border-[#C9A96E] focus:bg-white text-[#2D2A26] placeholder:text-[#8A8278]"
              autoFocus
            />
          </div>
          <Button type="submit" size="sm" variant="default" className="text-xs">
            Add
          </Button>
        </form>

        {/* Scan Feedback Message */}
        {scanMessage && (
          <div
            className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 animate-in fade-in ${
              scanMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {scanMessage.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            <span>{scanMessage.text}</span>
          </div>
        )}

        {/* Action Controls: Shortcuts, Parked Bills, Clear */}
        <div className="flex items-center gap-2">
          {parkedBills.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowParkedBillsModal(true)}
              className="text-xs gap-1 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
            >
              <PlayCircle className="h-3.5 w-3.5 text-amber-600" />
              <span>Resume ({parkedBills.length})</span>
            </Button>
          )}

          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const parked = parkBill();
                if (parked) alert('Bill parked successfully.');
              }}
              className="text-xs gap-1"
              title="Park current unfinished bill"
            >
              <PauseCircle className="h-3.5 w-3.5 text-[#C9A96E]" />
              <span className="hidden sm:inline">Park Bill</span>
            </Button>
          )}

          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearCartConfirm(true)}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Clear all cart items"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowShortcutsModal(true)}
            className="text-xs text-[#8A8278] hover:text-[#2D2A26] gap-1"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Shortcuts</span>
          </Button>
        </div>
      </div>

      {/* 3-COLUMN BILLING LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Product Catalogue Picker (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="h-[calc(100vh-190px)] flex flex-col">
            <CardHeader className="p-3 pb-2 border-b border-[#E5DDD0]">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8A8278]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search name, SKU, code (F2)..."
                  className="w-full h-8 pl-8 pr-2 text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-md focus:outline-none focus:border-[#C9A96E] text-[#2D2A26]"
                />
              </div>

              {/* Collection Finish Filter Pills */}
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                {['All', '1 Gram Gold', 'Temple Matte', 'Antique Gold', 'CZ & Stones', 'Daily Wear'].map(finish => (
                  <button
                    key={finish}
                    onClick={() => setSelectedMetal(finish)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                      selectedMetal === finish
                        ? 'bg-[#C9A96E] text-white'
                        : 'bg-[#FAF7F2] text-[#8A8278] hover:text-[#2D2A26]'
                    }`}
                  >
                    {finish}
                  </button>
                ))}
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-1 overflow-x-auto pt-1 scrollbar-thin">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
                    selectedCategory === 'All' ? 'bg-[#2D2A26] text-white' : 'text-[#8A8278] hover:text-[#2D2A26]'
                  }`}
                >
                  All Categories
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
                      selectedCategory === cat ? 'bg-[#2D2A26] text-white' : 'text-[#8A8278] hover:text-[#2D2A26]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </CardHeader>

            {/* Product List */}
            <CardContent className="p-2 flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8A8278]">
                  No available items found matching filters
                </div>
              ) : (
                filteredProducts.map(item => (
                  <div
                    key={item.id}
                    onClick={() => addItem(item)}
                    className="p-2 rounded-lg border border-[#E5DDD0] bg-white hover:border-[#C9A96E] hover:bg-[#FAF7F2]/60 cursor-pointer transition-all flex items-center justify-between gap-2 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-[#2D2A26] truncate">{item.name}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                          {item.purity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#8A8278] mt-0.5">
                        <span className="font-mono">{item.itemCode}</span>
                        <span>•</span>
                        <span>Stock: {item.stockQuantity} pcs</span>
                        <span>•</span>
                        <span className="font-mono">HSN: {item.hsnCode || '7117'}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-serif font-bold text-xs text-[#2D2A26]">
                        {formatCurrency(item.sellingPrice)}
                      </p>
                      <span className="text-[10px] text-emerald-700 font-medium group-hover:underline">
                        + Add to Bill
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* CENTER COLUMN: Current Cart Table (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="h-[calc(100vh-190px)] flex flex-col">
            <CardHeader className="p-3 pb-2 border-b border-[#E5DDD0] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Active Bill Items</CardTitle>
                <p className="text-[11px] text-[#8A8278]">{items.length} unique line(s) added</p>
              </div>
              <Badge variant="gold" className="text-xs font-mono">
                {items.reduce((s, i) => s + i.quantity, 0)} Pcs
              </Badge>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-y-auto scrollbar-thin">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-[#8A8278]">
                  <ShoppingCart className="h-10 w-10 text-[#C9A96E]/40 mb-2 stroke-1" />
                  <p className="text-xs font-semibold text-[#2D2A26]">Current cart is empty</p>
                  <p className="text-[11px] text-[#8A8278] max-w-xs mt-1">
                    Scan a barcode (F3) or click any jewellery item from the left panel to begin billing.
                  </p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-[#FAF7F2] text-[#8A8278] sticky top-0 border-b border-[#E5DDD0]">
                    <tr>
                      <th className="p-2 text-left font-semibold">Item & Specs</th>
                      <th className="p-2 text-center font-semibold">Qty</th>
                      <th className="p-2 text-right font-semibold">Unit Price / HSN</th>
                      <th className="p-2 text-right font-semibold">Total Price</th>
                      <th className="p-2 text-center font-semibold w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F0E8]">
                    {items.map(cartItem => (
                      <tr key={cartItem.id} className="hover:bg-[#FAF7F2]/40">
                        {/* Item Info */}
                        <td className="p-2.5">
                          <p className="font-semibold text-[#2D2A26]">{cartItem.item.name}</p>
                          <div className="flex flex-wrap gap-1 text-[10px] text-[#8A8278] mt-0.5">
                            <span className="font-mono">{cartItem.item.itemCode}</span>
                            <span>•</span>
                            <span className="text-[#C9A96E] font-medium">{cartItem.item.purity || '1gm Micro Plated'}</span>
                            <span>•</span>
                            <span className="font-mono">HSN: {cartItem.item.hsnCode || '7117'}</span>
                          </div>
                        </td>

                        {/* Quantity / Adjust */}
                        <td className="p-2.5 text-center">
                          {cartItem.item.isQuantityBased ? (
                            <div className="inline-flex items-center gap-1 border border-[#E5DDD0] rounded bg-white p-0.5">
                              <button
                                onClick={() => updateItemQuantity(cartItem.id, Math.max(1, cartItem.quantity - 1))}
                                className="h-5 w-5 flex items-center justify-center hover:bg-[#FAF7F2] text-[#8A8278]"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-mono text-xs w-5 text-center font-semibold">{cartItem.quantity}</span>
                              <button
                                onClick={() => updateItemQuantity(cartItem.id, cartItem.quantity + 1)}
                                className="h-5 w-5 flex items-center justify-center hover:bg-[#FAF7F2] text-[#8A8278]"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono font-medium text-[#8A8278]">1</span>
                          )}
                        </td>

                        {/* Retail Unit Rate & HSN */}
                        <td className="p-2.5 text-right font-mono text-[11px] text-[#8A8278]">
                          <p className="font-semibold text-[#2D2A26]">{formatCurrency(cartItem.unitPrice)}</p>
                          <p className="text-[10px] text-[#8A8278]">HSN: {cartItem.item.hsnCode || '7117'}</p>
                        </td>

                        {/* Total Price */}
                        <td className="p-2.5 text-right">
                          <div className="flex items-start justify-end gap-1.5">
                            <div>
                              <p className="font-serif font-bold text-[#2D2A26]">
                                {formatCurrency(cartItem.totalPrice)}
                              </p>
                              {cartItem.quantity > 1 && (
                                <span className="text-[10px] text-[#8A8278] block">
                                  @{formatCurrency(cartItem.unitPrice)}/pc
                                </span>
                              )}
                              {cartItem.isPriceOverridden && (
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                  <Badge variant="warning" className="text-[9px] px-1 py-0 h-3.5">
                                    Custom Price
                                  </Badge>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      resetItemPrice(cartItem.id);
                                    }}
                                    className="text-[9px] text-[#8A8278] hover:text-[#2D2A26] underline flex items-center gap-0.5"
                                    title="Reset to default rate"
                                  >
                                    <RotateCcw className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              )}
                              {cartItem.itemDiscount > 0 && (
                                <span className="text-[10px] text-emerald-700 block">
                                  Disc: -{formatCurrency(cartItem.itemDiscount)}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCartItem(cartItem);
                                setOverridePriceInput(String(Math.round(cartItem.unitPrice)));
                                setPriceEditError('');
                              }}
                              className="p-1 rounded text-[#8A8278] hover:text-[#C9A96E] hover:bg-[#FAF7F2] transition-colors border border-transparent hover:border-[#E5DDD0]"
                              title="Edit item price at billing"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>

                        {/* Remove Action */}
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => removeItem(cartItem.id)}
                            className="text-[#8A8278] hover:text-[#C53030] p-1 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Customer & Billing Summary (3 Cols) */}
        <div className="lg:col-span-3 space-y-3">
          {/* Customer Selection Card */}
          <Card>
            <CardHeader className="p-3 pb-2 border-b border-[#E5DDD0] flex flex-row items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8278]">
                Customer Info (F4)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickCustomerModal(true)}
                className="h-6 px-1.5 text-xs text-[#C9A96E] hover:text-[#B89555] gap-1"
              >
                <UserPlus className="h-3 w-3" /> + New
              </Button>
            </CardHeader>

            <CardContent className="p-3 space-y-2">
              <select
                value={selectedCustomer?.id || ''}
                onChange={e => {
                  const cust = allCustomers.find(c => c.id === e.target.value);
                  setSelectedCustomer(cust || null);
                }}
                className="w-full h-8 text-xs border border-[#E5DDD0] rounded-md px-2 bg-white text-[#2D2A26]"
              >
                <option value="">Walk-in Customer (Unregistered)</option>
                {allCustomers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.mobile}) - {c.category}
                  </option>
                ))}
              </select>

              {/* Selected Customer Details */}
              {selectedCustomer && (
                <div className="p-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-[#2D2A26]">
                    <span>{selectedCustomer.fullName}</span>
                    <Badge variant="secondary" className="text-[10px]">{selectedCustomer.category}</Badge>
                  </div>
                  <p className="text-[11px] text-[#8A8278]">{selectedCustomer.mobile} • {selectedCustomer.city}</p>

                  {/* Loyalty Points summary */}
                  <div className="pt-2 border-t border-[#E5DDD0] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[#2D2A26] font-medium text-[11px]">
                        <Award className="h-3.5 w-3.5 text-[#C9A96E]" />
                        <span>Available Points:</span>
                      </span>
                      <Badge variant="gold" className="font-mono text-xs font-bold">
                        {selectedCustomer.loyaltyPoints} Pts
                      </Badge>
                    </div>

                    {/* Points to earn on current bill */}
                    <div className="flex items-center justify-between text-[11px] text-[#8A8278]">
                      <span>Points on This Bill (1 pt / ₹100):</span>
                      <span className="font-mono font-semibold text-emerald-700">
                        +{Math.floor(billTotals.grandTotal / 100)} Pts
                      </span>
                    </div>

                    {/* Point Redemption Control */}
                    {selectedCustomer.loyaltyPoints > 0 && (
                      <div className="p-2 rounded bg-amber-50/70 border border-amber-200 space-y-1.5 mt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-amber-900">
                            Redeem Points (100 Pts = ₹10):
                          </span>
                          <span className="text-[10px] text-amber-700">
                            Max: {selectedCustomer.loyaltyPoints} pts
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={selectedCustomer.loyaltyPoints}
                            step={10}
                            value={loyaltyPointsToRedeem || ''}
                            onChange={e => {
                              const val = Math.min(
                                selectedCustomer.loyaltyPoints,
                                Math.max(0, Number(e.target.value) || 0)
                              );
                              setLoyaltyPointsToRedeem(val);
                            }}
                            placeholder="Points"
                            className="h-7 w-24 px-2 text-xs font-mono font-bold bg-white border border-amber-300 rounded text-[#2D2A26] focus:outline-none focus:border-[#C9A96E]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const maxPossiblePoints = Math.min(
                                selectedCustomer.loyaltyPoints,
                                Math.floor(billTotals.grandTotal * 10)
                              );
                              setLoyaltyPointsToRedeem(maxPossiblePoints);
                            }}
                            className="px-2 py-1 text-[10px] font-semibold bg-white border border-amber-300 text-amber-900 rounded hover:bg-amber-100"
                          >
                            Max
                          </button>
                          {loyaltyPointsToRedeem > 0 && (
                            <button
                              type="button"
                              onClick={() => setLoyaltyPointsToRedeem(0)}
                              className="text-[10px] text-red-600 hover:underline"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        {loyaltyPointsToRedeem > 0 && (
                          <p className="text-[11px] text-emerald-800 font-bold flex items-center justify-between pt-0.5 border-t border-amber-200">
                            <span>Redemption Discount:</span>
                            <span>-₹{(loyaltyPointsToRedeem * 0.1).toFixed(2)}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Calculation Summary Card */}
          <Card>
            <CardHeader className="p-3 pb-2 border-b border-[#E5DDD0]">
              <CardTitle className="text-sm">Bill Calculation</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 text-xs">
              <div className="flex justify-between text-[#8A8278]">
                <span>Items Subtotal:</span>
                <span className="font-mono text-[#2D2A26]">{formatCurrency(billTotals.subtotal)}</span>
              </div>

              {/* Overall Discount Input */}
              <div className="flex items-center justify-between">
                <span className="text-[#8A8278]">Bill Discount (₹):</span>
                <input
                  type="number"
                  min={0}
                  value={overallDiscount || ''}
                  onChange={e => setOverallDiscount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="h-6 w-24 text-right px-1.5 text-xs font-mono border border-[#E5DDD0] rounded bg-white text-[#2D2A26]"
                />
              </div>

              <div className="flex justify-between text-[#8A8278]">
                <span>Taxable Amount:</span>
                <span className="font-mono font-medium text-[#2D2A26]">{formatCurrency(billTotals.taxableAmount)}</span>
              </div>

              {/* Tax Breakdowns */}
              <div className="py-1.5 border-y border-[#F5F0E8] space-y-1 text-[11px] text-[#8A8278]">
                <div className="flex justify-between">
                  <span>CGST (1.5%):</span>
                  <span className="font-mono">{formatCurrency(billTotals.cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (1.5%):</span>
                  <span className="font-mono">{formatCurrency(billTotals.sgst)}</span>
                </div>
              </div>

              {/* Loyalty Redemption Discount */}
              {loyaltyPointsToRedeem > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium text-[11px]">
                  <span>Loyalty Discount ({loyaltyPointsToRedeem} pts):</span>
                  <span className="font-mono font-bold">-₹{(loyaltyPointsToRedeem * 0.1).toFixed(2)}</span>
                </div>
              )}

              {/* Grand Total */}
              <div className="pt-1 flex justify-between items-center text-sm font-semibold">
                <span className="text-[#2D2A26]">Grand Total:</span>
                <span className="font-serif text-lg font-bold text-[#C9A96E]">
                  {formatCurrency(billTotals.amountPayable)}
                </span>
              </div>

              {/* Payment Checkout Button */}
              <Button
                disabled={items.length === 0}
                onClick={() => setShowCheckoutModal(true)}
                className="w-full mt-3 h-11 text-sm font-semibold gap-2 shadow-sm"
              >
                <span>Proceed to Pay (F8)</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Customer Modal */}
      <QuickCustomerModal
        open={showQuickCustomerModal}
        onOpenChange={setShowQuickCustomerModal}
        onCustomerCreated={customer => {
          setSelectedCustomer(customer);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        open={showCheckoutModal}
        onOpenChange={setShowCheckoutModal}
      />

      {/* Clear Cart Confirmation Dialog */}
      <ConfirmDialog
        open={showClearCartConfirm}
        onOpenChange={setShowClearCartConfirm}
        title="Clear Current Bill?"
        description="Are you sure you want to discard all items currently in this bill? This action cannot be undone."
        confirmText="Clear Cart"
        variant="destructive"
        onConfirm={clearCart}
      />

      {/* Parked Bills Modal */}
      <Dialog open={showParkedBillsModal} onOpenChange={setShowParkedBillsModal}>
        <DialogHeader onClose={() => setShowParkedBillsModal(false)}>
          <DialogTitle>Resume Parked Bills</DialogTitle>
          <DialogDescription>Select an unfinished bill to restore to the active counter</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 my-3">
          {parkedBills.map(bill => (
            <div
              key={bill.id}
              className="p-3 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-xs text-[#2D2A26]">
                  {bill.customerName || 'Walk-in Customer'} • {bill.items.length} Item(s)
                </p>
                <p className="text-[10px] text-[#8A8278]">
                  Parked at: {new Date(bill.parkedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  resumeBill(bill);
                  setShowParkedBillsModal(false);
                }}
                className="text-xs"
              >
                Resume Bill
              </Button>
            </div>
          ))}
        </div>
      </Dialog>

      {/* Keyboard Shortcuts Reference Modal */}
      <Dialog open={showShortcutsModal} onOpenChange={setShowShortcutsModal}>
        <DialogHeader onClose={() => setShowShortcutsModal(false)}>
          <DialogTitle>Keyboard Shortcuts Reference</DialogTitle>
          <DialogDescription>Quick keys for high-speed cashier checkout operations</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 my-3 text-xs">
          <div className="p-2.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] flex items-center justify-between">
            <span className="text-[#3D3A36]">Focus Product Search</span>
            <kbd className="px-2 py-0.5 rounded bg-white border border-[#E5DDD0] font-mono font-bold text-[#C9A96E]">F2</kbd>
          </div>
          <div className="p-2.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] flex items-center justify-between">
            <span className="text-[#3D3A36]">Focus Barcode Scanner</span>
            <kbd className="px-2 py-0.5 rounded bg-white border border-[#E5DDD0] font-mono font-bold text-[#C9A96E]">F3</kbd>
          </div>
          <div className="p-2.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] flex items-center justify-between">
            <span className="text-[#3D3A36]">Quick Customer Add/Select</span>
            <kbd className="px-2 py-0.5 rounded bg-white border border-[#E5DDD0] font-mono font-bold text-[#C9A96E]">F4</kbd>
          </div>
          <div className="p-2.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] flex items-center justify-between">
            <span className="text-[#3D3A36]">Proceed to Payment</span>
            <kbd className="px-2 py-0.5 rounded bg-white border border-[#E5DDD0] font-mono font-bold text-[#C9A96E]">F8</kbd>
          </div>
          <div className="p-2.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] flex items-center justify-between">
            <span className="text-[#3D3A36]">Close Open Modal</span>
            <kbd className="px-2 py-0.5 rounded bg-white border border-[#E5DDD0] font-mono font-bold text-[#8A8278]">Esc</kbd>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowShortcutsModal(false)}>Close</Button>
        </DialogFooter>
      </Dialog>

      {/* Line Item Price Override Dialog */}
      {editingCartItem && (
        <Dialog open={!!editingCartItem} onOpenChange={open => !open && setEditingCartItem(null)}>
          <div className="p-5 space-y-4 max-w-md mx-auto">
            <DialogHeader onClose={() => setEditingCartItem(null)}>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Edit3 className="h-4 w-4 text-[#C9A96E]" />
                Edit Item Price at Billing
              </DialogTitle>
              <DialogDescription className="text-xs text-[#8A8278]">
                Adjust or negotiate unit price for this customer. Indian GST (3%) and taxable value will be recalculated automatically.
              </DialogDescription>
            </DialogHeader>

            {/* Item Card Summary */}
            <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E5DDD0] text-xs space-y-1.5">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-[#2D2A26]">{editingCartItem.item.name}</span>
                <Badge variant="gold" className="text-[10px]">{editingCartItem.item.metalType}</Badge>
              </div>
              <div className="flex justify-between text-[#8A8278] text-[11px]">
                <span>Code: <span className="font-mono text-[#2D2A26]">{editingCartItem.item.itemCode}</span></span>
                <span>Purity: <span className="font-medium text-[#2D2A26]">{editingCartItem.item.purity}</span></span>
                <span>
                  HSN:{' '}
                  <span className="font-mono text-[#2D2A26]">
                    {editingCartItem.item.hsnCode ||
                      (editingCartItem.item.metalType === '1 Gram Gold' ? '7117' : '7113')}
                  </span>
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#E5DDD0]/60 text-[11px]">
                <span className="text-[#8A8278]">Standard Catalog Price:</span>
                <span className="font-mono font-medium text-[#2D2A26]">
                  {formatCurrency(editingCartItem.originalUnitPrice || editingCartItem.pricing.total)}
                </span>
              </div>
            </div>

            {/* Price Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2D2A26]">
                New Unit Selling Price (₹ - Gross incl. GST)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-[#8A8278]">₹</span>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={overridePriceInput}
                  onChange={e => {
                    setOverridePriceInput(e.target.value);
                    setPriceEditError('');
                  }}
                  autoFocus
                  className="pl-8 text-base font-bold font-mono h-11 text-[#2D2A26] border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]"
                  placeholder="e.g. 2100"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSavePriceOverride();
                  }}
                />
              </div>
              {priceEditError && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> {priceEditError}
                </p>
              )}
            </div>

            {/* Quick Adjustment Shortcuts */}
            <div className="space-y-1">
              <span className="text-[10px] text-[#8A8278] uppercase font-semibold tracking-wider">
                Quick Adjustments:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '-₹100', delta: -100 },
                  { label: '-₹250', delta: -250 },
                  { label: '-₹500', delta: -500 },
                  { label: '-5%', pct: 0.95 },
                  { label: '-10%', pct: 0.9 },
                ].map((adj, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const base =
                        editingCartItem.originalUnitPrice || editingCartItem.unitPrice;
                      const newVal = adj.delta
                        ? Math.max(1, base + adj.delta)
                        : Math.round(base * (adj.pct || 1));
                      setOverridePriceInput(String(newVal));
                      setPriceEditError('');
                    }}
                    className="px-2 py-1 text-[11px] bg-white border border-[#E5DDD0] rounded hover:border-[#C9A96E] hover:bg-[#FAF7F2] text-[#2D2A26] transition-colors"
                  >
                    {adj.label}
                  </button>
                ))}
                {editingCartItem.isPriceOverridden && (
                  <button
                    type="button"
                    onClick={() => {
                      const orig = Math.round(
                        editingCartItem.originalUnitPrice || editingCartItem.pricing.total
                      );
                      setOverridePriceInput(String(orig));
                      setPriceEditError('');
                    }}
                    className="px-2 py-1 text-[11px] bg-amber-50 border border-amber-200 text-amber-800 rounded hover:bg-amber-100 flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> Revert
                  </button>
                )}
              </div>
            </div>

            {/* Realtime GST Calculation Preview */}
            {Number(overridePriceInput) > 0 && (
              <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-md text-xs space-y-1 text-emerald-900">
                <div className="flex justify-between">
                  <span>Reverse Taxable Value:</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(
                      Math.round((Number(overridePriceInput) / 1.03) * 100) / 100
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GST Composite (3%):</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(
                      Math.round(
                        (Number(overridePriceInput) - Number(overridePriceInput) / 1.03) * 100
                      ) / 100
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-bold border-t border-emerald-200 pt-1">
                  <span>
                    Line Total ({editingCartItem.quantity} pc
                    {editingCartItem.quantity > 1 ? 's' : ''}):
                  </span>
                  <span className="font-mono">
                    {formatCurrency(Number(overridePriceInput) * editingCartItem.quantity)}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="flex items-center justify-between gap-2 pt-2 border-t border-[#E5DDD0]">
              {editingCartItem.isPriceOverridden ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetItemPrice(editingCartItem.id);
                    setEditingCartItem(null);
                  }}
                  className="text-xs text-[#8A8278]"
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Revert to Default
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCartItem(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleSavePriceOverride}
                  className="text-xs gap-1 shadow-xs"
                >
                  <Check className="h-3.5 w-3.5" /> Apply Price
                </Button>
              </div>
            </DialogFooter>
          </div>
        </Dialog>
      )}
    </div>
  );
}
