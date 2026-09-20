import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { json, success, failure } from '../../server/utils/response.js';
import { listActiveCategories } from '../../server/services/storefrontService.js';
import { getCategoryBySlug } from '../../server/services/productService.js';

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
 * GET /api/categories
 * Optional ?slug= to fetch a single active category.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const query = readQuery(req);

  if (query.slug) {
    const category = await getCategoryBySlug(query.slug);
    if (!category) {
      const result = failure('Category not found', { code: 'NOT_FOUND', status: 404 });
      json(res, result.status, result.body);
      return;
    }
    json(res, 200, success({ category }));
    return;
  }

  const categories = await listActiveCategories();
  json(res, 200, success({ categories }));
}

export default withErrorHandling(handler);
