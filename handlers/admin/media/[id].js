import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requirePermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { HttpError } from '../../../server/utils/errors.js';
import { deleteMedia } from '../../../server/services/adminCmsService.js';

/**
 * DELETE /api/admin/media/:id
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  await requirePermission('content.manage')(req);

  const id = req.params?.id || req.query?.id;
  if (!id) {
    const result = failure('Media id is required', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  if (req.method === 'DELETE') {
    json(res, 200, success(await deleteMedia(id, { actorId: req.auth.user.id })));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
