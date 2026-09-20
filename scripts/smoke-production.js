/**
 * Production / staging smoke checks against a live base URL.
 *
 * Usage:
 *   BASE_URL=https://your-app.vercel.app node scripts/smoke-production.js
 *   npm run qa:smoke -- --base=http://127.0.0.1:3000
 *
 * Exit 0 when all automated probes pass; exit 1 on failure.
 * Prints the Phase 31 manual acceptance checklist afterward.
 */
import { loadEnv } from '../database/loadEnv.js';

loadEnv();

function parseArgs(argv) {
  const out = { base: process.env.BASE_URL || process.env.APP_URL || 'http://127.0.0.1:3000' };
  for (const arg of argv) {
    if (arg.startsWith('--base=')) out.base = arg.slice('--base='.length);
  }
  return out;
}

const { base } = parseArgs(process.argv.slice(2));
const apiRoot = `${base.replace(/\/$/, '')}/api`;

const MANUAL_CHECKLIST = [
  'Frontend deploys successfully on Vercel',
  'Production APIs work',
  'Neon database connects securely',
  'Migrations complete',
  'Authentication works (customer + admin)',
  'Admin authorization / RBAC works',
  'Products can be created from admin',
  'Admin-created products appear on storefront',
  'Inventory updates correctly',
  'Cart works',
  'Checkout works',
  'Orders persist',
  'Payments can be recorded/verified',
  'Delivery can be assigned and tracked',
  'Invoices work',
  'Receipts work',
  'Finance dashboard uses real data',
  'Reports work',
  'Mobile layout works',
  'Accessibility checks pass',
  'No secrets are committed',
  'No critical console errors',
  'No broken routes',
  'No production pages rely on fake/mock data',
];

async function probe(name, path, { expectStatus = [200], requireSuccess = true } = {}) {
  const url = `${apiRoot}${path}`;
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      redirect: 'manual',
    });
    const ms = Date.now() - started;
    let body = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await response.json();
    }
    const statusOk = expectStatus.includes(response.status);
    const successOk = !requireSuccess || body?.success === true;
    const ok = statusOk && successOk;
    return {
      name,
      ok,
      status: response.status,
      ms,
      detail: ok
        ? 'ok'
        : `status=${response.status} success=${body?.success} expected=${expectStatus.join('|')}`,
      body,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      status: 0,
      ms: Date.now() - started,
      detail: error.message,
      body: null,
    };
  }
}

const checks = [
  await probe('health', '/health'),
  await probe('public settings', '/settings/public'),
  await probe('categories', '/categories'),
  await probe('products', '/products'),
  await probe('payment methods', '/payments/methods'),
  await probe('delivery zones', '/delivery-zones'),
  await probe('admin me (unauth)', '/admin/me', {
    expectStatus: [401, 403],
    requireSuccess: false,
  }),
  await probe('auth me (unauth)', '/auth/me', {
    expectStatus: [401, 403],
    requireSuccess: false,
  }),
];

console.log(`Shield Wolf smoke — ${apiRoot}`);
console.log('--------------------------------');

let failed = 0;
for (const result of checks) {
  const mark = result.ok ? '✓' : '✗';
  console.log(
    `${mark} ${result.name} (${result.status || 'err'}, ${result.ms}ms) ${result.ok ? '' : result.detail}`
  );
  if (!result.ok) failed += 1;
}

const health = checks[0];
if (health?.ok && health.body?.data) {
  const data = health.body.data;
  console.log('\nHealth summary');
  console.log(`  phase: ${data.phase}`);
  console.log(`  status: ${data.status}`);
  console.log(`  environment: ${data.environment}`);
  console.log(`  database.driver: ${data.database?.driver}`);
  console.log(`  database.connected: ${data.database?.connected}`);
  console.log(`  migrationsApplied: ${data.database?.migrationsApplied}`);

  if (data.database && data.database.connected === false) {
    failed += 1;
    console.error('✗ database not connected');
  }
  if (typeof data.database?.migrationsApplied === 'number' && data.database.migrationsApplied < 1) {
    failed += 1;
    console.error('✗ no migrations applied');
  }
  if (typeof data.phase === 'number' && data.phase < 31) {
    console.warn(`  note: health phase is ${data.phase} (expected ≥ 31 after deploy)`);
  }
}

console.log('\nPhase 31 — manual acceptance checklist');
for (const item of MANUAL_CHECKLIST) {
  console.log(`  [ ] ${item}`);
}

if (failed > 0) {
  console.error(`\nSmoke failed: ${failed} check(s)`);
  process.exit(1);
}

console.log('\nAutomated smoke checks passed.');
