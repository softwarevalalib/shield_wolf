import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { json, success } from '../../server/utils/response.js';
import { healthCheckDatabase, getDbDriver, getDatabase } from '../../database/connection.js';
import { serverEnv } from '../../server/config/env.js';

/**
 * GET /api/health
 * Architecture health probe — no business data.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    json(res, 405, { success: false, message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const db = await healthCheckDatabase();
  let migrationsApplied = null;

  if (db.ok) {
    try {
      const database = await getDatabase();
      const result = await database.query('SELECT COUNT(*) AS count FROM schema_migrations');
      migrationsApplied = Number(result.rows?.[0]?.count ?? 0);
    } catch {
      migrationsApplied = 0;
    }
  }

  json(
    res,
    db.ok ? 200 : 503,
    success({
      service: 'shield-wolf-api',
      status: db.ok ? 'ok' : 'degraded',
      phase: 31,
      environment: serverEnv.nodeEnv,
      database: {
        driver: getDbDriver(),
        connected: db.ok,
        migrationsApplied,
        error: db.ok ? null : db.error,
      },
      timestamp: new Date().toISOString(),
    })
  );
}

export default withErrorHandling(handler);
