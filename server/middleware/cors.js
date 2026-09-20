/**
 * CORS foundation for Vercel/Node handlers.
 * Credentials mode never uses wildcard origins.
 */
import { serverEnv } from '../config/env.js';
import { applySecurityHeaders } from './securityHeaders.js';

export function applyCors(req, res, { origin } = {}) {
  applySecurityHeaders(res);

  const configured = origin || serverEnv.corsOrigin || serverEnv.appUrl || '*';
  const requestOrigin = req.headers.origin;

  if (configured === '*') {
    // Wildcard cannot be combined with credentials — omit credentials.
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    const allowedList = String(configured)
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const matched =
      requestOrigin && allowedList.includes(requestOrigin)
        ? requestOrigin
        : allowedList[0] || serverEnv.appUrl;
    res.setHeader('Access-Control-Allow-Origin', matched);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Idempotency-Key, X-Requested-With'
  );
  res.setHeader('Access-Control-Expose-Headers', 'Retry-After, X-RateLimit-Remaining');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  return false;
}
