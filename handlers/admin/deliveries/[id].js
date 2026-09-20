import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import { adminDeliveryUpdateSchema } from '../../../server/validators/adminDelivery.js';
import {
  getAdminDelivery,
  updateAdminDelivery,
} from '../../../server/services/adminDeliveryService.js';

/**
 * GET/PATCH /api/admin/deliveries/:id
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  const id = req.params?.id || req.query?.id;
  if (!id) {
    const result = failure('Delivery id is required', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  if (req.method === 'GET') {
    await requireAnyPermission('delivery.view', 'delivery.update')(req);
    json(res, 200, success(await getAdminDelivery(id)));
    return;
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    await requireAnyPermission('delivery.update', 'delivery.assign')(req);
    const body = await readJsonBody(req);
    const parsed = adminDeliveryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const data = await updateAdminDelivery(id, parsed.data, { actorId: req.auth.user.id });
    json(res, 200, success(data));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
