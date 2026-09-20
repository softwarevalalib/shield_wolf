import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import { adminZoneWriteSchema } from '../../../server/validators/adminDelivery.js';
import {
  softDeleteAdminZone,
  updateAdminZone,
} from '../../../server/services/adminDeliveryService.js';

async function handler(req, res) {
  if (applyCors(req, res)) return;
  const id = req.params?.id || req.query?.id;
  if (!id) {
    const result = failure('Zone id is required', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    await requireAnyPermission('settings.manage', 'delivery.update')(req);
    const body = await readJsonBody(req);
    const parsed = adminZoneWriteSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const zone = await updateAdminZone(id, parsed.data);
    json(res, 200, success({ zone }));
    return;
  }

  if (req.method === 'DELETE') {
    await requireAnyPermission('settings.manage', 'delivery.update')(req);
    json(res, 200, success(await softDeleteAdminZone(id)));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
