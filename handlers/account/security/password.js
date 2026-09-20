import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAuth } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { parsePasswordChange } from '../../../server/validators/account.js';
import { changeCustomerPassword } from '../../../server/services/customerAccountService.js';

/**
 * POST /api/account/security/password
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const auth = await requireAuth(req);
  const body = await readJsonBody(req);
  const input = parsePasswordChange(body);
  const result = await changeCustomerPassword(auth.user, input);
  json(res, 200, success(result));
}

export default withErrorHandling(handler);
