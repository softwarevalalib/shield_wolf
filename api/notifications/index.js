import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { requireAuth } from '../../server/middleware/auth.js';
import { json, success, failure } from '../../server/utils/response.js';
import { readJsonBody } from '../../server/utils/request.js';
import { HttpError } from '../../server/utils/errors.js';
import {
  notificationListQuerySchema,
  notificationMarkSchema,
} from '../../server/validators/notifications.js';
import {
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../server/services/notificationService.js';

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
 * GET /api/notifications — current user in-app inbox
 * PATCH /api/notifications — { action: 'read'|'read_all', id? }
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  const auth = await requireAuth(req);
  const userId = auth.user.id;

  if (req.method === 'GET') {
    const query = readQuery(req);
    const parsed = notificationListQuerySchema.safeParse(query);
    if (!parsed.success) {
      const result = failure('Invalid query', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const unreadOnly = parsed.data.unread === 'true' || parsed.data.unread === '1';
    json(
      res,
      200,
      success(
        await listUserNotifications(userId, {
          page: parsed.data.page,
          pageSize: parsed.data.pageSize,
          unreadOnly,
        })
      )
    );
    return;
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const body = await readJsonBody(req);
    const parsed = notificationMarkSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    if (parsed.data.action === 'read_all') {
      json(res, 200, success(await markAllNotificationsRead(userId)));
      return;
    }
    if (!parsed.data.id) {
      const result = failure('Notification id is required', {
        code: 'VALIDATION_ERROR',
        status: 400,
      });
      json(res, result.status, result.body);
      return;
    }
    json(res, 200, success(await markNotificationRead(userId, parsed.data.id)));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
