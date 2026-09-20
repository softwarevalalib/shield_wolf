import { toErrorResponse } from '../utils/errors.js';
import { json } from '../utils/response.js';

/**
 * Wrap async API handlers with consistent error handling.
 */
export function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      json(res, status, body);
    }
  };
}
