import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { json, success, failure } from '../../server/utils/response.js';
import { getPublicPaymentConfig } from '../../server/services/paymentService.js';

/**
 * GET /api/payments/methods
 * Public payment method + instruction configuration.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const config = await getPublicPaymentConfig();
  json(res, 200, success(config));
}

export default withErrorHandling(handler);
