import React, { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { addCustomer } from '@/services/data-service';
import { generateId } from '@/lib/utils';
import type { Customer, CustomerCategory } from '@/types';

export interface QuickCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (customer: Customer) => void;
}

export function QuickCustomerModal({ open, onOpenChange, onCustomerCreated }: QuickCustomerModalProps) {
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Chennai');
  const [gstin, setGstin] = useState('');
  const [category, setCategory] = useState<CustomerCategory>('Regular');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 10) {
      setError('Valid 10-digit mobile number is required');
      return;
    }

    const newCustomer: Customer = {
      id: generateId('cust'),
      fullName: fullName.trim(),
      mobile: mobile.trim(),
      email: email.trim() || undefined,
      city: city.trim(),
      state: 'Tamil Nadu',
      gstin: gstin.trim() || undefined,
      category,
      registrationDate: new Date().toISOString().split('T')[0],
      loyaltyPoints: 0,
      totalSpent: 0,
      totalPurchases: 0,
      outstandingBalance: 0,
      storeCredit: 0,
      isActive: true,
    };

    addCustomer(newCustomer);
    onCustomerCreated(newCustomer);
    onOpenChange(false);
    // Reset form
    setFullName('');
    setMobile('');
    setEmail('');
    setGstin('');
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <DialogHeader onClose={() => onOpenChange(false)}>
          <DialogTitle>Quick Customer Registration</DialogTitle>
          <DialogDescription>Add a new customer profile without leaving the POS counter</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {error && (
            <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label required>Full Name</Label>
              <Input
                placeholder="e.g. Smt. K. Meenakshi"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label required>Mobile Number</Label>
              <Input
                placeholder="10-digit mobile"
                maxLength={10}
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                placeholder="customer@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                placeholder="City"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Customer Category</Label>
              <Select
                value={category}
                onChange={e => setCategory(e.target.value as CustomerCategory)}
                options={[
                  { value: 'Regular', label: 'Regular Customer' },
                  { value: 'Premium', label: 'Premium VIP Customer' },
                  { value: 'Wholesale', label: 'Wholesale / Merchant' },
                ]}
              />
            </div>
            <div>
              <Label>GSTIN (Optional B2B)</Label>
              <Input
                placeholder="GST Identification Number"
                value={gstin}
                onChange={e => setGstin(e.target.value.toUpperCase())}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            Save & Select Customer
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
