import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requirePermission, requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { HttpError } from '../../../server/utils/errors.js';
import {
  REPORT_TYPES,
  reportToCsv,
  runAdminReport,
} from '../../../server/services/adminReportsService.js';

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
 * GET /api/admin/reports?type=sales&range=30d&format=json|csv
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
  }

  const query = readQuery(req);
  const type = query.type || 'sales';
  const format = (query.format || 'json').toLowerCase();

  if (query.list === 'types' || !query.type) {
    await requirePermission('reports.view')(req);
    if (!query.type) {
      // Hub metadata when type omitted
      json(
        res,
        200,
        success({
          types: REPORT_TYPES.map((id) => ({
            id,
            path: `/admin/reports/${id}`,
          })),
        })
      );
      return;
    }
  }

  if (format === 'csv') {
    await requireAnyPermission('reports.export', 'reports.view')(req);
  } else {
    await requirePermission('reports.view')(req);
  }

  if (!REPORT_TYPES.includes(type)) {
    const result = failure('Unknown report type', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  const report = await runAdminReport(type, query);

  if (format === 'csv') {
    const csv = reportToCsv(report);
    const filename = `${type}-report-${report.range?.fromLabel || 'current'}.csv`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(csv);
    return;
  }

  json(res, 200, success(report));
}

export default withErrorHandling(handler);
