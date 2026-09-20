import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requirePermission, requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import {
  adminOrderNotesSchema,
  adminOrderStatusSchema,
} from '../../../server/validators/adminOrders.js';
import {
  getAdminOrder,
  updateAdminOrderNotes,
  updateAdminOrderStatus,
} from '../../../server/services/adminOrderService.js';

/**
 * GET   /api/admin/orders/:id
 * PATCH /api/admin/orders/:id  { status?, note? } or { adminNotes? }
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  const id = req.params?.id || req.query?.id;
  if (!id) {
    const result = failure('Order id is required', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  if (req.method === 'GET') {
    await requireAnyPermission('orders.view', 'orders.update')(req);
    const order = await getAdminOrder(id);
    json(res, 200, success({ order }));
    return;
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    await requirePermission('orders.update')(req);
    const body = await readJsonBody(req);

    if (Object.prototype.hasOwnProperty.call(body, 'adminNotes') && body.status == null) {
      const parsed = adminOrderNotesSchema.safeParse(body);
      if (!parsed.success) {
        const result = failure('Validation failed', {
          code: 'VALIDATION_ERROR',
          status: 400,
          details: parsed.error.flatten(),
        });
        json(res, result.status, result.body);
        return;
      }
      const order = await updateAdminOrderNotes(id, parsed.data);
      json(res, 200, success({ order }));
      return;
    }

    if (body.status) {
      const parsed = adminOrderStatusSchema.safeParse(body);
      if (!parsed.success) {
        const result = failure('Validation failed', {
          code: 'VALIDATION_ERROR',
          status: 400,
          details: parsed.error.flatten(),
        });
        json(res, result.status, result.body);
        return;
      }
      const order = await updateAdminOrderStatus(id, {
        ...parsed.data,
        changedBy: req.auth.user.id,
      });
      json(res, 200, success({ order }));
      return;
    }

    throw new HttpError(400, 'Provide status or adminNotes to update', {
      code: 'VALIDATION_ERROR',
    });
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
