#!/usr/bin/env node
import { loadEnv } from './loadEnv.js';

loadEnv();

const { runMigrations, listMigrationStatus } = await import('./migrator.js');

const args = process.argv.slice(2);
const statusOnly = args.includes('--status');

try {
  if (statusOnly) {
    const status = await listMigrationStatus();
    console.log(JSON.stringify(status, null, 2));
  } else {
    const result = await runMigrations();
    if (result.applied.length === 0) {
      console.log(`No pending migrations (${result.driver}). ${result.total} total.`);
    } else {
      console.log(
        `Applied ${result.applied.length} migration(s) on ${result.driver}: ${result.applied.join(', ')}`
      );
    }
  }
  process.exit(0);
} catch (error) {
  console.error('Migration failed:', error.message);
  if (process.env.DEBUG) console.error(error);
  process.exit(1);
}
