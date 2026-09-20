import { resolveApiHandler } from '../server/apiRouter.js';

/**
 * Single Vercel serverless entry for all /api/* routes.
 * Hobby plan allows only 12 functions — this consolidates handlers into 1.
 *
 * Non-Next.js Vercel does not support [[...path]] catch-alls, so vercel.json
 * rewrites /api/* → /api?__path=... and this file dispatches to /handlers.
 */
export default async function handler(req, res) {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathParam = url.searchParams.get('__path') ?? req.query?.__path;
    const pathSuffix = Array.isArray(pathParam) ? pathParam.filter(Boolean).join('/') : pathParam;

    const pathname = pathSuffix
      ? `/api/${String(pathSuffix).replace(/^\/+/, '')}`
      : url.pathname.startsWith('/api')
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
    delete query.__path;
    req.query = { ...(req.query || {}), ...query };
    delete req.query.__path;
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
