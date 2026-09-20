import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { rateLimit, applyRateLimitHeaders } from '../../server/middleware/rateLimit.js';
import { json, success, failure } from '../../server/utils/response.js';
import { readJsonBody, getClientIp } from '../../server/utils/request.js';
import { parseOrThrow, loginSchema } from '../../server/validators/auth.js';
import { loginUser } from '../../server/services/authService.js';

/**
 * POST /api/auth/login
 * Customer and staff share login; admin UI access is role-gated.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const limit = rateLimit({
    key: `auth:login:${getClientIp(req)}`,
    windowMs: 15 * 60 * 1000,
    max: 20,
  });
  applyRateLimitHeaders(res, limit);
  if (!limit.allowed) {
    const result = failure('Too many login attempts. Try again later.', {
      code: 'RATE_LIMITED',
      status: 429,
    });
    json(res, result.status, result.body);
    return;
  }

  const body = await readJsonBody(req);
  const input = parseOrThrow(loginSchema, body);
  const result = await loginUser(input.identifier, input.password);
  json(res, 200, success(result));
}

export default withErrorHandling(handler);
