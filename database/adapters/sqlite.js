import fs from 'node:fs';
import path from 'node:path';

/**
 * SQLite adapter for local development only.
 * Requires optional dependency: better-sqlite3
 *
 * Loaded lazily so Neon/Postgres production deploys do not need native bindings.
 * Never sync automatically with PostgreSQL.
 */
export async function createSqliteAdapter(sqlitePath) {
  const resolved = path.resolve(sqlitePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  let BetterSqlite3;
  try {
    BetterSqlite3 = (await import('better-sqlite3')).default;
  } catch {
    throw new Error(
      'SQLite driver requested but better-sqlite3 is not installed. Run `npm install better-sqlite3` for local development, or set DB_DRIVER=postgres with DATABASE_URL.'
    );
  }

  const db = new BetterSqlite3(resolved);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Cache prepared statements — recreating+GC'ing Statement objects crashes on
  // some Node 24 + better-sqlite3 combinations during V8 weak-callback cleanup.
  const statementCache = new Map();
  function prepare(text) {
    let statement = statementCache.get(text);
    if (!statement) {
      statement = db.prepare(text);
      statementCache.set(text, statement);
    }
    return statement;
  }

  return {
    driver: 'sqlite',
    db,
    async query(text, params = []) {
      const trimmed = text.trim().toLowerCase();
      const statement = prepare(text);
      if (trimmed.startsWith('select') || trimmed.startsWith('pragma')) {
        const rows = statement.all(...params);
        return { rows, rowCount: rows.length };
      }
      const info = statement.run(...params);
      return { rows: [], rowCount: info.changes, lastInsertRowid: info.lastInsertRowid };
    },
    async exec(sql) {
      db.exec(sql);
    },
    async healthCheck() {
      prepare('select 1 as ok').get();
      return true;
    },
    async withTransaction(fn) {
      // Manual BEGIN/COMMIT so async migration/seed work is supported.
      // better-sqlite3's db.transaction() cannot return promises.
      db.exec('BEGIN');
      try {
        const result = await fn(db);
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    async close() {
      statementCache.clear();
      db.close();
    },
  };
}
