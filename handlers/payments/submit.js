import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { rateLimit } from '../../server/middleware/rateLimit.js';
import { json, success, failure } from '../../server/utils/response.js';
import { readJsonBody, getClientIp } from '../../server/utils/request.js';
import { getBearerToken } from '../../server/middleware/authHelpers.js';
import { parsePaymentSubmit } from '../../server/validators/payments.js';
import { submitManualPayment } from '../../server/services/paymentService.js';

/**
 * POST /api/payments/submit
 * Customer submits Mobile Money reference / evidence for manual verification.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const limit = rateLimit({
    key: `payments-submit:${getClientIp(req)}`,
    windowMs: 15 * 60 * 1000,
    max: 30,
  });
  if (!limit.allowed) {
    const result = failure('Too many payment submissions. Try again later.', {
      code: 'RATE_LIMITED',
      status: 429,
    });
    json(res, result.status, result.body);
    return;
  }

  const body = await readJsonBody(req);
  const forbidden = ['pin', 'otp', 'password', 'passcode', 'momoPin', 'secret'];
  if (forbidden.some((key) => body?.[key] != null && body[key] !== '')) {
    const result = failure('Never submit PINs, OTPs, or passwords.', {
      code: 'FORBIDDEN_FIELD',
      status: 400,
    });
    json(res, result.status, result.body);
    return;
  }

  const input = parsePaymentSubmit(body);
  const result = await submitManualPayment({
    ...input,
    accessToken: getBearerToken(req),
  });

  json(res, 200, success(result));
}

export default withErrorHandling(handler);
