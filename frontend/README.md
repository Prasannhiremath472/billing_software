# Shree Lakshmi Jewellers — Retail POS & Billing Management Software

> **Note:** this app now talks to the JewelSync REST API in `../backend` (MySQL) instead of using localStorage
> and mock data. See the root `README.md` for setup. Sections below that mention localStorage / Supabase describe
> the original prototype and are kept for the feature overview only.


A professional, production-grade Jewellery Retail POS and Billing Management System built with React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, and Lucide React. Engineered specifically for jewellery retail showrooms in India, accommodating precious metals calculation workflows, BIS Hallmark Unique Identification (HUID), dynamic daily benchmark rates, multi-tender split payments, Code 128 barcode generation, and thermal tag printing.

---

## 🌟 Key Highlights & Architectural Features

### 1. Jewellery Pricing Engine (`src/lib/pricing.ts`)
- **Multi-Metal & Purity Matrix**: Gold (24K, 22K, 20K, 18K, 14K), Silver (999, 925, 900), Platinum (Pt 950, Pt 850).
- **Weight Fields Breakdown**: Real-time tracking of Gross Scale Weight, Net Metal Weight, Stone/Enamel Weight, and Diamond Carats.
- **Configurable Making Charges**:
  - Percentage on pure metal value (%)
  - Per-gram charge on net weight (₹/g)
  - Fixed flat making charge (₹)
- **Wastage (Khad/Loss) Calculation**:
  - Percentage wastage (%)
  - Fixed weight loss (g)
  - Fixed amount (₹)
- **Indian GST Compliance**:
  - Configurable 3% jewellery GST rate (CGST 1.5% + SGST 1.5% for intra-state, or IGST 3% for inter-state).
  - Rounding safeguards to minimize currency fractional discrepancies.

### 2. POS Billing Terminal (`src/pages/POSBilling.tsx`)
- **High-Speed Cashier Layout**:
  - **Left Section**: Barcode scanner auto-focus (F3), metal filters, category pills, live stock availability indicators.
  - **Center Section**: Active cart line items, weight specs, making/wastage charges, line-level discount, quantity adjuster, park/resume bill, clear cart with confirmation.
  - **Right Section**: Customer selector, quick customer creation modal (F4), loyalty points balance & redemption slider, itemized taxable subtotal, CGST/SGST tax breakdown, grand total, and checkout trigger (F8).
- **Keyboard Shortcuts**:
  - `F2`: Focus product name/SKU search
  - `F3`: Focus barcode scanner input
  - `F4`: Quick customer registration modal
  - `F8`: Instant proceed to checkout
  - `Esc`: Close open modal / dialog

### 3. Payment & Settlement Modal (`src/components/pos/CheckoutModal.tsx`)
- **Single Tender & Multi-Tender Split Payments**:
  - Split between Cash, UPI (PhonePe/GooglePay/Paytm), Credit/Debit Card, Bank Transfer (NEFT/RTGS), and Store Credit.
  - Real-time split difference calculator and validation.
- **Cash Tender Operations**:
  - Cash received vs. change to return live calculation.
  - Quick tender denomination buttons (₹500, ₹1000, ₹2000 multiples).
  - Khata / Credit allowance option for registered accounts.
- **Immediate State Synchronization**:
  - Automatically marks unique jewellery items as `Sold`.
  - Deducts quantities for batch items (coins/bullions).
  - Records payments into the transaction ledger.
  - Credits loyalty points and updates customer lifetime spend.

### 4. Barcode Generator & Label Printing (`src/pages/BarcodeGenerator.tsx`, `src/pages/LabelPrinting.tsx`)
- **Genuine Scannable Code 128 Artwork**:
  - Powered by `JsBarcode` with high-contrast vector SVG/canvas generation.
  - Batch barcode generator for un-tagged catalogue items.
  - SVG download and copy barcode string.
- **Thermal Jewellery Tag Designer**:
  - Custom tag templates: Standard Tag (50x25mm), Compact Tag (40x20mm), Product Box Label (70x40mm).
  - Visual toggles for Store Name, Product Name, Barcode, Purity, Gross Wt, Net Wt, Price, and BIS HUID.
  - Dedicated print stylesheet (`@media print`) preventing scaling distortion on thermal printers (TSC, Zebra, Citizen).

