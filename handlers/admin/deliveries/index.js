import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import {
  adminDeliveryCreateSchema,
  adminDeliveryListQuerySchema,
} from '../../../server/validators/adminDelivery.js';
import {
  createDeliveryFromOrder,
  getDeliveryDashboard,
  listAdminDeliveries,
  listDispatchBoard,
} from '../../../server/services/adminDeliveryService.js';

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
 * GET  /api/admin/deliveries — list or dashboard (?view=dashboard|dispatch)
 * POST /api/admin/deliveries — create from order
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    await requireAnyPermission('delivery.view', 'delivery.assign', 'delivery.update')(req);
    const query = readQuery(req);
    if (query.view === 'dashboard') {
      json(res, 200, success(await getDeliveryDashboard()));
      return;
    }
    if (query.view === 'dispatch') {
      json(res, 200, success(await listDispatchBoard()));
      return;
    }
    const parsed = adminDeliveryListQuerySchema.safeParse(query);
    if (!parsed.success) {
      const result = failure('Invalid query', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    json(res, 200, success(await listAdminDeliveries(parsed.data)));
    return;
  }

  if (req.method === 'POST') {
    await requireAnyPermission('delivery.assign', 'delivery.update')(req);
    const body = await readJsonBody(req);
    const parsed = adminDeliveryCreateSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const data = await createDeliveryFromOrder(parsed.data, { actorId: req.auth.user.id });
    json(res, 201, success(data));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
