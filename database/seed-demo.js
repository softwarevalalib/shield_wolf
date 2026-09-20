#!/usr/bin/env node
import { loadEnv } from '../database/loadEnv.js';

loadEnv();

const { runDemoCatalogSeed } = await import('../database/seeders/demoCatalog.js');

try {
  const result = await runDemoCatalogSeed();
  console.log(
    `Demo catalog seed completed (${result.driver}) — ${result.products} products available.`
  );
  process.exit(0);
} catch (error) {
  console.error('Demo seed failed:', error.message);
  if (process.env.DEBUG) console.error(error);
  process.exit(1);
}
