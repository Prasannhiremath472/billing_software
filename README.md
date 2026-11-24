# JewelSync POS: Jewellery Billing Software

Full-stack retail POS for jewellery showrooms (GST invoicing, barcode/labels, customers & loyalty, returns,
old-gold exchange, repairs, daily closing).

```
frontend/   React 19 + Vite + TypeScript + Tailwind v4 (UI taken from the JewelSync-POS design)
backend/    Node.js + Express REST API (/api/v1) + MySQL 8
JewelSync-POS/   original UI-only prototype (localStorage); kept untouched as the design reference
```

```
React/Vite  ->  REST API (/api/v1)  ->  Express (route > validate > service > repository)  ->  MySQL
```

## Quick start (local)

### 1. Database
Create an empty MySQL 8 database and a user for it:

```sql
CREATE DATABASE jewelsync_pos CHARACTER SET utf8mb4;
CREATE USER 'jewelsync'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
GRANT ALL ON jewelsync_pos.* TO 'jewelsync'@'localhost';
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # fill DB_PASSWORD and JWT_SECRET (see comments in the file)
npm install
npm run migrate             # creates the tables (also runs automatically on start)
npm run seed                # demo data + demo users
npm run dev                 # http://localhost:4000  (health: /health, readiness: /ready)
npm test                    # integration tests (needs the migrated + seeded DB)
```
`npm run seed` prints the password used for the demo users (or uses `SEED_USER_PASSWORD`).
Demo logins: `admin@slj.com` (Admin), `rajesh@slj.com` (Manager), `priya@slj.com` / `arun@slj.com` (Cashier).
**Change or deactivate the demo users before real use.**

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5175 (Vite proxies /api to http://localhost:4000)
```

## Roles
| Role | Can do |
|---|---|
| Cashier | Billing, customers, returns, old-gold, repairs, read everything. Cost prices are hidden. |
| Manager | Everything a cashier can + catalogue/stock, gold rates, loyalty/tax/store settings, daily closing |
| Admin | Everything + manage staff accounts |

Permissions are enforced on the server; hiding UI is never relied on.

## What the server decides
The browser never supplies money values for a sale. `POST /api/v1/invoices` takes item ids, quantities,
discounts and payments; the server then re-prices every line, applies GST (CGST+SGST or IGST by place of supply),
checks stock under row locks, numbers the invoice (`SLJ/<FY>/<serial>`), records payments, ledger and loyalty
points, and updates stock in **one transaction**. Send an `Idempotency-Key` header to make retries safe.
Daily closing totals are likewise computed from recorded payments.

## API overview (`/api/v1`, JSON, `Authorization: Bearer <token>`)
Responses: `{ success, message, data, pagination? }`; errors: `{ success:false, message, errorCode, details? }`.
List endpoints accept `page`, `limit` (max 1000), `search`, `sortBy`, `sortOrder`, `from`/`to` and resource filters.

`auth/login` · `auth/me` · `auth/change-password` · `store` · `settings/loyalty|tax` · `staff` · `metal-rates` (+`/history`) ·
`product-designs` · `jewellery-items` (+`/barcode/:code`, `/bulk-barcodes`) · `customers` · `invoices` · `payments` ·
`returns` · `credit-notes` · `exchanges` · `old-gold-exchanges` · `ledger-entries` · `loyalty-transactions` ·
`daily-closings` (+`/summary`) · `repair-orders` · `label-templates` · `notifications` · `parked-bills`

## Configuration
Backend (`backend/.env`): `PORT`, `CORS_ORIGINS`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`,
`JWT_SECRET` (>= 32 chars), `JWT_EXPIRES_IN`, `STORE_UTC_OFFSET_MINUTES` (default 330 = IST, used for business days).
Frontend: `VITE_API_BASE_URL` (production API URL; unset in dev). See the `.env.example` files.

## Production notes
- Build the UI with `npm run build` in `frontend/` and serve `dist/` as static files; run the API with `npm start`.
- Set `CORS_ORIGINS` to the real frontend origin and `VITE_API_BASE_URL` to the real API URL.
- Use a long random `JWT_SECRET`; never commit `.env`.
- The frontend loads the full catalogue/customer/invoice lists on sign-in (fine for a single showroom). The API is
  already paginated, so the heavier pages can move to server-side paging if data grows large.
- Not implemented: Hostinger deployment (not requested), refresh tokens (a 12h access token is used),
  multi-store/tenant separation (single store per database).
