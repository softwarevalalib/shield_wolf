import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { rateLimit } from '../../server/middleware/rateLimit.js';
import { json, success, failure } from '../../server/utils/response.js';
import { readJsonBody, getClientIp } from '../../server/utils/request.js';
import { parseTrackOrder } from '../../server/validators/orders.js';
import { trackOrderByNumberAndPhone } from '../../server/services/orderService.js';

/**
 * POST /api/orders/track
 * Public order tracking — order number + phone verification.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const limit = rateLimit({
    key: `orders-track:${getClientIp(req)}`,
    windowMs: 15 * 60 * 1000,
    max: 30,
  });
  if (!limit.allowed) {
    const result = failure('Too many tracking attempts. Try again later.', {
      code: 'RATE_LIMITED',
      status: 429,
    });
    json(res, result.status, result.body);
    return;
  }

  const body = await readJsonBody(req);
  const input = parseTrackOrder(body);
  const order = await trackOrderByNumberAndPhone(input.orderNumber, input.phone);
  json(res, 200, success({ order }));
}

export default withErrorHandling(handler);