### 5. Invoice History & Printing (`src/pages/InvoiceDetail.tsx`, `src/pages/InvoiceHistory.tsx`)
- **Multi-Format Invoices**:
  - A4 Tax Invoice (Standard showroom format)
  - A5 Compact Invoice
  - 80mm & 58mm Thermal Roll Receipts
- **Comprehensive Fields**:
  - Store Header (Name, Address, Phone, GSTIN)
  - Customer Information (Name, Mobile, Address, B2B GSTIN)
  - Itemized table with metal, purity, HUID, weights, rates, making charges, GST%, total
  - Amount in words in Indian Rupees and Paise (e.g. *"Forty Two Thousand Ninety Eight Rupees Only"*)
  - One-click WhatsApp receipt sharing link and Email invoice dispatch.

### 6. Customer CRM, Loyalty & Ledger (`src/pages/CustomerManagement.tsx`, `src/pages/CustomerLedger.tsx`, `src/pages/LoyaltyRewards.tsx`)
- **Customer CRM Directory**: Filter by Regular, Premium VIP, and Wholesale merchants.
- **Khata / Account Ledger**: Running debit/credit balance, purchases, payments, and printable customer account statement.
- **Loyalty & Rewards Program**: Tier multipliers (1.0x, 1.5x, 2.0x), points redemption rules, and transaction history.

### 7. Ancillary Showroom Operations
- **Returns & Exchanges (`src/pages/ReturnsExchanges.tsx`)**: Search original invoice, select returned piece, issue Cash/Store Credit, auto-restock item to Available.
- **Credit Notes (`src/pages/CreditNotes.tsx`)**: Track active credit vouchers with remaining balances.
- **Old Gold Scrap Exchange (`src/pages/OldGoldExchange.tsx`)**: Transparent valuation formula with declared vs. tested purity, melting loss deduction, and exchange credit vouchers.
- **Gold Rate Management (`src/pages/GoldRateManagement.tsx`)**: Daily benchmark rate card (24K, 22K, 20K, 18K, Silver 999, Platinum) with rate history line chart.
- **Daily Register Closing (`src/pages/DailyClosing.tsx`)**: Shift cash tally, expected physical cash vs. actual cash counted, variance tracker, and printable shift closing sheet.
- **Repair Service Orders (`src/pages/RepairOrders.tsx`)**: Job cards for artisan sizing, soldering, and polishing with delivery milestones.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 + TypeScript + Vite |
| **Styling & UI** | Tailwind CSS v4 + Custom Jewellery Theme (Ivory, Charcoal, Champagne Gold) |
| **Icons** | Lucide React |
| **Routing** | React Router DOM v7 |
| **Global State** | Zustand |
| **Data Visualization** | Recharts (Area charts, Bar charts, Pie charts) |
| **Barcode Generation** | JsBarcode (Code 128 symbology) |
| **QR Generation** | qrcode.react (2D authentication codes) |
| **Persistence** | LocalStorage Service Abstraction (Supabase-ready) |

---

## 🚀 Installation & Running Locally

### Prerequisites
- Node.js (v18.0 or newer)
- npm (v9.0 or newer)

### Steps
```bash
# 1. Navigate to the project directory
cd jewellery-pos

# 2. Install dependencies (already installed in workspace)
npm install

# 3. Start the Vite development server
npm run dev

# 4. Open in browser
# http://localhost:5173/
```

### Build for Production
```bash
npm run build
```
The compiled output will be generated inside the `dist/` directory.

---

## 🗄️ Project Structure

