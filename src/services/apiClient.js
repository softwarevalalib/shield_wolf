import { getAccessToken } from '@/services/authTokenStorage';
import { ApiError } from '@/utils/errors';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function parseBody(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text ? { message: text } : null;
}

/**
 * Standardized API client.
 * All browser ↔ API traffic should go through this layer.
 */
async function request(path, options = {}) {
  const { method = 'GET', body, headers = {}, signal, idempotencyKey } = options;
  const token = getAccessToken();

  const finalHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    finalHeaders['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body === undefined || body instanceof FormData ? body : JSON.stringify(body),
    signal,
    credentials: 'same-origin',
  });

  const payload = await parseBody(response);

  if (!response.ok) {
    throw new ApiError({
      message: payload?.message || payload?.error || 'Request failed',
      status: response.status,
      code: payload?.code || 'API_ERROR',
      details: payload?.details || payload?.errors || null,
      payload,
    });
  }

  return payload;
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

export { API_BASE };
