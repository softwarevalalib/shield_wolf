import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import { adminExpenseWriteSchema } from '../../../server/validators/adminFinanceOps.js';
import {
  getExpense,
  softDeleteExpense,
  updateExpense,
} from '../../../server/services/adminExpenseService.js';

/**
 * GET/PATCH/DELETE /api/admin/expenses/:id
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  const id = req.params?.id || req.query?.id;
  if (!id) {
    const result = failure('Expense id is required', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  if (req.method === 'GET') {
    await requireAnyPermission('finance.view', 'expenses.create', 'expenses.manage')(req);
    json(res, 200, success(await getExpense(id)));
    return;
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    await requireAnyPermission('expenses.manage', 'expenses.create')(req);
    const body = await readJsonBody(req);
    const parsed = adminExpenseWriteSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    json(res, 200, success(await updateExpense(id, parsed.data, { actorId: req.auth.user.id })));
    return;
  }

  if (req.method === 'DELETE') {
    await requireAnyPermission('expenses.manage')(req);
    json(res, 200, success(await softDeleteExpense(id)));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
