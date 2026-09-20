import { applyCors } from '../../../server/middleware/cors.js';
import { withErrorHandling } from '../../../server/middleware/errorHandler.js';
import {
  requirePermission,
  requireAnyPermission,
} from '../../../server/middleware/auth.js';
import { json, success, failure } from '../../../server/utils/response.js';
import { readJsonBody } from '../../../server/utils/request.js';
import { HttpError } from '../../../server/utils/errors.js';
import {
  inventoryMovementWriteSchema,
  inventoryMovementsQuerySchema,
} from '../../../server/validators/inventory.js';
import {
  applyInventoryMovement,
  listInventoryMovements,
} from '../../../server/services/inventoryService.js';

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
 * GET  /api/admin/inventory/movements — history
 * POST /api/admin/inventory/movements — apply movement (immutable ledger)
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    await requireAnyPermission('inventory.view', 'inventory.adjust')(req);
    const parsed = inventoryMovementsQuerySchema.safeParse(readQuery(req));
    if (!parsed.success) {
      const result = failure('Invalid query', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }
    const data = await listInventoryMovements(parsed.data);
    json(res, 200, success(data));
    return;
  }

  if (req.method === 'POST') {
    await requirePermission('inventory.adjust')(req);
    const body = await readJsonBody(req);
    const parsed = inventoryMovementWriteSchema.safeParse(body);
    if (!parsed.success) {
      const result = failure('Validation failed', {
        code: 'VALIDATION_ERROR',
        status: 400,
        details: parsed.error.flatten(),
      });
      json(res, result.status, result.body);
      return;
    }

    const data = await applyInventoryMovement({
      ...parsed.data,
      createdBy: req.auth.user.id,
    });
    json(res, 201, success(data));
    return;
  }

  throw new HttpError(405, 'Method not allowed', { code: 'METHOD_NOT_ALLOWED' });
}

export default withErrorHandling(handler);
