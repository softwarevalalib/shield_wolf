import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import { getTransaction, voidTransaction } from '../../../server/services/ledgerService.js';

/**
 * GET/PATCH /api/admin/transactions/:id
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  const id = req.params?.id || req.query?.id;
  if (!id) {
    const result = failure('Transaction id is required', {
      code: 'VALIDATION_ERROR',
      status: 400,
    });
    json(res, result.status, result.body);
    return;
  }

  if (req.method === 'GET') {
    await requireAnyPermission('finance.view')(req);
    json(res, 200, success(await getTransaction(id)));
    return;
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    await requireAnyPermission('finance.view', 'payments.verify')(req);
    const body = await readJsonBody(req);
    if (body?.action !== 'void') {
      const result = failure('Unsupported action', { code: 'VALIDATION_ERROR', status: 400 });
      json(res, result.status, result.body);
      return;
    }
    json(res, 200, success(await voidTransaction(id)));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
