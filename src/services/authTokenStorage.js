const ACCESS_TOKEN_KEY = 'sw_access_token';

/**
 * Client-side token storage foundation.
 * Prefer httpOnly cookies when auth endpoints are fully implemented (Phase 8).
 */
export function getAccessToken() {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch {
    // Storage may be unavailable (private mode); session is memory-only in that case.
  }
}

export function clearAuthTokens() {
  setAccessToken(null);
}
