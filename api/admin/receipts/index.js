import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { HttpError } from '../../../server/utils/errors.js';
import { z } from 'zod';
import { listAdminReceipts } from '../../../server/services/documentService.js';

const querySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

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
 * GET /api/admin/receipts
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
  }

  await requireAnyPermission('finance.view', 'payments.view')(req);
  const parsed = querySchema.safeParse(readQuery(req));
  if (!parsed.success) {
    const result = failure('Invalid query', {
      code: 'VALIDATION_ERROR',
      status: 400,
      details: parsed.error.flatten(),
    });
    json(res, result.status, result.body);
    return;
  }

  json(res, 200, success(await listAdminReceipts(parsed.data)));
}

export default withErrorHandling(handler);
