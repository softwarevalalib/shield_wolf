import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requirePermission, requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import { adminProductWriteSchema } from '../../../server/validators/adminCatalog.js';
import {
  duplicateAdminProduct,
  getAdminProduct,
  softDeleteAdminProduct,
  updateAdminProduct,
} from '../../../server/services/adminCatalogService.js';

/**
 * GET /api/admin/products/:id
 * PATCH /api/admin/products/:id
 * POST /api/admin/products/:id  { action: 'duplicate' }
 * DELETE /api/admin/products/:id
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  const id = req.params?.id || req.query?.id;
  if (!id) {
    const result = failure('Product id is required', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  if (req.method === 'GET') {
    await requireAnyPermission('products.view', 'products.update')(req);
    const product = await getAdminProduct(id);
    json(res, 200, success({ product }));
    return;
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    if (body?.action === 'duplicate') {
      await requirePermission('products.create')(req);
      const product = await duplicateAdminProduct(id);
      json(res, 201, success({ product }));
      return;
    }
    throw new HttpError(400, 'Unknown action', { code: 'VALIDATION_ERROR' });
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    await requirePermission('products.update')(req);
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
    const product = await updateAdminProduct(id, parsed.data);
    json(res, 200, success({ product }));
    return;
  }

  if (req.method === 'DELETE') {
    await requirePermission('products.delete')(req);
    const data = await softDeleteAdminProduct(id);
    json(res, 200, success(data));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
