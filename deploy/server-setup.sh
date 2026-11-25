#!/usr/bin/env bash
# Run ON THE SERVER inside the backend app folder (the folder containing package.json), over SSH:
#   bash server-setup.sh
# It asks for the MySQL details you created in hPanel, writes .env (mode 600), installs dependencies,
# creates the tables and (optionally) loads the demo data. Nothing secret is printed except the one-time
# demo-user password, if you ask for demo data.
set -euo pipefail

cd "$(dirname "$0")"
[ -f package.json ] || { echo "Run this from the backend folder (package.json not found)"; exit 1; }

API_DOMAIN="${API_DOMAIN:-apibilling.infinitytechnohub.com}"
APP_ORIGIN="${APP_ORIGIN:-https://billing.infinitytechnohub.com}"

if [ -f .env ]; then
  read -r -p ".env already exists. Overwrite? [y/N] " ow
  [ "${ow:-N}" = "y" ] || { echo "Keeping existing .env"; SKIP_ENV=1; }
fi

if [ -z "${SKIP_ENV:-}" ]; then
  read -r -p "MySQL database name (e.g. u123456789_jewelsync): " DB_NAME
  read -r -p "MySQL user name (e.g. u123456789_jewelsync): " DB_USER
  read -r -s -p "MySQL password (input hidden): " DB_PASSWORD; echo
  JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
  umask 177
  cat > .env <<EOF
NODE_ENV=production
CORS_ORIGINS=${APP_ORIGIN}
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
DB_POOL_SIZE=5
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=12h
EOF
  echo "Wrote .env (permissions 600)"
fi

echo "Installing production dependencies..."
npm install --omit=dev --no-audit --no-fund

echo "Creating/upgrading database tables..."
npm run migrate

read -r -p "Load demo data (fake store, items, customers, invoices, demo users)? [y/N] " seed
if [ "${seed:-N}" = "y" ]; then
  npm run seed
  echo "Save the demo-user password printed above - it is shown only once. Change it after first login."
fi

echo "Done. Restart the Node.js app from hPanel, then run: node deploy/smoke-test.mjs https://${API_DOMAIN}"
