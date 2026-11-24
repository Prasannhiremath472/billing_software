import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  Barcode,
  Printer,
  Eye,
  LayoutGrid,
  List,
  Sparkles,
  ShoppingBag,
  Coins,
  Gem,
  Tag,
  Package,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { getJewelleryItems } from '@/services/data-service';
import { useAppStore, usePOSStore } from '@/stores';
import type { JewelleryItem, JewelleryCategory, StockStatus } from '@/types';

export default function Catalogue() {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  const { addItem } = usePOSStore();
  const allItems = getJewelleryItems();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'date'>('date');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Filter items
  const filteredItems = allItems.filter(item => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (selectedStatus !== 'All' && item.stockStatus !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCode = item.itemCode.toLowerCase().includes(q);
      const matchSKU = item.sku.toLowerCase().includes(q);
      const matchBarcode = item.barcode.includes(q);
      const matchVariant = item.variant?.toLowerCase().includes(q) || false;
      return matchName || matchCode || matchSKU || matchBarcode || matchVariant;
    }
    return true;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'price') return b.sellingPrice - a.sellingPrice;
    if (sortBy === 'stock') return (b.stockQuantity || 1) - (a.stockQuantity || 1);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
  });

  // Summary Metrics
  const totalPieces = allItems.length;
  const inStockPieces = allItems.filter(i => i.stockStatus === 'Available').length;
  const soldPieces = allItems.filter(i => i.stockStatus === 'Sold' || i.stockQuantity === 0).length;
  const totalStockValuation = allItems
    .filter(i => i.stockStatus === 'Available')
    .reduce((sum, i) => sum + i.sellingPrice * (i.stockQuantity || 1), 0);

  const categories: JewelleryCategory[] = [
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Inventory Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-[#E5DDD0]">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Total Catalogued Pieces
            </span>
            <p className="font-serif text-xl font-bold text-[#2D2A26] mt-1">{totalPieces}</p>
            <span className="text-[10px] text-[#8A8278]">Tracked unique SKUs & batches</span>
          </CardContent>
        </Card>

        <Card className="border-[#E5DDD0]">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              In-Stock Available
            </span>
            <p className="font-serif text-xl font-bold text-emerald-800 mt-1">{inStockPieces}</p>
            <span className="text-[10px] text-emerald-700">Ready for sale on counter</span>
          </CardContent>
        </Card>

        <Card className="border-[#E5DDD0]">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Out of Stock / Sold
            </span>
            <p className="font-serif text-xl font-bold text-[#8A8278] mt-1">{soldPieces}</p>
            <span className="text-[10px] text-[#8A8278]">Archived sales history</span>
          </CardContent>
        </Card>

        <Card className="border-[#E5DDD0]">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8278] block">
              Current Stock Valuation
            </span>
            <p className="font-serif text-xl font-bold text-[#C9A96E] mt-1">
              {formatCurrency(totalStockValuation)}
            </p>
            <span className="text-[10px] text-[#8A8278]">Inventory asset value</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Control Bar */}
      <Card className="border-[#E5DDD0]">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8A8278]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by product name, SKU, variant, barcode..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-md focus:outline-none focus:border-[#C9A96E] text-[#2D2A26]"
              />
            </div>

            {/* View Mode Toggle & Add Button */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <div className="flex rounded-md border border-[#E5DDD0] p-0.5 bg-[#FAF7F2]">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'table' ? 'bg-white text-[#2D2A26] shadow-xs' : 'text-[#8A8278]'
                  }`}
                  title="Table View"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-[#2D2A26] shadow-xs' : 'text-[#8A8278]'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>

              {currentUser.role !== 'Cashier' && (
                <Button
                  size="sm"
                  onClick={() => navigate('/catalogue/add')}
                  className="h-9 text-xs gap-1.5 shadow-xs bg-[#C9A96E] hover:bg-[#B89555] text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Product
                </Button>
              )}
            </div>
          </div>

          {/* Secondary Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F5F0E8] text-xs">
            {/* Category selector */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[#8A8278] mr-1">Category:</span>
              {['All', '1 Gram Gold Jewellery', 'Gold Necklaces', 'Bangles', 'Earrings', 'Gold Chains'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#C9A96E] text-white shadow-xs'
                      : 'bg-[#FAF7F2] text-[#8A8278] hover:text-[#2D2A26]'
                  }`}
                >
                  {cat === '1 Gram Gold Jewellery' ? '1 Gram Gold' : cat}
                </button>
              ))}
            </div>

            {/* Status & Sort */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-[#8A8278] mr-1">Status:</span>
                {['All', 'Available', 'Sold'].map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSelectedStatus(status)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      selectedStatus === status
                        ? 'bg-[#2D2A26] text-white'
                        : 'bg-[#FAF7F2] text-[#8A8278] hover:text-[#2D2A26]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[#8A8278]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="h-7 text-xs border border-[#E5DDD0] rounded bg-white px-2 text-[#2D2A26]"
                >
                  <option value="date">Date Added (Newest)</option>
                  <option value="price">Price (High to Low)</option>
                  <option value="stock">Stock Quantity</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sticky Bulk Action Banner */}
      {selectedItemIds.length > 0 && (
        <div className="sticky top-20 z-20 p-3.5 rounded-xl bg-[#2D2A26] text-white shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="h-6 px-2.5 rounded-full bg-[#C9A96E] text-[#2D2A26] font-bold text-xs flex items-center justify-center">
              {selectedItemIds.length}
            </span>
            <span className="text-xs font-medium">
              Pieces selected for barcode generation & thermal tag printing
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate(`/barcode?items=${selectedItemIds.join(',')}`)}
              className="bg-[#C9A96E] hover:bg-[#B8985D] text-white text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Barcode className="h-3.5 w-3.5" />
              <span>Generate Barcodes & Print Labels</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedItemIds([])}
              className="text-xs border-gray-600 text-gray-300 hover:text-white hover:bg-white/10"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Item Display: Table or Grid */}
      {viewMode === 'table' ? (
        <Card className="border-[#E5DDD0]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={sortedItems.length > 0 && selectedItemIds.length === sortedItems.length}
                        onChange={e => {
                          if (e.target.checked) setSelectedItemIds(sortedItems.map(i => i.id));
                          else setSelectedItemIds([]);
                        }}
                        className="rounded border-[#C9A96E] text-[#C9A96E] focus:ring-[#C9A96E] h-3.5 w-3.5 cursor-pointer"
                        title="Select All"
                      />
                    </th>
                    <th className="p-3 text-left font-semibold">Product & SKU</th>
                    <th className="p-3 text-left font-semibold">Barcode</th>
                    <th className="p-3 text-left font-semibold">Category & Variant</th>
                    <th className="p-3 text-right font-semibold">MRP</th>
                    <th className="p-3 text-right font-semibold">Selling Price</th>
                    <th className="p-3 text-center font-semibold">Stock Qty</th>
                    <th className="p-3 text-center font-semibold">HSN / GST</th>
                    <th className="p-3 text-center font-semibold">Status</th>
                    <th className="p-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F0E8]">
                  {sortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-xs text-[#8A8278]">
                        No catalogue items match your filters
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map(item => {
                      const isSelected = selectedItemIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-[#FAF7F2]/60 transition-colors ${
                            isSelected ? 'bg-[#FAF7F2]' : ''
                          }`}
                        >
                          <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                if (e.target.checked) setSelectedItemIds([...selectedItemIds, item.id]);
                                else setSelectedItemIds(selectedItemIds.filter(id => id !== item.id));
                              }}
                              className="rounded border-[#C9A96E] text-[#C9A96E] focus:ring-[#C9A96E] h-3.5 w-3.5 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-[#2D2A26]">{item.name}</p>
                            <p className="text-[10px] text-[#8A8278] font-mono">{item.sku}</p>
                          </td>
                          <td className="p-3 font-mono font-bold text-[11px] text-[#8F6F2C]">
                            {item.barcode}
                          </td>
                          <td className="p-3">
                            <p className="text-[#2D2A26] font-medium">{item.category}</p>
                            <p className="text-[10px] text-[#8A8278]">{item.variant || '1 Gram Matte'}</p>
                          </td>
                          <td className="p-3 text-right font-mono text-[#8A8278]">
                            {item.mrp ? formatCurrency(item.mrp) : formatCurrency(item.sellingPrice)}
                          </td>
                          <td className="p-3 text-right font-serif font-bold text-[#2D2A26]">
                            {formatCurrency(item.sellingPrice)}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-[#2D2A26]">
                            {item.stockQuantity ?? 1}
                          </td>
                          <td className="p-3 text-center font-mono text-[10px] text-[#8A8278]">
                            <span className="font-semibold text-[#2D2A26]">{item.hsnCode || '7117'}</span> (3%)
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={item.stockStatus === 'Available' ? 'success' : 'secondary'}
                              className="text-[10px]"
                            >
                              {item.stockStatus}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {item.stockStatus === 'Available' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    addItem(item);
                                    navigate('/pos');
                                  }}
                                  className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800"
                                  title="Add to POS Bill"
                                >
                                  <ShoppingBag className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/barcode?item=${item.id}`)}
                                className="h-7 px-2 text-xs text-[#8A8278] hover:text-[#2D2A26]"
                                title="Generate / Print Barcode Tag"
                              >
                                <Barcode className="h-3.5 w-3.5 text-[#C9A96E]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/catalogue/${item.id}`)}
                                className="h-7 px-2 text-xs text-[#8A8278] hover:text-[#2D2A26]"
                                title="View Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </div>
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
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedItems.map(item => (
            <Card key={item.id} className="border-[#E5DDD0] hover:border-[#C9A96E] transition-all flex flex-col justify-between">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="text-[10px]">
                    {item.variant || '1 Gram Gold'}
                  </Badge>
                  <Badge
                    variant={item.stockStatus === 'Available' ? 'success' : 'secondary'}
                    className="text-[10px]"
                  >
                    {item.stockStatus}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-serif font-bold text-sm text-[#2D2A26]">{item.name}</h4>
                  <p className="text-[10px] text-[#8A8278] font-mono mt-0.5">{item.sku} • {item.barcode}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#8A8278]">Category:</span>
                    <span className="font-medium text-[#2D2A26]">{item.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8278]">Stock Units:</span>
                    <span className="font-mono font-bold text-[#2D2A26]">{item.stockQuantity ?? 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8278]">HSN / Tax:</span>
                    <span className="font-mono text-[#8F6F2C]">{item.hsnCode || '7117'} (3% GST)</span>
                  </div>
                </div>

                <div className="pt-1 flex items-baseline justify-between">
                  <div>
                    {item.mrp && item.mrp > item.sellingPrice && (
                      <span className="text-[10px] line-through text-[#8A8278] block">
                        MRP: ₹{item.mrp}
                      </span>
                    )}
                    <span className="font-serif text-base font-bold text-[#2D2A26]">
                      {formatCurrency(item.sellingPrice)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/barcode?item=${item.id}`)}
                    className="h-7 px-1.5 text-xs text-[#C9A96E]"
                    title="Print Barcode Tag"
                  >
                    <Barcode className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="pt-2 border-t border-[#F5F0E8] flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/catalogue/${item.id}`)}
                    className="flex-1 text-xs border-[#E5DDD0]"
                  >
                    Details
                  </Button>
                  {item.stockStatus === 'Available' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        addItem(item);
                        navigate('/pos');
                      }}
                      className="flex-1 text-xs bg-[#C9A96E] hover:bg-[#B89555] text-white"
                    >
                      Bill Item
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
