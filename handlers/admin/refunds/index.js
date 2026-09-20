import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success } from '../../../server/utils/response.js';
import { HttpError } from '../../../server/utils/errors.js';
import { listTransactions } from '../../../server/services/ledgerService.js';

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
 * GET /api/admin/refunds — refund ledger entries (issue via payment review).
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
  }

  await requireAnyPermission('finance.view', 'payments.verify')(req);
  const query = readQuery(req);
  const page = Number(query.page || 1);
  const data = await listTransactions({ type: 'refund', status: 'all', page, pageSize: 50 });
  json(res, 200, success({ refunds: data.transactions, pagination: data.pagination }));
}

export default withErrorHandling(handler);
