/**
 * Security response headers for API handlers.
 */
export function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-XSS-Protection', '0');
  // APIs are JSON-only; discourage MIME sniffing and cross-origin embedding.
  if (!res.getHeader('Cache-Control')) {
    res.setHeader('Cache-Control', 'no-store');
  }
}

/**
 * Validate that a media/evidence URL is http(s) and not a dangerous scheme.
 */
export function isSafeHttpUrl(value, { maxLength = 500 } = {}) {
  if (value == null || value === '') return true;
  if (typeof value !== 'string' || value.length > maxLength) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
