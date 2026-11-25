// Production smoke test. Usage:
//   node deploy/smoke-test.mjs https://apibilling.infinitytechnohub.com [--frontend https://billing.infinitytechnohub.com]
//   SMOKE_EMAIL=priya@slj.com SMOKE_PASSWORD=... node deploy/smoke-test.mjs <api-origin> --write
//
// Read-only by default. With --write it also performs one real test sale of 1 unit (creates an invoice and
// reduces stock by 1) and then a return of it, so run it only when you are happy with that.
const args = process.argv.slice(2);
const apiOrigin = (args.find(a => a.startsWith('http')) || '').replace(/\/$/, '');
const fIdx = args.indexOf('--frontend');
const frontendOrigin = fIdx >= 0 ? args[fIdx + 1].replace(/\/$/, '') : '';
const WRITE = args.includes('--write');
if (!apiOrigin) {
  console.error('Usage: node deploy/smoke-test.mjs <api-origin> [--frontend <origin>] [--write]');
  process.exit(2);
}
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;

let failed = 0;
const ok = (name, detail = '') => console.log(`  PASS  ${name}${detail ? ' - ' + detail : ''}`);
const bad = (name, detail = '') => { failed++; console.log(`  FAIL  ${name}${detail ? ' - ' + detail : ''}`); };
const check = (name, cond, detail) => (cond ? ok(name, cond === true ? detail : '') : bad(name, detail));

async function req(method, path, { token, body, headers } = {}) {
  const res = await fetch(`${apiOrigin}/api/v1${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* not json */ }
  return { status: res.status, json, headers: res.headers };
}

console.log(`API: ${apiOrigin}`);

// --- infrastructure
const health = await fetch(`${apiOrigin}/health`).catch(() => null);
check('GET /health', health?.status === 200, health ? `HTTP ${health.status}` : 'unreachable');
const ready = await fetch(`${apiOrigin}/ready`).catch(() => null);
check('GET /ready (database connected)', ready?.status === 200, ready ? `HTTP ${ready.status}` : 'unreachable');
check('HTTPS in use', apiOrigin.startsWith('https://'));
check('security headers present', !!health?.headers.get('x-content-type-options'), 'helmet');

// --- CORS
if (frontendOrigin) {
  const pre = await fetch(`${apiOrigin}/api/v1/customers`, {
    method: 'OPTIONS',
    headers: { Origin: frontendOrigin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' },
  });
  check('CORS allows the frontend origin', pre.headers.get('access-control-allow-origin') === frontendOrigin, `got ${pre.headers.get('access-control-allow-origin')}`);
  const evil = await fetch(`${apiOrigin}/api/v1/customers`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' } });
  check('CORS rejects other origins', !evil.headers.get('access-control-allow-origin'));

  const page = await fetch(frontendOrigin).catch(() => null);
  const html = page ? await page.text() : '';
  check('frontend serves index.html', page?.status === 200 && html.includes('<div id="root">'), page ? `HTTP ${page.status}` : 'unreachable');
  const deep = await fetch(`${frontendOrigin}/invoices`).catch(() => null);
  check('frontend SPA deep link works (no 404)', deep?.status === 200, deep ? `HTTP ${deep.status}` : 'unreachable');
}

// --- auth & authorization
check('anonymous request rejected (401)', (await req('GET', '/customers')).status === 401);
const wrong = await req('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'wrong-password' } });
check('wrong login rejected (401)', wrong.status === 401 && wrong.json?.errorCode === 'INVALID_CREDENTIALS');

if (!EMAIL || !PASSWORD) {
  console.log('\nSet SMOKE_EMAIL and SMOKE_PASSWORD to also test the signed-in flows.');
} else {
  const login = await req('POST', '/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  check('login', login.status === 200, `HTTP ${login.status}`);
  const token = login.json?.data?.token;
  if (token) {
    const role = login.json.data.user.role;
    console.log(`  (signed in as ${login.json.data.user.name}, ${role})`);
    for (const path of ['/store', '/settings/tax', '/settings/loyalty', '/metal-rates', '/jewellery-items?limit=5', '/customers?limit=5',
      '/invoices?limit=5', '/payments?limit=5', '/returns?limit=5', '/credit-notes', '/old-gold-exchanges', '/repair-orders',
      '/ledger-entries?limit=5', '/loyalty-transactions?limit=5', '/daily-closings', '/notifications', '/label-templates', '/product-designs']) {
      const r = await req('GET', path, { token });
      check(`GET ${path}`, r.status === 200 && r.json?.success === true, `HTTP ${r.status}`);
    }
    const bad422 = await req('POST', '/customers', { token, body: { fullName: '', mobile: 'x' } });
    check('validation returns 422', bad422.status === 422);
    const noPerm = await req('PUT', '/metal-rates/does-not-exist', { token, body: { ratePerGram: 1 } });
    check('role check works (cashier 403 / manager 404 for unknown id)', role === 'Cashier' ? noPerm.status === 403 : noPerm.status === 404, `HTTP ${noPerm.status}`);

    if (WRITE) {
      console.log('\nWrite test (real sale + return):');
      const items = await req('GET', '/jewellery-items?limit=200&isActive=true', { token });
      const item = items.json?.data?.find(i => i.isQuantityBased && i.stockQuantity > 2 && i.stockStatus === 'Available');
      if (!item) bad('find a quantity-based item with stock', 'none available');
      else {
        const total = Math.round(item.sellingPrice * (1 + (item.gstRate || 3) / 100) * 100) / 100;
        const key = `smoke-${Date.now()}`;
        const sale = await req('POST', '/invoices', {
          token, headers: { 'Idempotency-Key': key },
          body: { items: [{ jewelleryItemId: item.id, quantity: 1 }], placeOfSupplyCode: '33', payments: [{ method: 'Cash', amount: total }] },
        });
        check('create invoice', sale.status === 201, `HTTP ${sale.status} ${sale.json?.message || ''}`);
        const inv = sale.json?.data?.invoice;
        if (inv) {
          check('invoice number format', /^SLJ\/\d{4}-\d{2}\/\d{4}$/.test(inv.invoiceNumber), inv.invoiceNumber);
          check('server-computed total', Math.abs(inv.grandTotal - total) < 0.02, `${inv.grandTotal} vs expected ${total}`);
          const replay = await req('POST', '/invoices', { token, headers: { 'Idempotency-Key': key }, body: { items: [{ jewelleryItemId: item.id, quantity: 1 }], placeOfSupplyCode: '33', payments: [{ method: 'Cash', amount: total }] } });
          check('idempotent retry returns same invoice', replay.status === 200 && replay.json?.data?.invoice?.id === inv.id);
          const after = await req('GET', `/jewellery-items/${item.id}`, { token });
          check('stock reduced by exactly 1', after.json?.data?.stockQuantity === item.stockQuantity - 1, `${item.stockQuantity} -> ${after.json?.data?.stockQuantity}`);
          const ret = await req('POST', '/returns', { token, body: { originalInvoiceId: inv.id, items: [{ jewelleryItemId: item.id, refundAmount: inv.grandTotal }], refundMethod: 'Cash', reason: 'Other', notes: 'smoke test' } });
          check('return processed', ret.status === 201, `HTTP ${ret.status} ${ret.json?.message || ''}`);
          const restored = await req('GET', `/jewellery-items/${item.id}`, { token });
          check('stock restored after return', restored.json?.data?.stockQuantity === item.stockQuantity, `${restored.json?.data?.stockQuantity}`);
        }
      }
    }
  }
}

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
