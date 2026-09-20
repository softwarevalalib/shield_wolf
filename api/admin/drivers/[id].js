import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import { adminDriverWriteSchema } from '../../../server/validators/adminDelivery.js';
import { softDeleteDriver, updateDriver } from '../../../server/services/adminDeliveryService.js';

async function handler(req, res) {
  if (applyCors(req, res)) return;
  const id = req.params?.id || req.query?.id;
  if (!id) {
    const result = failure('Driver id is required', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
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
    const driver = await updateDriver(id, parsed.data);
    json(res, 200, success({ driver }));
    return;
  }

  if (req.method === 'DELETE') {
    await requireAnyPermission('delivery.assign', 'delivery.update')(req);
    json(res, 200, success(await softDeleteDriver(id)));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
