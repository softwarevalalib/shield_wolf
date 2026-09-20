import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requirePermission, requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import { adminCategoryWriteSchema } from '../../../server/validators/adminCatalog.js';
import {
  createAdminCategory,
  listAdminCategories,
} from '../../../server/services/adminCatalogService.js';

/**
 * GET /api/admin/categories — list
 * POST /api/admin/categories — create
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    await requireAnyPermission('categories.view', 'categories.manage')(req);
    const data = await listAdminCategories();
    json(res, 200, success(data));
    return;
  }

  if (req.method === 'POST') {
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
    const category = await createAdminCategory(parsed.data);
    json(res, 201, success({ category }));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
