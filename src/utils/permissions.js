/**
 * Client-side RBAC helpers (UX only — backend still enforces).
 */

import { buildAdminNavPermissionMap } from '@/config/adminNav';

export const STAFF_ROLE_SLUGS = [
  'super_admin',
  'store_manager',
  'sales_officer',
  'inventory_officer',
  'delivery_manager',
  'finance_officer',
  'customer_support',
];

export function isStaffUser(user) {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (['admin', 'staff'].includes(user.userType)) return true;
  return (user.roles || []).some((role) => STAFF_ROLE_SLUGS.includes(role));
}

export function isSuperAdmin(user) {
  return Boolean(user?.roles?.includes('super_admin'));
}

export function hasPermission(user, permission) {
  if (!user || !permission) return false;
  if (isSuperAdmin(user)) return true;
  return (user.permissions || []).includes(permission);
}

export function hasAnyPermission(user, permissions = []) {
  if (!permissions?.length) return isStaffUser(user);
  return permissions.some((permission) => hasPermission(user, permission));
}

/** Admin nav path → required permissions (any). null = any staff. */
export const ADMIN_NAV_PERMISSIONS = buildAdminNavPermissionMap();

export function canAccessAdminPath(user, path) {
  if (!isStaffUser(user)) return false;
  const required = ADMIN_NAV_PERMISSIONS[path];
  if (required === undefined) {
    // Unknown paths: allow staff through to the page; RequirePermission still gates known routes.
    return true;
  }
  if (!required) return true;
  return hasAnyPermission(user, required);
}
