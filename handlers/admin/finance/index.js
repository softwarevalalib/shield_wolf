import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { HttpError } from '../../../server/utils/errors.js';
import {
  getFinanceDashboard,
  getFinanceSales,
} from '../../../server/services/adminFinanceService.js';

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
 * GET /api/admin/finance?view=dashboard|sales&range=…
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
  }

  await requireAnyPermission('finance.view', 'reports.view')(req);
  const query = readQuery(req);
  const view = query.view || 'dashboard';

  if (view === 'sales') {
    json(res, 200, success(await getFinanceSales(query)));
    return;
  }

  if (view !== 'dashboard') {
    const result = failure('Unknown view', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  json(res, 200, success(await getFinanceDashboard(query)));
}

export default withErrorHandling(handler);
