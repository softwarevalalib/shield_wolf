import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const handlersRoot = path.resolve(__dirname, '../handlers');

const handlerCache = new Map();

/**
 * Resolve /api/... path segments to a handler module under /handlers.
 * Supports index.js, nested folders, and [slug]/[id] dynamic files.
 */
export async function resolveApiHandler(urlPath) {
  const clean = String(urlPath || '')
    .replace(/^\/api/, '')
    .replace(/\/$/, '');
  const segments = clean.split('/').filter(Boolean);

  if (segments.length === 0) {
    segments.push('health');
  }

  const exactCandidates = [
    path.join(handlersRoot, ...segments, 'index.js'),
    path.join(handlersRoot, `${segments.join(path.sep)}.js`),
  ];

  for (const candidate of exactCandidates) {
    const handler = await tryLoad(candidate);
    if (handler) return { handler, params: {} };
  }

  const dynamic = matchDynamicRoute(segments);
  if (dynamic) {
    const handler = await tryLoad(dynamic.file);
    if (handler) return { handler, params: dynamic.params };
  }

  return null;
}

function matchDynamicRoute(segments) {
  if (segments.length < 2) return null;

  const paramValue = segments[segments.length - 1];
  const parentSegments = segments.slice(0, -1);
  const parentDir = path.join(handlersRoot, ...parentSegments);

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

async function tryLoad(candidate) {
  try {
    if (!fs.existsSync(candidate)) return null;
    const mtime = fs.statSync(candidate).mtimeMs;
    const cached = handlerCache.get(candidate);
    if (cached && cached.mtime === mtime) return cached.handler;

    const href = pathToFileURL(candidate).href;
    const mod = await import(href);
    if (typeof mod.default === 'function') {
      handlerCache.set(candidate, { mtime, handler: mod.default });
      return mod.default;
    }
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND' && error.code !== 'ENOENT') {
      console.error('[api-router] load error', candidate, error.message);
    }
  }
  return null;
}
