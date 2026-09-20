import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requirePermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import {
  adminContentPageSchema,
  adminContentPatchSchema,
} from '../../../server/validators/adminSettings.js';
import {
  getContentPage,
  listContentPages,
  updateContentPage,
} from '../../../server/services/adminSettingsService.js';

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
 * GET /api/admin/content — list pages or ?page=
 * PATCH /api/admin/content — { page, value }
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  await requirePermission('content.manage')(req);
  const query = readQuery(req);

  if (req.method === 'GET') {
    if (query.page) {
      const parsed = adminContentPageSchema.safeParse(query.page);
      if (!parsed.success) {
        const result = failure('Invalid content page', {
          code: 'VALIDATION_ERROR',
          status: 400,
        });
        json(res, result.status, result.body);
        return;
      }
      json(res, 200, success(await getContentPage(parsed.data)));
      return;
    }
    json(res, 200, success(await listContentPages()));
    return;
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const body = await readJsonBody(req);
    const parsed = adminContentPatchSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const data = await updateContentPage(parsed.data.page, parsed.data.value, {
      actorId: req.auth.user.id,
    });
    json(res, 200, success(data));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
