# Deploying JewelSync to Hostinger

| Part | URL | Hostinger resource |
|---|---|---|
| Frontend (React build) | https://billing.infinitytechnohub.com | static files in the `billing` subdomain web root |
| Backend (Node/Express API) | https://apibilling.infinitytechnohub.com | Node.js app on the `apibilling` subdomain |
| Database | n/a (private to the server) | MySQL database created in hPanel |

Account facts verified through the Hostinger API: both subdomains already exist in DNS (pointing at the **Business Web
Hosting** plan, server `82.112.229.7`). Nothing else needs to change in DNS.

## 0. Build the bundles (done on your PC)
```
python deploy/package.py
```
Produces `deploy/out/frontend-billing.zip` (built against `https://apibilling.infinitytechnohub.com/api/v1`) and
`deploy/out/backend-apibilling.zip` (no `.env`, no `node_modules`).

## 1. Create the MySQL database (hPanel; cannot be automated)
hPanel -> **Databases -> MySQL Databases** -> create a database + user + strong password.
Hostinger prefixes the names (e.g. `u123456789_jewelsync`). Write the three values down; the server setup script asks for them.

## 2. Frontend
hPanel -> **Websites -> billing.infinitytechnohub.com -> File Manager** -> open the site's web root (`public_html`),
remove the default placeholder files, upload `frontend-billing.zip` and **Extract** it there.
Make sure `.htaccess` (hidden file) is present: it makes deep links such as `/invoices` work and forces HTTPS.

## 3. Backend (Node.js app)
hPanel -> **Websites -> apibilling.infinitytechnohub.com -> Node.js** (create the Node.js app for this subdomain if
none exists), then:
1. Node.js version **20 or 22**.
2. Upload and extract `backend-apibilling.zip` into the app folder (File Manager), or use "Upload" in the Node.js screen.
3. **Entry/startup file:** `src/server.js`.
4. Open an SSH terminal (hPanel -> Advanced -> SSH Access), `cd` to the app folder and run:
   ```
   bash server-setup.sh
   ```
   It asks for the DB name/user/password, writes `.env` (mode 600, with a freshly generated `JWT_SECRET` and
   `CORS_ORIGINS=https://billing.infinitytechnohub.com`), runs `npm install --omit=dev`, creates the tables, and offers
   to load demo data. **Copy the demo password it prints.** (Alternative: enter the same variables in the hPanel
   Node.js "Environment variables" screen instead of `.env`.)
5. **Restart** the Node.js app from hPanel.

## 4. Test the whole system
From your PC:
```
node deploy/smoke-test.mjs https://apibilling.infinitytechnohub.com --frontend https://billing.infinitytechnohub.com
SMOKE_EMAIL=rajesh@slj.com SMOKE_PASSWORD='<demo password>' node deploy/smoke-test.mjs https://apibilling.infinitytechnohub.com --frontend https://billing.infinitytechnohub.com --write
```
The first is read-only. `--write` makes one real test sale and returns it (stock is restored).
Then open https://billing.infinitytechnohub.com and sign in:

| Login | Role |
|---|---|
| admin@slj.com | Admin |
| rajesh@slj.com | Manager |
| priya@slj.com, arun@slj.com | Cashier |

Suggested manual pass: new bill by barcode -> split payment -> print invoice; credit sale for a customer; return with
store credit; old-gold exchange; repair job card; daily closing (Manager); gold rate update (Manager).

## After testing
- Change the demo users' passwords (or create real staff in the app and deactivate the demo ones).
- If you loaded demo data and want a clean start: `npm run seed -- --force` wipes all data, so only do that deliberately.

## Troubleshooting
- Browser shows "Unable to reach the server": check `https://apibilling.infinitytechnohub.com/health`; check CORS_ORIGINS
  matches the frontend origin exactly (https, no trailing slash).
- `/ready` returns 503: database credentials in `.env` are wrong, or the DB user lacks rights on the database.
- 404 on page refresh: `.htaccess` was not uploaded to the frontend web root.
- Application logs: hPanel Node.js screen -> logs (the API logs JSON lines; it never logs passwords or tokens).
