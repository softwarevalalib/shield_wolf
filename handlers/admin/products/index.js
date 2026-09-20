import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requirePermission, requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import {
  adminProductBulkSchema,
  adminProductListQuerySchema,
  adminProductWriteSchema,
} from '../../../server/validators/adminCatalog.js';
import {
  bulkUpdateAdminProducts,
  createAdminProduct,
  listAdminProducts,
} from '../../../server/services/adminCatalogService.js';

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
 * GET /api/admin/products — list
 * POST /api/admin/products — create
 * PATCH /api/admin/products — bulk actions
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    await requireAnyPermission('products.view', 'products.create', 'products.update')(req);
    const parsed = adminProductListQuerySchema.safeParse(readQuery(req));
    if (!parsed.success) {
      const result = failure('Invalid query', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const data = await listAdminProducts(parsed.data);
    json(res, 200, success(data));
    return;
  }

  if (req.method === 'POST') {
    await requirePermission('products.create')(req);
    const body = await readJsonBody(req);
    const parsed = adminProductWriteSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const product = await createAdminProduct(parsed.data);
    json(res, 201, success({ product }));
    return;
  }

  if (req.method === 'PATCH') {
    await requireAnyPermission('products.update', 'products.delete')(req);
    const body = await readJsonBody(req);
    const parsed = adminProductBulkSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    if (parsed.data.action === 'delete') {
      await requirePermission('products.delete')(req);
    } else {
      await requirePermission('products.update')(req);
    }
    const data = await bulkUpdateAdminProducts(parsed.data);
    json(res, 200, success(data));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
