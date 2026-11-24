import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  Clock,
  Printer,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { formatCurrency, formatDate, generateId } from '@/lib/utils';
import {
  getRepairOrders,
  addRepairOrder,
  updateRepairOrder,
  getCustomers,
  getStoreInfo,
} from '@/services/data-service';
import { useAppStore } from '@/stores';
import type { RepairOrder, RepairStatus } from '@/types';

export default function RepairOrders() {
  const { currentUser } = useAppStore();
  const store = getStoreInfo();
  const customers = getCustomers();
  const [repairs, setRepairs] = useState<RepairOrder[]>(() => getRepairOrders());

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showNewModal, setShowNewModal] = useState(false);
  const [printOrder, setPrintOrder] = useState<RepairOrder | null>(null);

  // New repair form state
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [repairCategory, setRepairCategory] = useState('Chain Clasp / Solder');
  const [estimatedCharge, setEstimatedCharge] = useState<number>(1000);
  const [advancePayment, setAdvancePayment] = useState<number>(300);
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  const filteredRepairs = repairs.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.repairNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerMobile.includes(q) ||
        r.itemDescription.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateRepair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerMobile.trim() || !itemDescription.trim()) return;

    const repNum = `REP-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: RepairOrder = {
      id: generateId('rep'),
      repairNumber: repNum,
      customerName,
      customerMobile,
      itemDescription,
      repairCategory,
      receivedDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: deliveryDate,
      estimatedCharge,
      advancePayment,
      remainingBalance: Math.max(0, estimatedCharge - advancePayment),
      status: 'Received',
      staffNotes: notes || undefined,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
    };

    addRepairOrder(newOrder);
    setRepairs(getRepairOrders());
    setShowNewModal(false);
    // Reset form
    setCustomerName('');
    setCustomerMobile('');
    setItemDescription('');
    setNotes('');
  };

  const handleUpdateStatus = (order: RepairOrder, newStatus: RepairStatus) => {
    const updated = {
      ...order,
      status: newStatus,
      deliveredDate: newStatus === 'Delivered' ? new Date().toISOString().split('T')[0] : order.deliveredDate,
    };
    updateRepairOrder(updated);
    setRepairs(getRepairOrders());
  };

  const getStatusBadge = (status: RepairStatus) => {
    switch (status) {
      case 'Received':
        return <Badge variant="secondary">Received</Badge>;
      case 'Under Inspection':
        return <Badge variant="warning">Under Inspection</Badge>;
      case 'In Progress':
        return <Badge variant="gold">In Progress</Badge>;
      case 'Ready for Collection':
        return <Badge variant="success">Ready for Collection</Badge>;
      case 'Delivered':
        return <Badge variant="outline">Delivered</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#E5DDD0]">
        <div>
          <h2 className="font-serif text-lg font-bold text-[#2D2A26] flex items-center gap-2">
            <Wrench className="h-5 w-5 text-[#C9A96E]" />
            <span>Jewellery Repair Orders & Service Job Cards</span>
          </h2>
          <p className="text-xs text-[#8A8278]">
            Track custom artisan repairs, polishing, sizing and stone setting orders
          </p>
        </div>

        <Button size="sm" onClick={() => setShowNewModal(true)} className="gap-1.5 shadow-xs">
          <Plus className="h-3.5 w-3.5" /> Book New Repair Order
        </Button>
      </div>

      {/* Control Ribbon */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8A8278]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by job #, customer, phone or jewellery item..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-md focus:outline-none focus:border-[#C9A96E] text-[#2D2A26]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-9 px-3 text-xs border border-[#E5DDD0] rounded-md bg-white text-[#2D2A26]"
              >
                <option value="All">All Statuses</option>
                <option value="Received">Received</option>
                <option value="In Progress">In Progress</option>
                <option value="Ready for Collection">Ready for Collection</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Repair Orders Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-[#E5DDD0]">
          <CardTitle className="text-base">Active Service Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#FAF7F2] text-[#8A8278] border-b border-[#E5DDD0]">
                <tr>
                  <th className="p-3 text-left font-semibold">Job Card #</th>
                  <th className="p-3 text-left font-semibold">Customer</th>
                  <th className="p-3 text-left font-semibold">Item & Service</th>
                  <th className="p-3 text-left font-semibold">Delivery Date</th>
                  <th className="p-3 text-right font-semibold">Est. Charge</th>
                  <th className="p-3 text-right font-semibold">Advance</th>
                  <th className="p-3 text-right font-semibold">Balance Due</th>
                  <th className="p-3 text-center font-semibold">Status</th>
                  <th className="p-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F0E8]">
                {filteredRepairs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs text-[#8A8278]">
                      No repair service orders found
                    </td>
                  </tr>
                ) : (
                  filteredRepairs.map(rep => (
                    <tr key={rep.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="p-3 font-mono font-bold text-[#2D2A26]">{rep.repairNumber}</td>
                      <td className="p-3">
                        <p className="font-semibold text-[#2D2A26]">{rep.customerName}</p>
                        <p className="text-[10px] text-[#8A8278]">{rep.customerMobile}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-[#2D2A26]">{rep.itemDescription}</p>
                        <p className="text-[10px] text-[#8A8278]">{rep.repairCategory}</p>
                      </td>
                      <td className="p-3 text-[#8A8278] font-mono">{formatDate(rep.expectedDeliveryDate)}</td>
                      <td className="p-3 text-right font-serif font-bold text-[#2D2A26]">
                        {formatCurrency(rep.estimatedCharge)}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-800">
                        {formatCurrency(rep.advancePayment)}
                      </td>
                      <td className="p-3 text-right font-serif font-bold text-[#C53030]">
                        {formatCurrency(rep.remainingBalance)}
                      </td>
                      <td className="p-3 text-center">
                        {getStatusBadge(rep.status)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick status dropdown */}
                          <select
                            value={rep.status}
                            onChange={e => handleUpdateStatus(rep, e.target.value as RepairStatus)}
                            className="h-6 text-[10px] border border-[#E5DDD0] rounded bg-white px-1"
                          >
                            <option value="Received">Received</option>
                            <option value="Under Inspection">Under Inspection</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Ready for Collection">Ready for Collection</option>
                            <option value="Delivered">Delivered</option>
                          </select>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPrintOrder(rep);
                              setTimeout(() => window.print(), 100);
                            }}
                            className="h-6 px-1.5 text-xs text-[#8A8278] hover:text-[#2D2A26]"
                            title="Print Job Card"
                          >
                            <Printer className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Book New Repair Order Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <form onSubmit={handleCreateRepair}>
          <DialogHeader onClose={() => setShowNewModal(false)}>
            <DialogTitle>Book Jewellery Repair Job Card</DialogTitle>
            <DialogDescription>Capture customer piece details, estimated charges and promised delivery</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Customer Name</Label>
                <Input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Customer Name"
                  required
                />
              </div>
              <div>
                <Label required>Mobile Number</Label>
                <Input
                  value={customerMobile}
                  onChange={e => setCustomerMobile(e.target.value)}
                  placeholder="10-digit mobile"
                  required
                />
              </div>
            </div>

            <div>
              <Label required>Jewellery Piece Description</Label>
              <Input
                value={itemDescription}
                onChange={e => setItemDescription(e.target.value)}
                placeholder="e.g. 22K Gold Rope Chain - Broken Clasp & Hook"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Service Category</Label>
                <Select
                  value={repairCategory}
                  onChange={e => setRepairCategory(e.target.value)}
                  options={[
                    { value: 'Chain Clasp / Solder', label: 'Chain Clasp / Solder' },
                    { value: 'Ring Resizing', label: 'Ring Resizing' },
                    { value: 'Stone Setting / Replacement', label: 'Stone Setting / Replacement' },
                    { value: 'Polish & Rhodium Plating', label: 'Polish & Rhodium Plating' },
                    { value: 'Custom Redesign', label: 'Custom Redesign' },
                  ]}
                />
              </div>
              <div>
                <Label>Promised Delivery Date</Label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estimated Charge (₹)</Label>
                <Input
                  type="number"
                  value={estimatedCharge}
                  onChange={e => setEstimatedCharge(Number(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label>Advance Payment Received (₹)</Label>
                <Input
                  type="number"
                  value={advancePayment}
                  onChange={e => setAdvancePayment(Number(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>
            </div>

            <div>
              <Label>Artisan Staff Instructions</Label>
              <Input
                placeholder="Special instructions for goldsmith..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowNewModal(false)}>Cancel</Button>
            <Button type="submit">Create Job Card</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Print Job Card Receipt (Print-Only) */}
      {printOrder && (
        <div className="print-only">
          <div className="border border-black p-4 max-w-md mx-auto text-black text-xs font-sans">
            <h2 className="font-bold text-center text-sm uppercase">{store.name}</h2>
            <p className="text-center text-[10px]">{store.address}, {store.city} • {store.phone}</p>
            <p className="text-center font-bold text-xs uppercase my-2 border-y border-black py-0.5">
              Repair Service Job Card
            </p>
            <div className="flex justify-between font-mono text-[11px] mb-2">
              <span>Card: {printOrder.repairNumber}</span>
              <span>Date: {formatDate(printOrder.receivedDate)}</span>
            </div>
            <p><strong>Customer:</strong> {printOrder.customerName} ({printOrder.customerMobile})</p>
            <p className="mt-1"><strong>Item:</strong> {printOrder.itemDescription}</p>
            <p><strong>Service:</strong> {printOrder.repairCategory}</p>
            <p className="mt-2 font-mono"><strong>Expected Delivery:</strong> {formatDate(printOrder.expectedDeliveryDate)}</p>
            <div className="border-t border-black mt-2 pt-2 flex justify-between font-mono">
              <span>Est. Charge: {formatCurrency(printOrder.estimatedCharge)}</span>
              <span>Advance: {formatCurrency(printOrder.advancePayment)}</span>
              <span>Due: {formatCurrency(printOrder.remainingBalance)}</span>
            </div>
            <p className="text-[9px] mt-4 text-center">Please bring this job card receipt during collection.</p>
          </div>
        </div>
      )}
    </div>
  );
}
