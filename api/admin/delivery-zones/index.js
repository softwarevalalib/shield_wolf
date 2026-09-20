import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import { adminZoneWriteSchema } from '../../../server/validators/adminDelivery.js';
import { createAdminZone, listAdminZones } from '../../../server/services/adminDeliveryService.js';

/**
 * GET/POST /api/admin/delivery-zones
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    await requireAnyPermission('delivery.view', 'settings.manage')(req);
    json(res, 200, success(await listAdminZones()));
    return;
  }

  if (req.method === 'POST') {
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
    const zone = await createAdminZone(parsed.data);
    json(res, 201, success({ zone }));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
