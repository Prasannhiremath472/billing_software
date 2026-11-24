import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../config/db.js';
import { config } from '../config/env.js';
import { repos } from '../repositories/index.js';
import { migrate } from './migrate.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const seedFile = path.join(here, '..', '..', 'seed', 'demo-data.json');

async function insertAll(conn, repo, rows) {
  for (const row of rows) await repo.insert(conn, row);
}

export async function seed({ force = false, log = console.log } = {}) {
  await migrate({ log });

  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM users');
  if (n > 0 && !force) {
    log('Database already contains data - skipping seed (use `npm run seed -- --force` to wipe and reseed).');
    return null;
  }

  const data = JSON.parse(await fs.readFile(seedFile, 'utf8'));
  const password = config.seedUserPassword || randomBytes(9).toString('base64url');
  const passwordHash = await bcrypt.hash(password, 10);

  await withTransaction(async conn => {
    if (force) {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      const [tables] = await conn.query(
        "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name <> 'schema_migrations'"
      );
      for (const { t } of tables) await conn.query(`TRUNCATE TABLE \`${t}\``);
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    // Users (staff) - one admin plus the demo staff
    const staff = [
      { id: 'staff-000', name: 'Store Admin', role: 'Admin', email: 'admin@slj.com', phone: '9876543200' },
      ...data.demoStaff,
    ];
    for (const s of staff) {
      await conn.query(
        'INSERT INTO users (id, name, role, email, phone, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [s.id, s.name, s.role, s.email.toLowerCase(), s.phone ?? null, passwordHash]
      );
    }

    await repos.storeInfo.insert(conn, data.demoStoreInfo);
    await conn.query('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?), (?, ?)', [
      'loyalty_config', JSON.stringify(data.demoLoyaltyConfig),
      'tax_config', JSON.stringify(data.demoTaxConfig),
    ]);

    await insertAll(conn, repos.metalRate, data.demoMetalRates);
    await insertAll(conn, repos.metalRateHistory, data.demoRateHistory);
    await insertAll(conn, repos.productDesign, data.demoProductDesigns);
    await insertAll(conn, repos.jewelleryItem, data.demoJewelleryItems);
    await insertAll(conn, repos.customer, data.demoCustomers);

    // Invoices + lines + payments
    for (const inv of data.demoInvoices) {
      const { items, payments, ...header } = inv;
      await repos.invoice.insert(conn, header);
      let line = 0;
      for (const it of items) {
        await repos.invoiceItem.insert(conn, {
          ...it,
          id: `${inv.id}-li${++line}`,
          invoiceId: inv.id,
          lineNo: line,
        });
      }
      await insertAll(conn, repos.payment, payments);
    }

    await insertAll(conn, repos.creditNote, data.demoCreditNotes);
    for (const ret of data.demoReturns) {
      const { items, ...header } = ret;
      await repos.returnRecord.insert(conn, header);
      for (const it of items) await repos.returnItem.insert(conn, { ...it, returnId: ret.id });
    }
    await insertAll(conn, repos.oldGold, data.demoOldGoldExchanges);
    await insertAll(conn, repos.ledgerEntry, data.demoLedgerEntries);
    await insertAll(conn, repos.loyaltyTransaction, data.demoLoyaltyTransactions);
    await insertAll(conn, repos.dailyClosing, data.demoDailyClosings);
    await insertAll(conn, repos.repairOrder, data.demoRepairOrders);
    await insertAll(conn, repos.labelTemplate, data.demoLabelTemplates);
    await insertAll(conn, repos.notification, data.demoNotifications);
    // Start document counters after the highest seeded number (e.g. RET-2611-0001 -> RET-2611 = 1)
    const maxSeq = new Map();
    const track = num => {
      const m = /^([A-Z]+)-(\d{4})-(\d+)$/.exec(num || '');
      if (!m) return;
      const key = `${m[1]}-${m[2]}`;
      maxSeq.set(key, Math.max(maxSeq.get(key) || 0, Number(m[3])));
    };
    data.demoReturns.forEach(r => track(r.returnNumber));
    data.demoCreditNotes.forEach(c => track(c.creditNoteNumber));
    data.demoOldGoldExchanges.forEach(o => track(o.exchangeNumber));
    data.demoRepairOrders.forEach(r => track(r.repairNumber));
    for (const [key, value] of maxSeq) {
      await conn.query('INSERT INTO document_sequences (seq_key, current_value) VALUES (?, ?)', [key, value]);
    }
    log(`Seeded ${data.demoInvoices.length} invoices, ${data.demoJewelleryItems.length} items, ${data.demoCustomers.length} customers.`);
  });

  return { password: config.seedUserPassword ? '(from SEED_USER_PASSWORD)' : password };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  seed({ force: process.argv.includes('--force') })
    .then(result => {
      if (result) {
        console.log('Demo users: admin@slj.com (Admin), rajesh@slj.com (Manager), priya@slj.com / arun@slj.com (Cashier)');
        console.log(`Password for all demo users: ${result.password}`);
      }
      return pool.end();
    })
    .catch(err => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
