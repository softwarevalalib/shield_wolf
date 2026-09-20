import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAuth } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { parseAddress } from '../../../server/validators/account.js';
import {
  listCustomerAddresses,
  createCustomerAddress,
} from '../../../server/services/customerAccountService.js';

/**
 * GET/POST /api/account/addresses
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  const auth = await requireAuth(req);

  if (req.method === 'GET') {
    const addresses = await listCustomerAddresses(auth.user);
    json(res, 200, success({ addresses }));
    return;
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const input = parseAddress(body);
    const address = await createCustomerAddress(auth.user, input);
    json(res, 201, success({ address }));
    return;
  }

  const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
  json(res, result.status, result.body);
}

export default withErrorHandling(handler);
