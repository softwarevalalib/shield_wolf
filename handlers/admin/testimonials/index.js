import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requirePermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import {
  adminTestimonialListQuerySchema,
  adminTestimonialWriteSchema,
} from '../../../server/validators/adminSettings.js';
import { createTestimonial, listTestimonials } from '../../../server/services/adminCmsService.js';

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
 * GET/POST /api/admin/testimonials
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  await requirePermission('content.manage')(req);
  const query = readQuery(req);

  if (req.method === 'GET') {
    const parsed = adminTestimonialListQuerySchema.safeParse(query);
    if (!parsed.success) {
      const result = failure('Invalid query', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const filters = { ...parsed.data };
    if (filters.active === 'all') delete filters.active;
    json(res, 200, success(await listTestimonials(filters)));
    return;
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const parsed = adminTestimonialWriteSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const item = await createTestimonial(parsed.data, { actorId: req.auth.user.id });
    json(res, 201, success({ item }));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
