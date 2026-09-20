import { resolveApiHandler } from '../server/apiRouter.js';

/**
 * Single Vercel serverless entry for all /api/* routes.
 * Hobby plan allows only 12 functions — this consolidates ~75 handlers into 1.
 *
 * File: api/[[...path]].js → matches /api, /api/health, /api/products/:slug, etc.
 */
export default async function handler(req, res) {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname.startsWith('/api')
      ? url.pathname
      : `/api${url.pathname === '/' ? '' : url.pathname}`;

    const resolved = await resolveApiHandler(pathname);
    if (!resolved) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          success: false,
          message: 'API route not found',
          path: pathname,
        })
      );
      return;
    }

    const query = Object.fromEntries(url.searchParams.entries());
    req.query = { ...(req.query || {}), ...query };
    req.params = { ...(req.params || {}), ...(resolved.params || {}) };

    await resolved.handler(req, res);
  } catch (error) {
    console.error('[api]', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ success: false, message: 'Internal server error' }));
    }
  }
}
