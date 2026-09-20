import http from 'node:http';
import { loadEnv } from '../database/loadEnv.js';
import { resolveApiHandler } from '../server/apiRouter.js';

loadEnv();

const port = Number(process.env.API_PORT || 3000);

function enhanceRes(res) {
  if (!res.status) {
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = (body) => {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify(body));
    };
  }
  return res;
}

const server = http.createServer(async (req, res) => {
  enhanceRes(res);

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (!url.pathname.startsWith('/api')) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Not found' }));
      return;
    }

    const resolved = await resolveApiHandler(url.pathname);
    if (!resolved) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({ success: false, message: 'API route not found', path: url.pathname })
      );
      return;
    }

    req.query = Object.fromEntries(url.searchParams.entries());
    req.params = resolved.params || {};
    await resolved.handler(req, res);
  } catch (error) {
    console.error('[dev-api]', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Internal server error' }));
    }
  }
});

server.listen(port, () => {
  console.log(`Shield Wolf API listening on http://localhost:${port}`);
});
