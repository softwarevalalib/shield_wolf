import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requirePermission, requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import { adminCategoryWriteSchema } from '../../../server/validators/adminCatalog.js';
import {
  getAdminCategory,
  softDeleteAdminCategory,
  updateAdminCategory,
} from '../../../server/services/adminCatalogService.js';

/**
 * GET /api/admin/categories/:id
 * PATCH /api/admin/categories/:id
 * DELETE /api/admin/categories/:id
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  const id = req.params?.id || req.query?.id;
  if (!id) {
    const result = failure('Category id is required', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  if (req.method === 'GET') {
    await requireAnyPermission('categories.view', 'categories.manage')(req);
    const category = await getAdminCategory(id);
    json(res, 200, success({ category }));
    return;
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    await requirePermission('categories.manage')(req);
    const body = await readJsonBody(req);
    const parsed = adminCategoryWriteSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const category = await updateAdminCategory(id, parsed.data);
    json(res, 200, success({ category }));
    return;
  }

  if (req.method === 'DELETE') {
    await requirePermission('categories.manage')(req);
    const data = await softDeleteAdminCategory(id);
    json(res, 200, success(data));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
