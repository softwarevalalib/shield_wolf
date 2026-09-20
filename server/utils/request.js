/**
 * Read JSON request body for Node/Vercel handlers.
 * Enforces request size limits to reduce abuse risk.
 */
import { HttpError } from './errors.js';

const DEFAULT_MAX_BYTES = Number(process.env.MAX_JSON_BODY_BYTES || 256 * 1024);

export async function readJsonBody(req, { maxBytes = DEFAULT_MAX_BYTES } = {}) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > maxBytes) {
      throw new HttpError(413, 'Request body too large', { code: 'PAYLOAD_TOO_LARGE' });
    }
    chunks.push(buf);
  }

  if (!chunks.length) return {};

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'Invalid JSON body', { code: 'INVALID_JSON' });
  }
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.headers['x-real-ip'] || 'unknown';
}
