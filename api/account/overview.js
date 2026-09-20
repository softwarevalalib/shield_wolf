import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { requireAuth } from '../../server/middleware/auth.js';
import { json, success, failure } from '../../server/utils/response.js';
import { getCustomerOverview } from '../../server/services/customerAccountService.js';

/**
 * GET /api/account/overview
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const auth = await requireAuth(req);
  const overview = await getCustomerOverview(auth.user);
  json(res, 200, success({ overview }));
}

export default withErrorHandling(handler);
