import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { json, success, failure } from '../../server/utils/response.js';
import { getProductBySlug } from '../../server/services/productService.js';

/**
 * GET /api/products/:slug
 * Public product detail.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const slug = req.params?.slug || req.query?.slug;
  if (!slug) {
    const result = failure('Product slug is required', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  const data = await getProductBySlug(slug);
  if (!data) {
    const result = failure('Product not found', { code: 'NOT_FOUND', status: 404 });
    json(res, result.status, result.body);
    return;
  }

  json(res, 200, success(data));
}

export default withErrorHandling(handler);
