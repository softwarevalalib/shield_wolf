import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAuth } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { getCustomerInvoice } from '../../../server/services/documentService.js';

/**
 * GET /api/account/invoices/:id
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const id = req.params?.id || req.params?.slug || req.query?.id;
  if (!id) {
    const result = failure('Invoice id is required', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  const auth = await requireAuth(req);
  json(res, 200, success(await getCustomerInvoice(auth.user, id)));
}

export default withErrorHandling(handler);
