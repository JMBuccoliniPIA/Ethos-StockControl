/**
 * Suite de integración E2E contra la API viva.
 *
 * Requisitos: Node >= 18 (usa `fetch` global). NO instala dependencias.
 * Uso:
 *   1. Levantar el entorno:  npm run dev   (o dev:api)
 *   2. En otra terminal:     npm run test:e2e   (desde la raíz o apps/api)
 *
 * Variables de entorno opcionales:
 *   E2E_API_URL   (default http://localhost:3001/api/v1)
 *   E2E_EMAIL     (default admin@ethos.com)
 *   E2E_PASSWORD  (default admin123)
 *
 * Cubre cada fix aplicado con asserts pass/fail y sale con código != 0 si algo falla.
 */

const API = process.env.E2E_API_URL || 'http://localhost:3001/api/v1';
const EMAIL = process.env.E2E_EMAIL || 'admin@ethos.com';
const PASSWORD = process.env.E2E_PASSWORD || 'admin123';

let PASS = 0;
let FAIL = 0;
const results = [];

async function call(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    return { status: 0, data: { message: `network error: ${err.message}` } };
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function check(name, cond, detail = '') {
  if (cond) {
    PASS++;
    results.push(['PASS', name, '']);
  } else {
    FAIL++;
    results.push(['FAIL', name, detail]);
  }
}

async function main() {
  // ── Auth ──
  let { status, data } = await call('POST', '/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  check('login válido devuelve accessToken', (status === 200 || status === 201) && !!data?.accessToken, `status=${status}`);
  const TOKEN = data?.accessToken;
  if (!TOKEN) {
    console.error('\n✗ No se pudo obtener token. ¿Está la API levantada en ' + API + '?');
    summary();
    process.exit(1);
  }

  ({ status } = await call('POST', '/auth/login', { body: { email: EMAIL, password: 'WRONG' } }));
  check('login inválido rechazado (401)', status === 401, `status=${status}`);

  ({ status } = await call('GET', '/products'));
  check('endpoint protegido sin token rechazado (401)', status === 401, `status=${status}`);

  // ── Producto de trabajo ──
  ({ data } = await call('GET', '/products?search=LED-TIRA-5M', { token: TOKEN }));
  const prod = data.data[0];
  const PID = prod._id;
  const stock = async () => (await call('GET', `/products/${PID}`, { token: TOKEN })).data.stock;

  await call('POST', '/stock/movement', { token: TOKEN, body: { productId: PID, type: 'adjustment', quantity: 30, reason: 'setup' } });
  check('setup stock=30', (await stock()) === 30, `stock=${await stock()}`);

  // ── Fix: OUT que excede stock rechazado (sin sobreventa) ──
  ({ status } = await call('POST', '/stock/movement', { token: TOKEN, body: { productId: PID, type: 'out', quantity: 999, reason: 'exceso' } }));
  check('OUT > stock rechazado (400)', status === 400, `status=${status}`);
  check('stock intacto tras OUT rechazado', (await stock()) === 30, `stock=${await stock()}`);

  // ── Fix #1: OUT grande (>50%) registra en Kardex con prev/new correctos ──
  let kb = (await call('GET', `/kardex/entries?productId=${PID}&productType=Product&limit=1`, { token: TOKEN })).data;
  const totalBefore = kb.total;
  ({ status, data } = await call('POST', '/stock/movement', { token: TOKEN, body: { productId: PID, type: 'out', quantity: 20, reason: 'E2E salida grande' } }));
  check('OUT grande aceptado', status === 201, `status=${status}`);
  check('movement result prev=30 new=10', data.previousStock === 30 && data.newStock === 10, JSON.stringify(data).slice(0, 120));
  const ka = (await call('GET', `/kardex/entries?productId=${PID}&productType=Product&limit=1`, { token: TOKEN })).data;
  check('Kardex creó asiento (total+1)', ka.total === totalBefore + 1, `${totalBefore}->${ka.total}`);
  const e = ka.data[0];
  check('Kardex asiento prev=30 -> new=10', e.previousStock === 30 && e.newStock === 10, `prev=${e.previousStock} new=${e.newStock}`);
  check('Kardex exitQuantity=20', e.exitQuantity === 20, `qty=${e.exitQuantity}`);

  // ── Fix #8: concurrencia — 2 OUT simultáneos no sobrevenden ──
  await call('POST', '/stock/movement', { token: TOKEN, body: { productId: PID, type: 'adjustment', quantity: 10, reason: 'setup conc' } });
  const outcomes = await Promise.all([
    call('POST', '/stock/movement', { token: TOKEN, body: { productId: PID, type: 'out', quantity: 8, reason: 'conc' } }),
    call('POST', '/stock/movement', { token: TOKEN, body: { productId: PID, type: 'out', quantity: 8, reason: 'conc' } }),
  ]);
  const oks = outcomes.filter((o) => o.status === 201).length;
  check('concurrencia: exactamente 1 de 2 OUT de 8 sobre stock 10 pasa', oks === 1, `statuses=${outcomes.map((o) => o.status)}`);
  check('concurrencia: stock final = 2 (no negativo)', (await stock()) === 2, `stock=${await stock()}`);

  // ── ADJUSTMENT a 0 (schema min:0) ──
  ({ status, data } = await call('POST', '/stock/movement', { token: TOKEN, body: { productId: PID, type: 'adjustment', quantity: 0, reason: 'a cero' } }));
  check('ADJUSTMENT a 0 aceptado', status === 201 && data.newStock === 0, `status=${status} new=${data?.newStock}`);

  // ── quantity negativo rechazado ──
  ({ status } = await call('POST', '/stock/movement', { token: TOKEN, body: { productId: PID, type: 'in', quantity: -5, reason: 'neg', supplierId: 'x', documentNumber: 'y' } }));
  check('quantity negativo rechazado (400)', status === 400, `status=${status}`);

  // ── IN requiere supplier + documentNumber ──
  ({ status } = await call('POST', '/stock/movement', { token: TOKEN, body: { productId: PID, type: 'in', quantity: 5, reason: 'sin remito' } }));
  check('IN sin supplier/remito rechazado (400)', status === 400, `status=${status}`);
  const SUPID = (await call('GET', '/suppliers', { token: TOKEN })).data[0]._id;
  ({ status, data } = await call('POST', '/stock/movement', { token: TOKEN, body: { productId: PID, type: 'in', quantity: 5, reason: 'con remito', supplierId: SUPID, documentNumber: 'R-TEST-001' } }));
  check('IN con supplier+remito aceptado', status === 201 && data.newStock === 5, `status=${status} new=${data?.newStock}`);

  // ── Restaurar stock ──
  await call('POST', '/stock/movement', { token: TOKEN, body: { productId: PID, type: 'adjustment', quantity: 30, reason: 'restore final' } });

  // ── Fix #5: OUT deriva a Venta ──
  const sales = (await call('GET', '/sales/by-product', { token: TOKEN })).data;
  const sold = Array.isArray(sales) ? sales.find((s) => s.sku === 'LED-TIRA-5M') : null;
  check('Venta derivada del OUT existe para LED-TIRA-5M', !!sold && sold.quantitySold > 0, sold ? JSON.stringify(sold).slice(0, 80) : 'no aparece');

  // ── Fix #6: borrar proveedor con referencias bloqueado ──
  ({ status, data } = await call('DELETE', `/suppliers/${SUPID}`, { token: TOKEN }));
  check('borrar proveedor con refs bloqueado (400)', status === 400 && String(data?.message).includes('No se puede eliminar'), `status=${status}`);

  // ── Guard: borrar familia con productos bloqueado ──
  const FID = typeof prod.familyId === 'object' ? prod.familyId._id : prod.familyId;
  if (FID) {
    ({ status } = await call('DELETE', `/families/${FID}`, { token: TOKEN }));
    check('borrar familia con productos bloqueado (400)', status === 400, `status=${status}`);
  }

  // ── Currency @IsIn: valor inválido rechazado ──
  ({ status } = await call('POST', '/supplier-products', { token: TOKEN, body: { supplierId: SUPID, supplierSku: 'E2E-CUR', supplierName: 'x', basePrice: 100, currency: 'EUR' } }));
  check('currency inválida (EUR) rechazada (400)', status === 400, `status=${status}`);

  // ── SupplierProduct: netCost + Fix #7 (borrar SP limpia el Unificado) ──
  const sku = 'E2E-SP-TEST';
  const existing = (await call('GET', `/supplier-products?search=${sku}`, { token: TOKEN })).data;
  for (const sp of existing?.data || []) {
    if (sp.supplierSku === sku) await call('DELETE', `/supplier-products/${sp._id}`, { token: TOKEN });
  }
  let sp;
  ({ status, data: sp } = await call('POST', '/supplier-products', { token: TOKEN, body: { supplierId: SUPID, supplierSku: sku, supplierName: 'Test SP', basePrice: 1000, discountPercent: 20, currency: 'ARS' } }));
  check('crear SupplierProduct ok', status === 201, `status=${status}`);
  check('netCost = 1000*(1-0.2) = 800', sp.netCost === 800, `netCost=${sp.netCost}`);
  const SPID = sp._id;

  const usku = 'E2E-UP-TEST';
  const uexisting = (await call('GET', `/unified-products?search=${usku}`, { token: TOKEN })).data;
  for (const up of uexisting?.data || []) {
    if (up.sku === usku) await call('DELETE', `/unified-products/${up._id}`, { token: TOKEN });
  }
  const UPID = (await call('POST', '/unified-products', { token: TOKEN, body: { sku: usku, name: 'Test UP', profitMarginPercent: 50 } })).data._id;
  // select-supplier: supplierProductId va en la URL, no en el body
  let up2;
  ({ status, data: up2 } = await call('POST', `/unified-products/${UPID}/select-supplier/${SPID}`, { token: TOKEN }));
  check('seleccionar supplier ok', status === 200 || status === 201, `status=${status}`);
  check('seleccionar supplier: selectedCost=800', up2.selectedCost === 800, `selectedCost=${up2.selectedCost}`);
  check('salePrice = 800*(1+0.5) = 1200', up2.salePrice === 1200, `salePrice=${up2.salePrice}`);
  const upsel = (await call('GET', `/unified-products/${UPID}`, { token: TOKEN })).data;
  check('selección persistida (selectedSupplierProductId presente)', !!upsel.selectedSupplierProductId, `sel=${upsel.selectedSupplierProductId}`);

  await call('DELETE', `/supplier-products/${SPID}`, { token: TOKEN });
  const up3 = (await call('GET', `/unified-products/${UPID}`, { token: TOKEN })).data;
  check('Fix#7: borrar SP limpia selectedSupplierProductId', !up3.selectedSupplierProductId, `sel=${up3.selectedSupplierProductId}`);
  check('Fix#7: borrar SP resetea selectedCost=0', up3.selectedCost === 0, `cost=${up3.selectedCost}`);
  await call('DELETE', `/unified-products/${UPID}`, { token: TOKEN });

  // ── Scanner: lookup por SKU ──
  ({ status, data } = await call('GET', '/products/by-sku/LED-TIRA-5M', { token: TOKEN }));
  check('lookup by-sku (scanner) devuelve el producto', status === 200 && data.sku === 'LED-TIRA-5M', `status=${status}`);
  ({ status } = await call('GET', '/products/by-sku/NOEXISTE-XYZ', { token: TOKEN }));
  check('lookup by-sku inexistente devuelve 404', status === 404, `status=${status}`);

  summary();
  process.exit(FAIL ? 1 : 0);
}

function summary() {
  const green = (s) => `\x1b[32m${s}\x1b[0m`;
  const red = (s) => `\x1b[31m${s}\x1b[0m`;
  console.log('\n' + '='.repeat(70));
  for (const [status, name, detail] of results) {
    const mark = status === 'PASS' ? green('✓') : red('✗');
    console.log(`${mark} ${name}${status === 'FAIL' ? `   -> ${detail}` : ''}`);
  }
  console.log('='.repeat(70));
  console.log(`TOTAL: ${green(PASS + ' passed')}, ${FAIL ? red(FAIL + ' failed') : '0 failed'}`);
}

main().catch((err) => {
  console.error('Error inesperado en la suite:', err);
  process.exit(1);
});
