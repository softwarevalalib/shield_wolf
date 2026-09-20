import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { json, success, failure } from '../../server/utils/response.js';
import { getOrderPublicWithTimeline } from '../../server/services/orderService.js';

/**
 * GET /api/orders/:slug  (order id or order number)
 * Public confirmation lookup — no sensitive internals.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const key = req.params?.slug || req.params?.id || req.query?.order;
  if (!key) {
    const result = failure('Order reference is required', {
      code: 'VALIDATION_ERROR',
      status: 400,
    });
    json(res, result.status, result.body);
    return;
  }

  const order = await getOrderPublicWithTimeline(key);
  json(res, 200, success({ order }));
}

export default withErrorHandling(handler);
