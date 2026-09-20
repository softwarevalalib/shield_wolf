#!/usr/bin/env node
/**
 * Reset local SQLite database, then migrate + seed.
 * Refuses to run against Postgres/Neon.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from './loadEnv.js';

loadEnv();

const driver = (process.env.DB_DRIVER || 'sqlite').toLowerCase();
if (driver === 'postgres' || driver === 'postgresql' || driver === 'neon') {
  console.error('db:reset is only allowed for local SQLite. Refusing Postgres/Neon reset.');
  process.exit(1);
}

const sqlitePath = path.resolve(process.env.SQLITE_PATH || './database/local/shield_wolf.sqlite');
for (const file of [sqlitePath, `${sqlitePath}-wal`, `${sqlitePath}-shm`]) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}
console.log(`Removed ${sqlitePath}`);

const { runMigrations } = await import('./migrator.js');
const { runSeeders } = await import('./seeders/index.js');

await runMigrations();
await runSeeders({ force: true });
console.log('Local SQLite reset, migrated, and seeded.');
