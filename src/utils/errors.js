/**
 * Application error types for consistent client handling.
 */
export class AppError extends Error {
  constructor(message, { code = 'APP_ERROR', details = null } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export class ApiError extends AppError {
  constructor({ message, status = 500, code = 'API_ERROR', details = null, payload = null }) {
    super(message, { code, details });
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export function getErrorMessage(error, fallback = 'Something went wrong') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  return error.message || fallback;
}
