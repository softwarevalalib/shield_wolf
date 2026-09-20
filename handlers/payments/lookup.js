import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { rateLimit } from '../../server/middleware/rateLimit.js';
import { json, success, failure } from '../../server/utils/response.js';
import { readJsonBody, getClientIp } from '../../server/utils/request.js';
import { getBearerToken } from '../../server/middleware/authHelpers.js';
import { parsePaymentLookup } from '../../server/validators/payments.js';
import { getPaymentByOrderNumber } from '../../server/services/paymentService.js';

/**
 * POST /api/payments/lookup
 * Look up payment status for an order (auth or matching phone).
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const limit = rateLimit({
    key: `payments-lookup:${getClientIp(req)}`,
    windowMs: 15 * 60 * 1000,
    max: 40,
  });
  if (!limit.allowed) {
    const result = failure('Too many requests. Try again later.', {
      code: 'RATE_LIMITED',
      status: 429,
    });
    json(res, result.status, result.body);
    return;
  }

  const body = await readJsonBody(req);
  const input = parsePaymentLookup(body);
  const result = await getPaymentByOrderNumber(input.orderNumber, {
    phone: input.phone,
    accessToken: getBearerToken(req),
  });

  json(res, 200, success(result));
}

export default withErrorHandling(handler);
