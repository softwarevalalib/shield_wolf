import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { json, success, failure } from '../../server/utils/response.js';
import { listActiveDeliveryZones } from '../../server/services/checkoutService.js';

/**
 * GET /api/delivery-zones
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const zones = await listActiveDeliveryZones();
  json(res, 200, success({ zones }));
}

export default withErrorHandling(handler);
