import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAuth } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { getOrderForUser } from '../../../server/services/orderService.js';

/**
 * GET /api/account/orders/:slug
 * Authenticated customer's order detail.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const auth = await requireAuth(req);
  const key = req.params?.slug || req.params?.id;
  const order = await getOrderForUser(auth.user, key);
  json(res, 200, success({ order }));
}

export default withErrorHandling(handler);
