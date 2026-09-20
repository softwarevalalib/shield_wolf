import { applyCors } from '../../server/middleware/cors.js';
import { withErrorHandling } from '../../server/middleware/errorHandler.js';
import { json, success, failure } from '../../server/utils/response.js';
import { adminContentPageSchema } from '../../server/validators/adminSettings.js';
import { getPublicContentPage } from '../../server/services/adminSettingsService.js';

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
 * GET /api/content?page=about|faq|contact|delivery|homepage|banners
 * Public CMS content (no secrets).
 */
async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    const result = failure('Method not allowed', { code: 'METHOD_NOT_ALLOWED', status: 405 });
    json(res, result.status, result.body);
    return;
  }

  const query = readQuery(req);
  const parsed = adminContentPageSchema.safeParse(query.page || 'about');
  if (!parsed.success) {
    const result = failure('Invalid content page', { code: 'VALIDATION_ERROR', status: 400 });
    json(res, result.status, result.body);
    return;
  }

  // Announcements are exposed via homepage / public settings — not a standalone public page.
  if (parsed.data === 'announcements') {
    const result = failure('Use /settings/public for announcements', {
      code: 'VALIDATION_ERROR',
      status: 400,
    });
    json(res, result.status, result.body);
    return;
  }

  const value = await getPublicContentPage(parsed.data);
  json(res, 200, success({ page: parsed.data, content: value }));
}

export default withErrorHandling(handler);
