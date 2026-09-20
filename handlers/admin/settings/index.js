import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requirePermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import {
  adminSettingsGroupSchema,
  adminSettingsPatchSchema,
} from '../../../server/validators/adminSettings.js';
import {
  getBusinessSettingGroup,
  listBusinessSettingGroups,
  updateBusinessSettingGroup,
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
 * GET /api/admin/settings — list groups or ?group=
 * PATCH /api/admin/settings — { group, value }
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  await requirePermission('settings.manage')(req);
  const query = readQuery(req);

  if (req.method === 'GET') {
    if (query.group) {
      const parsed = adminSettingsGroupSchema.safeParse(query.group);
      if (!parsed.success) {
        const result = failure('Invalid settings group', {
          code: 'VALIDATION_ERROR',
          status: 400,
        });
        json(res, result.status, result.body);
        return;
      }
      json(res, 200, success(await getBusinessSettingGroup(parsed.data)));
      return;
    }
    json(res, 200, success(await listBusinessSettingGroups()));
    return;
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const body = await readJsonBody(req);
    const parsed = adminSettingsPatchSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const data = await updateBusinessSettingGroup(parsed.data.group, parsed.data.value, {
      actorId: req.auth.user.id,
    });
    json(res, 200, success(data));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
