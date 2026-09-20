import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { json, success, failure } from '../../server/utils/response.js';
import { quoteCart } from '../../server/services/cartService.js';

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

/**
 * POST /api/cart/quote
 * Server-side cart recalculation. Client prices are ignored.
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    const result = failure('Invalid JSON body', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const quote = await quoteCart(items);
  json(res, 200, success(quote));
}

export default withErrorHandling(handler);
