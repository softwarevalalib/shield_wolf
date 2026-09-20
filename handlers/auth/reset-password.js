import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { rateLimit } from '../../server/middleware/rateLimit.js';
import { json, success, failure } from '../../server/utils/response.js';
import { readJsonBody, getClientIp } from '../../server/utils/request.js';
import { parseOrThrow, resetPasswordSchema } from '../../server/validators/auth.js';
import { resetPassword } from '../../server/services/authService.js';

/**
 * POST /api/auth/reset-password
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const limit = rateLimit({
    key: `auth:reset:${getClientIp(req)}`,
    windowMs: 15 * 60 * 1000,
    max: 10,
  });
  if (!limit.allowed) {
    const result = failure('Too many reset attempts. Try again later.', {
      code: 'RATE_LIMITED',
      status: 429,
    });
    json(res, result.status, result.body);
    return;
  }

  const body = await readJsonBody(req);
  const input = parseOrThrow(resetPasswordSchema, body);
  await resetPassword(input.token, input.password);
  json(res, 200, success({ message: 'Password updated. You can sign in with your new password.' }));
}

export default withErrorHandling(handler);
