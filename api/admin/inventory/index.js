import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { HttpError } from '../../../server/utils/errors.js';
import { inventoryListQuerySchema } from '../../../server/validators/inventory.js';
import {
  getInventoryDashboard,
  listInventoryLevels,
} from '../../../server/services/inventoryService.js';

function readQuery(req) {
  if (req.query) return req.query;
  try {
    const host = req.headers?.host || 'localhost';
    const url = new URL(req.url || '/', `http://${host}`);
    return Object.fromEntries(url.searchParams.entries());
  } catch {
    return {};
  }
}

/**
 * GET /api/admin/inventory
 * Dashboard summary + stock levels (query: view=summary|levels, default both via levels+summary).
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
  }

  await requireAnyPermission('inventory.view', 'inventory.adjust')(req);

  const query = readQuery(req);
  const view = query.view || 'all';

  if (view === 'summary') {
    const dashboard = await getInventoryDashboard();
    json(res, 200, success(dashboard));
    return;
  }

  const parsed = inventoryListQuerySchema.safeParse(query);
  if (!parsed.success) {
    const result = failure('Invalid query', {
      code: 'VALIDATION_ERROR',
      status: 400,
      details: parsed.error.flatten(),
    });
    json(res, result.status, result.body);
    return;
  }

  const [dashboard, levels] = await Promise.all([
    view === 'levels' ? null : getInventoryDashboard(),
    listInventoryLevels(parsed.data),
  ]);

  json(
    res,
    200,
    success({
      summary: dashboard?.summary || null,
      recentMovements: dashboard?.recentMovements || [],
      ...levels,
    })
  );
}

export default withErrorHandling(handler);
