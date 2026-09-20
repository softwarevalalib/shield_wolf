import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { json, success, failure } from '../../server/utils/response.js';
import { getPublicStorefrontData } from '../../server/services/storefrontService.js';

/**
 * GET /api/settings/public
 * Public storefront configuration (no secrets).
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const data = await getPublicStorefrontData();
  json(res, 200, success(data));
}

export default withErrorHandling(handler);
