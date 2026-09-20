import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { json, success, failure } from '../../server/utils/response.js';
import { listProducts, getCatalogFacets } from '../../server/services/productService.js';

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
 * GET /api/products
 * Public catalog with search, filters, sort, pagination via query string.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const query = readQuery(req);
  const includeFacets = query.facets === '1' || query.facets === 'true';

  const catalog = await listProducts({
    q: query.q,
    categorySlug: query.category || query.categorySlug,
    brand: query.brand,
    size: query.size,
    availability: query.availability,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
    featured: query.featured,
  });

  let facets = null;
  if (includeFacets) {
    facets = await getCatalogFacets(catalog.filters.categorySlug);
  }

  json(
    res,
    200,
    success({
      ...catalog,
      facets,
    })
  );
}

export default withErrorHandling(handler);
