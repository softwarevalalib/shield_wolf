import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getDatabase, getDbDriver, resetDatabaseAdapterForTests } from './connection.js';
import { isPostgres, toDriverSql } from './dialect.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(db, driver) {
  const sql = isPostgres(driver)
    ? `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    : `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `;

  await db.exec(sql);
}

async function getAppliedMigrations(db) {
  const result = await db.query('SELECT id FROM schema_migrations ORDER BY id ASC');
  return new Set((result.rows || []).map((row) => row.id));
}

async function loadMigrationModules() {
  const entries = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d+_.+\.js$/.test(file))
    .sort();

  const modules = [];
  for (const file of entries) {
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const mod = await import(pathToFileURL(fullPath).href);
    if (typeof mod.up !== 'function') {
      throw new Error(`Migration ${file} must export an async up(db, driver) function`);
    }
    modules.push({
      id: file.replace(/\.js$/, ''),
      name: file,
      up: mod.up,
      down: mod.down,
    });
  }
  return modules;
}

/**
 * Apply pending migrations for the active DB_DRIVER environment.
 */
export async function runMigrations({ direction = 'up' } = {}) {
  const driver = getDbDriver();
  const db = await getDatabase();

  try {
    await ensureMigrationsTable(db, driver);
    const applied = await getAppliedMigrations(db);
    const migrations = await loadMigrationModules();

    if (direction === 'down') {
      throw new Error('Down migrations are not enabled by default. Use targeted rollback scripts.');
    }

    const pending = migrations.filter((migration) => !applied.has(migration.id));
    const appliedNow = [];

    for (const migration of pending) {
      await db.withTransaction(async (tx) => {
        const client = wrapTx(db, tx, driver);
        await migration.up(client, driver);
        await client.query(
          toDriverSql(driver, 'INSERT INTO schema_migrations (id, name) VALUES (?, ?)'),
          [migration.id, migration.name]
        );
      });
      appliedNow.push(migration.id);
      console.log(`✓ Applied ${migration.id}`);
    }

    return {
      driver,
      applied: appliedNow,
      pendingCount: pending.length,
      total: migrations.length,
    };
  } finally {
    await db.close();
    resetDatabaseAdapterForTests();
  }
}

function wrapTx(db, tx, driver) {
  // Postgres transaction receives a pg Client; SQLite receives better-sqlite3 Database.
  if (driver === 'postgres' && tx && typeof tx.query === 'function' && !tx.exec) {
    return {
      driver,
      async query(text, params = []) {
        return tx.query(text, params);
      },
      async exec(sql) {
        await tx.query(sql);
      },
    };
  }

  if (driver === 'sqlite' && tx && typeof tx.prepare === 'function') {
    return {
      driver,
      async query(text, params = []) {
        const trimmed = text.trim().toLowerCase();
        const statement = tx.prepare(text);
        if (trimmed.startsWith('select') || trimmed.startsWith('pragma')) {
          const rows = statement.all(...params);
          return { rows, rowCount: rows.length };
        }
        const info = statement.run(...params);
        return { rows: [], rowCount: info.changes, lastInsertRowid: info.lastInsertRowid };
      },
      async exec(sql) {
        tx.exec(sql);
      },
    };
  }

  // Fallback: use adapter directly (already transactional context in some drivers)
  return db;
}

export async function listMigrationStatus() {
  const driver = getDbDriver();
  const db = await getDatabase();
  try {
    await ensureMigrationsTable(db, driver);
    const applied = await getAppliedMigrations(db);
    const migrations = await loadMigrationModules();
    return migrations.map((migration) => ({
      id: migration.id,
      name: migration.name,
      applied: applied.has(migration.id),
    }));
  } finally {
    await db.close();
    resetDatabaseAdapterForTests();
  }
}
