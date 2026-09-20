/**
 * Standardized API response helpers.
 */
export function success(data = null, meta = undefined) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return body;
}

export function failure(message, { code = 'ERROR', details = null, status = 400 } = {}) {
  return {
    status,
    body: {
      success: false,
      error: message,
      message,
      code,
      details,
    },
  };
}

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}
