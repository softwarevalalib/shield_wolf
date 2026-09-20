import { HttpError } from '../utils/errors.js';
import { getBearerToken } from './authHelpers.js';
import { getUserFromAccessToken } from '../services/authService.js';
import { isStaffUser, userHasAllPermissions, userHasAnyPermission } from '../utils/rbac.js';

export { getBearerToken } from './authHelpers.js';

/**
 * Require a verified JWT and attach req.auth.user.
 */
export async function requireAuth(req) {
  const token = getBearerToken(req);
  if (!token) {
    throw new HttpError(401, 'Authentication required', { code: 'UNAUTHENTICATED' });
  }

  const user = await getUserFromAccessToken(token);
  req.auth = {
    token,
    user,
    verified: true,
  };
  return req.auth;
}

/**
 * Require authenticated staff/admin (any staff role).
 */
export async function requireAdmin(req) {
  await requireAuth(req);
  if (!isStaffUser(req.auth.user)) {
    throw new HttpError(403, 'Admin access required', { code: 'FORBIDDEN' });
  }
  return req.auth;
}

/**
 * Require all listed permissions (super_admin bypasses).
 */
export function requirePermission(...permissions) {
  return async function permissionGuard(req) {
    await requireAdmin(req);
    if (!userHasAllPermissions(req.auth.user, permissions)) {
      throw new HttpError(403, 'Missing required permission', {
        code: 'FORBIDDEN_PERMISSION',
        details: { required: permissions },
      });
    }
    return req.auth;
  };
}

/**
 * Require at least one of the listed permissions.
 */
export function requireAnyPermission(...permissions) {
  return async function anyPermissionGuard(req) {
    await requireAdmin(req);
    if (!userHasAnyPermission(req.auth.user, permissions)) {
      throw new HttpError(403, 'Missing required permission', {
        code: 'FORBIDDEN_PERMISSION',
        details: { requiredAny: permissions },
      });
    }
    return req.auth;
  };
}
