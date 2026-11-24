import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';

// Page Imports
import Dashboard from '@/pages/Dashboard';
import POSBilling from '@/pages/POSBilling';
import InvoiceHistory from '@/pages/InvoiceHistory';
import InvoiceDetail from '@/pages/InvoiceDetail';
import ReturnsExchanges from '@/pages/ReturnsExchanges';
import CreditNotes from '@/pages/CreditNotes';
import Catalogue from '@/pages/Catalogue';
import AddJewelleryItem from '@/pages/AddJewelleryItem';
import ItemDetails from '@/pages/ItemDetails';
import BarcodeGenerator from '@/pages/BarcodeGenerator';
import LabelPrinting from '@/pages/LabelPrinting';
import ScanSearch from '@/pages/ScanSearch';
import CustomerManagement from '@/pages/CustomerManagement';
import CustomerProfile from '@/pages/CustomerProfile';
import LoyaltyRewards from '@/pages/LoyaltyRewards';
import CustomerLedger from '@/pages/CustomerLedger';
import PaymentRecords from '@/pages/PaymentRecords';
import DailyClosing from '@/pages/DailyClosing';
import SalesReports from '@/pages/SalesReports';
import OldGoldExchange from '@/pages/OldGoldExchange';
import RepairOrders from '@/pages/RepairOrders';
import GoldRateManagement from '@/pages/GoldRateManagement';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {/* Overview */}
        <Route index element={<Dashboard />} />

        {/* Sales & Billing */}
        <Route path="pos" element={<POSBilling />} />
        <Route path="invoices" element={<InvoiceHistory />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="returns" element={<ReturnsExchanges />} />
        <Route path="credit-notes" element={<CreditNotes />} />
        <Route path="old-gold" element={<OldGoldExchange />} />

        {/* Jewellery & Inventory */}
        <Route path="catalogue" element={<Catalogue />} />
        <Route path="catalogue/add" element={<AddJewelleryItem />} />
        <Route path="catalogue/:id" element={<ItemDetails />} />
        <Route path="barcode" element={<BarcodeGenerator />} />
        <Route path="labels" element={<LabelPrinting />} />
        <Route path="scan" element={<ScanSearch />} />
        <Route path="rates" element={<Navigate to="/catalogue" replace />} />

        {/* Customers & CRM */}
        <Route path="customers" element={<CustomerManagement />} />
        <Route path="customers/:id" element={<CustomerProfile />} />
        <Route path="loyalty" element={<LoyaltyRewards />} />
        <Route path="ledger" element={<CustomerLedger />} />

        {/* Register, Payments & Services */}
        <Route path="payments" element={<PaymentRecords />} />
        <Route path="daily-closing" element={<DailyClosing />} />
        <Route path="repairs" element={<RepairOrders />} />
        <Route path="reports" element={<SalesReports />} />

        {/* Catch-all redirect to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