```
jewellery-pos/
├── src/
│   ├── components/
│   │   ├── layout/            # Sidebar, Header, AppLayout
│   │   ├── pos/               # QuickCustomerModal, CheckoutModal
│   │   └── ui/                # Button, Input, Card, Badge, Dialog, Select, Table, Tabs, Toast, etc.
│   ├── data/
│   │   └── mock-data.ts       # Realistic Indian jewellery store seed data (25+ items, 15 customers, 20 invoices)
│   ├── lib/
│   │   ├── pricing.ts         # Jewellery pricing, making charges, wastage & tax engine
│   │   └── utils.ts           # Currency formatting (₹), weights (g), dates, number-to-words
│   ├── pages/                 # 22 Complete interactive pages
│   │   ├── Dashboard.tsx
│   │   ├── POSBilling.tsx
│   │   ├── InvoiceHistory.tsx
│   │   ├── InvoiceDetail.tsx
│   │   ├── Catalogue.tsx
│   │   ├── AddJewelleryItem.tsx
│   │   ├── ItemDetails.tsx
│   │   ├── BarcodeGenerator.tsx
│   │   ├── LabelPrinting.tsx
│   │   ├── ScanSearch.tsx
│   │   ├── GoldRateManagement.tsx
│   │   ├── CustomerManagement.tsx
│   │   ├── CustomerProfile.tsx
│   │   ├── CustomerLedger.tsx
│   │   ├── LoyaltyRewards.tsx
│   │   ├── PaymentRecords.tsx
│   │   ├── DailyClosing.tsx
│   │   ├── OldGoldExchange.tsx
│   │   ├── ReturnsExchanges.tsx
│   │   ├── CreditNotes.tsx
│   │   ├── SalesReports.tsx
│   │   └── RepairOrders.tsx
│   ├── services/
│   │   ├── storage.ts         # LocalStorage persistence layer
│   │   └── data-service.ts    # Service functions and CRUD abstraction for future Supabase migration
│   ├── stores/
│   │   └── index.ts           # Zustand useAppStore and usePOSStore
│   ├── types/
│   │   └── index.ts           # Complete TypeScript domain entity types
│   ├── App.tsx                # Master routing definition
│   ├── index.css              # Tailwind v4 theme definitions and print styles
│   └── main.tsx               # Application entry point with demo seed initialization
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🖨️ Barcode Label & Receipt Printing Guide

### Thermal Jewellery Tags
1. Connect any ESC/POS or standard thermal label printer (e.g. TSC TE244, Zebra ZD220, Citizen CL-E300).
2. Set your printer driver label size to **50mm × 25mm** (or the template chosen in the software).
3. Navigate to **Label Printing** (`/labels`), select the desired jewellery piece, configure the fields, and click **Print Label**.
4. In the browser print dialog:
   - Set **Destination** to your thermal label printer.
   - Set **Margins** to **None**.
   - Check **Background graphics** if prompted.

### Invoice Receipts
1. Navigate to **Invoice History** (`/invoices`) or complete a checkout on the POS terminal.
2. Select your preferred invoice layout:
   - **A4**: Full showroom GST tax invoice with authorized signatory.
   - **A5**: Half-page compact slip.
   - **80mm / 58mm**: Thermal cash register roll receipt.
3. Click **Print Invoice** or press `Ctrl + P`.

---

## 🔮 Future Backend & Admin Panel Roadmap

The application has been specifically architected with a clean service layer (`src/services/data-service.ts`) and stable entity schemas (`src/types/index.ts`) so that a central backend (such as Supabase or PostgreSQL + Node.js) can be connected seamlessly:

1. **Centralized Multi-Store Database**:
   - `stores`, `users`, `staff`
   - `product_designs` and `jewellery_items` (with row-level locking for atomic checkouts)
   - `metal_rates` with scheduled live API rate updates
   - `invoices`, `invoice_items`, `payments`
   - `customer_ledger` with immutable financial audit logs
2. **Super Admin & Multi-Branch Inventory Transfer**:
   - Central rate broadcasting to all franchise terminals.
   - Inter-store stock transfers and approvals.
3. **Hardware SDK Integration**:
   - Direct WebUSB / ESC/POS thermal bridge for headless printing.
   - Direct electronic weighing scale integration via WebSerial API.
4. **Automated WhatsApp Business API**:
   - Replace the client-side `api.whatsapp.com` link with webhooks sending automated PDF bills via WhatsApp Cloud API.
