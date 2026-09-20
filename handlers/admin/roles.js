import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { requireAnyPermission } from '../../server/middleware/auth.js';
import { json, success, failure } from '../../server/utils/response.js';
import {
  listRolesWithPermissions,
  listPermissionsCatalog,
} from '../../server/services/rbacService.js';

/**
 * GET /api/admin/roles
 * Role + permission catalog for staff management UIs.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  await requireAnyPermission('staff.manage', 'roles.manage')(req);
  const [roles, permissions] = await Promise.all([
    listRolesWithPermissions(),
    listPermissionsCatalog(),
  ]);

  json(res, 200, success({ roles, permissions }));
}

export default withErrorHandling(handler);
