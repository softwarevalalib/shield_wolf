import http from 'node:http';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../database/loadEnv.js';

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.API_PORT || 3000);
const apiRoot = path.join(root, 'api');

/**
 * Resolve /api/... to a handler file, including [param] dynamic segments.
 */
async function resolveHandler(urlPath) {
  const clean = urlPath.replace(/^\/api/, '').replace(/\/$/, '') || '/health';
  const segments = clean.split('/').filter(Boolean);

  // Exact file matches first
  const exactCandidates = [
    path.join(apiRoot, ...segments, 'index.js'),
    path.join(apiRoot, `${segments.join('/')}.js`),
  ];

  for (const candidate of exactCandidates) {
    const handler = await tryLoad(candidate);
    if (handler) return { handler, params: {} };
  }

  // Dynamic [param] matching
  const dynamic = matchDynamicRoute(segments);
  if (dynamic) {
    const handler = await tryLoad(dynamic.file);
    if (handler) return { handler, params: dynamic.params };
  }

  return null;
}

function matchDynamicRoute(segments) {
  // Support nested dynamic files, e.g. api/resource/[slug].js or api/a/b/[slug].js
  if (segments.length < 2) return null;

  const paramValue = segments[segments.length - 1];
  const parentSegments = segments.slice(0, -1);
  const parentDir = path.join(apiRoot, ...parentSegments);

  for (const name of ['[slug].js', '[id].js']) {
    const dynamicFile = path.join(parentDir, name);
    if (fs.existsSync(dynamicFile)) {
      const key = name.includes('slug') ? 'slug' : 'id';
      return {
        file: dynamicFile,
        params: { [key]: decodeURIComponent(paramValue) },
      };
    }
  }

  return null;
}

const handlerCache = new Map();

async function tryLoad(candidate) {
  try {
    if (!fs.existsSync(candidate)) return null;
    const mtime = fs.statSync(candidate).mtimeMs;
    const cached = handlerCache.get(candidate);
    if (cached && cached.mtime === mtime) return cached.handler;

    // Reuse cached handler; plain import URL avoids reloading native sqlite bindings
    const href = pathToFileURL(candidate).href;
    const mod = await import(href);
    if (typeof mod.default === 'function') {
      handlerCache.set(candidate, { mtime, handler: mod.default });
      return mod.default;
    }
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND' && !error.message?.includes('Cannot find module')) {
      // Missing file is normal while probing candidates
      if (error.code !== 'ENOENT') {
        console.error('[dev-api] load error', candidate, error.message);
      }
    }
  }
  return null;
}

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

    const resolved = await resolveHandler(url.pathname);
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
