import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { rateLimit } from '../../server/middleware/rateLimit.js';
import { json, success, failure } from '../../server/utils/response.js';
import { readJsonBody, getClientIp } from '../../server/utils/request.js';
import { getBearerToken } from '../../server/middleware/authHelpers.js';
import { parseCheckout } from '../../server/validators/checkout.js';
import { createCheckoutOrder } from '../../server/services/checkoutService.js';

/**
 * POST /api/checkout
 * Guest or authenticated checkout. Totals recalculated server-side.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const limit = rateLimit({
    key: `checkout:${getClientIp(req)}`,
    windowMs: 15 * 60 * 1000,
    max: 20,
  });
  if (!limit.allowed) {
    const result = failure('Too many checkout attempts. Try again later.', {
      code: 'RATE_LIMITED',
      status: 429,
    });
    json(res, result.status, result.body);
    return;
  }

  const body = await readJsonBody(req);
  const input = parseCheckout(body);
  const idempotencyKey =
    req.headers['idempotency-key'] || req.headers['Idempotency-Key'] || input.idempotencyKey;

  const order = await createCheckoutOrder({
    items: input.items,
    customer: input.customer,
    delivery: input.delivery,
    paymentMethod: input.paymentMethod,
    idempotencyKey,
    accessToken: getBearerToken(req),
  });

  json(res, 201, success({ order }));
}

export default withErrorHandling(handler);
