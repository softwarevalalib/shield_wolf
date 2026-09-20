#!/usr/bin/env node
import { loadEnv } from './loadEnv.js';

loadEnv();

const { runSeeders } = await import('./seeders/index.js');

const force = process.argv.includes('--force');

try {
  const result = await runSeeders({ force });
  if (result.skipped) {
    process.exit(0);
  }
  console.log(`Seed completed (${result.driver}).`);
  process.exit(0);
} catch (error) {
  console.error('Seed failed:', error.message);
  if (process.env.DEBUG) console.error(error);
  process.exit(1);
}
