import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { requireAdmin } from '../../server/middleware/auth.js';
import { json, success, failure } from '../../server/utils/response.js';
import { isStaffUser } from '../../server/utils/rbac.js';

/**
 * GET /api/admin/me
 * Current staff session with roles and permissions.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const auth = await requireAdmin(req);
  const user = auth.user;

  json(
    res,
    200,
    success({
      user,
      staff: isStaffUser(user),
      permissions: user.permissions || [],
      roles: user.roles || [],
    })
  );
}

export default withErrorHandling(handler);
