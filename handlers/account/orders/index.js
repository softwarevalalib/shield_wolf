import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAuth } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { listOrdersForUser } from '../../../server/services/orderService.js';

/**
 * GET /api/account/orders
 * Authenticated customer's order history.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const auth = await requireAuth(req);
  const page = Number(req.query?.page || 1);
  const pageSize = Number(req.query?.pageSize || 10);
  const result = await listOrdersForUser(auth.user, { page, pageSize });
  json(res, 200, success(result));
}

export default withErrorHandling(handler);
