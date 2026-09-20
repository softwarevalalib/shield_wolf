import { serverEnv } from '../server/config/env.js';

/**
 * Database driver abstraction.
 *
 * Production source of truth: Neon PostgreSQL (via DATABASE_URL).
 * Local development: SQLite when DB_DRIVER=sqlite.
 *
 * IMPORTANT: Do NOT implement automatic bidirectional sync between SQLite
 * and PostgreSQL. Migrations and seeders are applied per environment.
 */

let activeAdapter = null;

/**
 * Resolve the active database driver.
 * @param {{ driver?: string, databaseUrl?: string }} [override]
 */
export function resolveDbDriver(override = {}) {
  const driver = String(override.driver ?? serverEnv.dbDriver ?? '').toLowerCase();
  const databaseUrl = override.databaseUrl ?? serverEnv.databaseUrl;

  if (driver === 'postgres' || driver === 'postgresql' || driver === 'neon') {
    return 'postgres';
  }
  if (driver === 'sqlite') {
    return 'sqlite';
  }
  // Unspecified driver: prefer Neon/Postgres when DATABASE_URL is present
  // (typical Vercel production config).
  if (databaseUrl) {
    return 'postgres';
  }
  return 'sqlite';
}

export function getDbDriver() {
  return resolveDbDriver();
}

export async function getDatabase() {
  if (activeAdapter) return activeAdapter;

  const driver = getDbDriver();

  if (driver === 'postgres') {
    if (!serverEnv.databaseUrl) {
      throw new Error('DATABASE_URL is required when DB_DRIVER is postgres/neon');
    }
    const { createPostgresAdapter } = await import('./adapters/postgres.js');
    activeAdapter = await createPostgresAdapter(serverEnv.databaseUrl);
    return activeAdapter;
  }

  const { createSqliteAdapter } = await import('./adapters/sqlite.js');
  activeAdapter = await createSqliteAdapter(serverEnv.sqlitePath);
  return activeAdapter;
}

export async function healthCheckDatabase() {
  try {
    const db = await getDatabase();
    await db.healthCheck();
    return { ok: true, driver: getDbDriver() };
  } catch (error) {
    return {
      ok: false,
      driver: getDbDriver(),
      error: error.message,
    };
  }
}

export function resetDatabaseAdapterForTests() {
  activeAdapter = null;
}
