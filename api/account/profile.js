import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { requireAuth } from '../../server/middleware/auth.js';
import { json, success, failure } from '../../server/utils/response.js';
import { readJsonBody } from '../../server/utils/request.js';
import { parseProfileUpdate } from '../../server/validators/account.js';
import { updateCustomerProfile } from '../../server/services/customerAccountService.js';

/**
 * GET/PATCH /api/account/profile
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  const auth = await requireAuth(req);

  if (req.method === 'GET') {
    json(res, 200, success({ user: auth.user }));
    return;
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const body = await readJsonBody(req);
    const input = parseProfileUpdate(body);
    const user = await updateCustomerProfile(auth.user, input);
    json(res, 200, success({ user }));
    return;
  }

  const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
  json(res, result.status, result.body);
}

export default withErrorHandling(handler);
