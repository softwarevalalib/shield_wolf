import pg from 'pg';

/**
 * Neon / PostgreSQL adapter.
 * Production source of truth.
 */
export async function createPostgresAdapter(connectionString) {
  const pool = new pg.Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });

  return {
    driver: 'postgres',
    pool,
    async query(text, params = []) {
      return pool.query(text, params);
    },
    async exec(sql) {
      await pool.query(sql);
    },
    async healthCheck() {
      await pool.query('select 1 as ok');
      return true;
    },
    async withTransaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}
