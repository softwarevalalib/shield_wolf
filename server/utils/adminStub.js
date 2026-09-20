import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { json, success, failure } from '../../server/utils/response.js';

/**
 * Factory for permission-gated admin stub endpoints (Phase 13).
 * Later phases replace stubs with real handlers; permission checks stay.
 */
export function createAdminStubHandler({
  resource,
  requireAuthFn,
  message = 'Endpoint reserved for a later phase',
}) {
  async function handler(req, res) {
    if (applyCors(req, res)) return;

    if (req.method !== 'GET') {
      const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
      json(res, result.status, result.body);
      return;
    }

    await requireAuthFn(req);

    json(
      res,
      200,
      success({
        resource,
        ready: false,
        message,
        actor: {
          id: req.auth.user.id,
          email: req.auth.user.email,
          roles: req.auth.user.roles,
        },
      })
    );
  }

  return withErrorHandling(handler);
}
