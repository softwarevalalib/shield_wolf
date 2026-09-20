import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import { requirePermission, requireAnyPermission } from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import { adminPaymentActionSchema } from '../../../server/validators/adminPayments.js';
import {
  getAdminPayment,
  reviewAdminPayment,
} from '../../../server/services/adminPaymentService.js';

/**
 * GET   /api/admin/payments/:id
 * PATCH /api/admin/payments/:id  { action: approve|reject|clarify, adminNote? }
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  const id = req.params?.id || req.query?.id;
  if (!id) {
    const result = failure('Payment id is required', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  if (req.method === 'GET') {
    await requireAnyPermission('payments.view', 'payments.verify')(req);
    const data = await getAdminPayment(id);
    json(res, 200, success(data));
    return;
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    await requirePermission('payments.verify')(req);
    const body = await readJsonBody(req);

    // Never accept PIN/OTP fields
    for (const key of ['pin', 'otp', 'password', 'passcode', 'momoPin', 'secret']) {
      if (body?.[key] != null) {
        throw new HttpError(400, 'Never submit PINs, OTPs, or passwords.', {
          code: 'FORBIDDEN_FIELD',
        });
      }
    }

    const parsed = adminPaymentActionSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }

    const data = await reviewAdminPayment(id, {
      ...parsed.data,
      actorId: req.auth.user.id,
    });
    json(res, 200, success(data));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
