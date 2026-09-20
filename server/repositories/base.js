import { getDatabase } from '../../database/connection.js';
import { toDriverSql } from '../../database/dialect.js';

/**
 * Thin repository helper for server-side data access.
 * Feature repositories in later phases should use this (or extend it).
 */
export async function query(sql, params = []) {
  const db = await getDatabase();
  const driver = db.driver;
  return db.query(toDriverSql(driver, sql), params);
}

export async function withTransaction(fn) {
  const db = await getDatabase();
  return db.withTransaction(async (tx) => {
    const client =
      db.driver === 'postgres'
        ? {
            driver: db.driver,
            query: (text, params = []) => tx.query(toDriverSql(db.driver, text), params),
          }
        : {
            driver: db.driver,
            query: async (text, params = []) => {
              const driverSql = toDriverSql(db.driver, text);
              const trimmed = driverSql.trim().toLowerCase();
              const statement = tx.prepare(driverSql);
              if (trimmed.startsWith('select') || trimmed.startsWith('pragma')) {
                const rows = statement.all(...params);
                return { rows, rowCount: rows.length };
              }
              const info = statement.run(...params);
              return { rows: [], rowCount: info.changes, lastInsertRowid: info.lastInsertRowid };
            },
          };

    return fn(client, db.driver);
  });
}
