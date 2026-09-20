import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import { adminDriverWriteSchema } from '../../../server/validators/adminDelivery.js';
import { createDriver, listDrivers } from '../../../server/services/adminDeliveryService.js';

async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    await requireAnyPermission('delivery.view', 'delivery.assign')(req);
    json(res, 200, success(await listDrivers()));
    return;
  }

  if (req.method === 'POST') {
    await requireAnyPermission('delivery.assign', 'delivery.update')(req);
    const body = await readJsonBody(req);
    const parsed = adminDriverWriteSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const driver = await createDriver(parsed.data);
    json(res, 201, success({ driver }));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
