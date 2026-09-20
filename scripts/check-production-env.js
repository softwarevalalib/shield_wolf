/**
 * Validate production environment variables before deploy.
 * Does not print secret values.
 *
 * Usage: node scripts/check-production-env.js
 * Exit 0 when required vars look set; exit 1 otherwise.
 */
import { loadEnv } from '../database/loadEnv.js';

loadEnv();

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'APP_URL', 'CORS_ORIGIN'];

const RECOMMENDED = ['DB_DRIVER', 'VITE_API_URL', 'VITE_APP_URL', 'EMAIL_FROM', 'MEDIA_PROVIDER'];

const FORBIDDEN_DEFAULTS = {
  JWT_SECRET: ['change-me-to-a-long-random-secret', 'dev-only-jwt-secret'],
  SEED_ADMIN_PASSWORD: ['ChangeMeNow!123'],
};

function present(name) {
  const value = process.env[name];
  return Boolean(value && String(value).trim());
}

const missing = REQUIRED.filter((name) => !present(name));
const weak = [];

for (const [name, badValues] of Object.entries(FORBIDDEN_DEFAULTS)) {
  const value = process.env[name];
  if (value && badValues.includes(value)) {
    weak.push(name);
  }
}

const dbDriver = (process.env.DB_DRIVER || '').toLowerCase();
if (present('DATABASE_URL') && dbDriver === 'sqlite') {
  weak.push('DB_DRIVER=sqlite (use postgres/neon, or omit DB_DRIVER when DATABASE_URL is set)');
} else if (
  present('DATABASE_URL') &&
  dbDriver &&
  dbDriver !== 'postgres' &&
  dbDriver !== 'postgresql' &&
  dbDriver !== 'neon'
) {
  weak.push('DB_DRIVER (expected postgres/neon for production)');
}

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED_ADMIN === 'true') {
  weak.push('ALLOW_PROD_SEED_ADMIN (should be false in production)');
}

console.log('Shield Wolf production env check');
console.log('--------------------------------');
for (const name of REQUIRED) {
  console.log(`${present(name) ? '✓' : '✗'} ${name}`);
}
for (const name of RECOMMENDED) {
  console.log(`${present(name) ? '·' : ' '} ${name} (recommended)`);
}

if (missing.length) {
  console.error(`\nMissing required: ${missing.join(', ')}`);
}
if (weak.length) {
  console.error(`\nUnsafe / non-production values: ${weak.join(', ')}`);
}

if (missing.length || weak.length) {
  process.exit(1);
}

console.log('\nAll required production environment checks passed.');
