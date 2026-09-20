/**
 * Factory for permission-gated admin module stubs.
 * Later phases replace these with real handlers; RBAC stays.
 */
import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { requireAdmin, requireAnyPermission } from '../../server/middleware/auth.js';
import { json, success, failure } from '../../server/utils/response.js';

export function createAdminStubHandler({ module, permissions = null, message }) {
  async function handler(req, res) {
    if (applyCors(req, res)) return;

    if (req.method !== 'GET') {
      const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
      json(res, result.status, result.body);
      return;
    }

    if (permissions?.length) {
      await requireAnyPermission(...permissions)(req);
    } else {
      await requireAdmin(req);
    }

    json(
      res,
      200,
      success({
        module,
        ready: false,
        message:
          message ||
          `${module} administration is permission-gated. Full UI arrives in a later phase.`,
      })
    );
  }

  return withErrorHandling(handler);
}
