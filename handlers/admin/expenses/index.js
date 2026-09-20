import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import {
  adminExpenseListQuerySchema,
  adminExpenseWriteSchema,
} from '../../../server/validators/adminFinanceOps.js';
import {
  createExpense,
  listExpenseCategories,
  listExpenses,
} from '../../../server/services/adminExpenseService.js';

function readQuery(req) {
  if (req.query) return req.query;
  try {
    const host = req.headers?.host || 'localhost';
    const url = new URL(req.url || '/', `http://${host}`);
    return Object.fromEntries(url.searchParams.entries());
  } catch {
    return {};
  }
}

/**
 * GET/POST /api/admin/expenses
 * GET ?view=categories for category list
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  const query = readQuery(req);

  if (req.method === 'GET') {
    await requireAnyPermission('finance.view', 'expenses.create', 'expenses.manage')(req);
    if (query.view === 'categories') {
      json(res, 200, success(await listExpenseCategories()));
      return;
    }
    const parsed = adminExpenseListQuerySchema.safeParse(query);
    if (!parsed.success) {
      const result = failure('Invalid query', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    json(res, 200, success(await listExpenses(parsed.data)));
    return;
  }

  if (req.method === 'POST') {
    await requireAnyPermission('expenses.create', 'expenses.manage')(req);
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
    const data = await createExpense(parsed.data, { actorId: req.auth.user.id });
    json(res, 201, success(data));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
