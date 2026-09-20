import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { HttpError } from '../../../server/utils/errors.js';
import { adminPaymentListQuerySchema } from '../../../server/validators/adminPayments.js';
import { listAdminPayments } from '../../../server/services/adminPaymentService.js';

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
 * GET /api/admin/payments — verification queue / list
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
  }

  await requireAnyPermission('payments.view', 'payments.verify')(req);

  const parsed = adminPaymentListQuerySchema.safeParse(readQuery(req));
  if (!parsed.success) {
    const result = failure('Invalid query', {
      code: 'VALIDATION_ERROR',
      status: 400,
      details: parsed.error.flatten(),
    });
    json(res, result.status, result.body);
    return;
  }

  const data = await listAdminPayments(parsed.data);
  json(res, 200, success(data));
}

export default withErrorHandling(handler);
