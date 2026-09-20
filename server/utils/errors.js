/**
 * Central API error class for server handlers.
 */
export class HttpError extends Error {
  constructor(status, message, { code = 'HTTP_ERROR', details = null } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function toErrorResponse(error) {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      body: {
        success: false,
        error: error.message,
        message: error.message,
        code: error.code,
        details: error.details,
      },
    };
  }

  console.error('[api]', error);

  return {
    status: 500,
    body: {
      success: false,
      error: 'Internal server error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: null,
    },
  };
}
