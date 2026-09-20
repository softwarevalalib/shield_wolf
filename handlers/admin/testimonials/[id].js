import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requirePermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import { adminTestimonialWriteSchema } from '../../../server/validators/adminSettings.js';
import {
  deleteTestimonial,
  getTestimonial,
  updateTestimonial,
} from '../../../server/services/adminCmsService.js';

/**
 * GET/PATCH/DELETE /api/admin/testimonials/:id
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;
  await requirePermission('content.manage')(req);

  const id = req.params?.id || req.query?.id;
  if (!id) {
    const result = failure('Testimonial id is required', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  if (req.method === 'GET') {
    json(res, 200, success({ item: await getTestimonial(id) }));
    return;
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const body = await readJsonBody(req);
    const parsed = adminTestimonialWriteSchema.partial().safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const item = await updateTestimonial(id, parsed.data, { actorId: req.auth.user.id });
    json(res, 200, success({ item }));
    return;
  }

  if (req.method === 'DELETE') {
    json(res, 200, success(await deleteTestimonial(id, { actorId: req.auth.user.id })));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
