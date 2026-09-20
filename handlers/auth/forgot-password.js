import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { rateLimit } from '../../server/middleware/rateLimit.js';
import { json, success, failure } from '../../server/utils/response.js';
import { readJsonBody, getClientIp } from '../../server/utils/request.js';
import { parseOrThrow, forgotPasswordSchema } from '../../server/validators/auth.js';
import { requestPasswordReset } from '../../server/services/authService.js';

/**
 * POST /api/auth/forgot-password
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const limit = rateLimit({
    key: `auth:forgot:${getClientIp(req)}`,
    windowMs: 15 * 60 * 1000,
    max: 8,
  });
  if (!limit.allowed) {
    const result = failure('Too many reset requests. Try again later.', {
      code: 'RATE_LIMITED',
      status: 429,
    });
    json(res, result.status, result.body);
    return;
  }

  const body = await readJsonBody(req);
  const input = parseOrThrow(forgotPasswordSchema, body);
  await requestPasswordReset(input.email);
  json(
    res,
    200,
    success({
      message: 'If an account exists for that email, password reset instructions were sent.',
    })
  );
}

export default withErrorHandling(handler);
