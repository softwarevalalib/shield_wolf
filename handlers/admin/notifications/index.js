import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { HttpError } from '../../../server/utils/errors.js';
import { adminNotificationListQuerySchema } from '../../../server/validators/notifications.js';
import { listAdminNotifications } from '../../../server/services/notificationService.js';

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
 * GET /api/admin/notifications — operational notification log
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  await requireAnyPermission('settings.manage', 'content.manage', 'orders.view')(req);

  if (req.method !== 'GET') {
    throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
  }

  const query = readQuery(req);
  const parsed = adminNotificationListQuerySchema.safeParse(query);
  if (!parsed.success) {
    const result = failure('Invalid query', {
      code: 'VALIDATION_ERROR',
      status: 400,
      details: parsed.error.flatten(),
    });
    json(res, result.status, result.body);
    return;
  }

  json(res, 200, success(await listAdminNotifications(parsed.data)));
}

export default withErrorHandling(handler);
