import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { requireAdmin } from '../../server/middleware/auth.js';
import { json, success, failure } from '../../server/utils/response.js';
import { getAdminDashboardOverview } from '../../server/services/adminDashboardService.js';
import { HttpError } from '../../server/utils/errors.js';

/**
 * GET /api/admin/dashboard
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  try {
    await requireAdmin(req);
    const data = await getAdminDashboardOverview();
    json(res, 200, success(data));
  } catch (error) {
    if (error instanceof HttpError) {
      const result = failure(error.message, {
        code: error.code,
        status: error.status,
        details: error.details,
      });
      json(res, result.status, result.body);
      return;
    }
    throw error;
  }
}

export default withErrorHandling(handler);
