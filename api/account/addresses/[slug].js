import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAuth } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { parseAddress } from '../../../server/validators/account.js';
import {
  updateCustomerAddress,
  deleteCustomerAddress,
} from '../../../server/services/customerAccountService.js';

/**
 * PATCH/DELETE /api/account/addresses/:slug
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  const auth = await requireAuth(req);
  const id = req.params?.slug || req.params?.id;
  if (!id) {
    const result = failure('Address id is required', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const body = await readJsonBody(req);
    const input = parseAddress(body);
    const address = await updateCustomerAddress(auth.user, id, input);
    json(res, 200, success({ address }));
    return;
  }

  if (req.method === 'DELETE') {
    const result = await deleteCustomerAddress(auth.user, id);
    json(res, 200, success(result));
    return;
  }

  const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
  json(res, result.status, result.body);
}

export default withErrorHandling(handler);
