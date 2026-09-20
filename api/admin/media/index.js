import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requirePermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import {
  adminMediaListQuerySchema,
  adminMediaRegisterSchema,
} from '../../../server/validators/adminSettings.js';
import { listMedia, registerMedia } from '../../../server/services/adminCmsService.js';

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
 * GET/POST /api/admin/media
 * POST registers an external/media URL (binary upload providers stay abstracted).
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  await requirePermission('content.manage')(req);
  const query = readQuery(req);

  if (req.method === 'GET') {
    const parsed = adminMediaListQuerySchema.safeParse(query);
    if (!parsed.success) {
      const result = failure('Invalid query', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    json(res, 200, success(await listMedia(parsed.data)));
    return;
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const parsed = adminMediaRegisterSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const item = await registerMedia(
      {
        ...parsed.data,
        mimeType: parsed.data.mimeType || null,
        provider: parsed.data.provider || null,
      },
      { actorId: req.auth.user.id }
    );
    json(res, 201, success({ item }));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
