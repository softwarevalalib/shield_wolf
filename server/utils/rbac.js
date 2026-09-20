/**
 * Role-based access control helpers.
 * Backend enforcement is mandatory — frontend gates are UX only.
 */

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
  const roles = user.roles || [];
  return roles.some((role) => STAFF_ROLE_SLUGS.includes(role));
}

export function isSuperAdmin(user) {
  return Boolean(user?.roles?.includes('super_admin'));
}

export function userHasPermission(user, permission) {
  if (!user || !permission) return false;
  if (isSuperAdmin(user)) return true;
  return (user.permissions || []).includes(permission);
}

export function userHasAnyPermission(user, permissions = []) {
  if (!permissions.length) return isStaffUser(user);
  return permissions.some((permission) => userHasPermission(user, permission));
}

export function userHasAllPermissions(user, permissions = []) {
  if (!permissions.length) return isStaffUser(user);
  return permissions.every((permission) => userHasPermission(user, permission));
}

/**
 * Admin nav item → required permission (any of).
 * Kept in sync with src/config/adminNav.js (Phase 14).
 * Missing / null = staff access only.
 */
export const ADMIN_NAV_PERMISSIONS = {
  '/admin': null,
  '/admin/live': null,
  '/admin/orders': ['orders.view'],
  '/admin/products': ['products.view'],
  '/admin/categories': ['categories.view', 'categories.manage'],
  '/admin/inventory': ['inventory.view'],
  '/admin/customers': ['customers.view'],
  '/admin/discounts': ['products.update', 'content.manage'],
  '/admin/promotions': ['content.manage'],
  '/admin/deliveries': ['delivery.view'],
  '/admin/deliveries/all': ['delivery.view'],
  '/admin/deliveries/dispatch': ['delivery.assign', 'delivery.update'],
  '/admin/drivers': ['delivery.view'],
  '/admin/vehicles': ['delivery.view'],
  '/admin/delivery-zones': ['delivery.view', 'settings.manage'],
  '/admin/delivery-settings': ['settings.manage', 'delivery.update'],
  '/admin/finance': ['finance.view'],
  '/admin/finance/sales': ['finance.view', 'reports.view'],
  '/admin/payments': ['payments.view'],
  '/admin/transactions': ['finance.view'],
  '/admin/invoices': ['finance.view', 'orders.view'],
  '/admin/receipts': ['finance.view', 'payments.view'],
  '/admin/expenses': ['expenses.create', 'expenses.manage', 'finance.view'],
  '/admin/refunds': ['payments.verify', 'finance.view'],
  '/admin/finance/reports': ['reports.view', 'reports.export', 'finance.view'],
  '/admin/marketing/promotions': ['content.manage'],
  '/admin/marketing/coupons': ['content.manage'],
  '/admin/marketing/banners': ['content.manage'],
  '/admin/marketing/testimonials': ['content.manage'],
  '/admin/marketing/announcements': ['content.manage'],
  '/admin/content/homepage': ['content.manage'],
  '/admin/content/about': ['content.manage'],
  '/admin/content/faq': ['content.manage'],
  '/admin/content/contact': ['content.manage'],
  '/admin/content/delivery': ['content.manage'],
  '/admin/media': ['content.manage'],
  '/admin/reports': ['reports.view'],
  '/admin/reports/sales': ['reports.view'],
  '/admin/reports/products': ['reports.view'],
  '/admin/reports/customers': ['reports.view'],
  '/admin/reports/inventory': ['reports.view', 'inventory.view'],
  '/admin/reports/delivery': ['reports.view', 'delivery.view'],
  '/admin/reports/finance': ['reports.view', 'finance.view'],
  '/admin/staff': ['staff.manage'],
  '/admin/roles': ['roles.manage', 'staff.manage'],
  '/admin/audit-logs': ['audit.view'],
  '/admin/notifications': ['settings.manage', 'content.manage', 'orders.view'],
  '/admin/settings': ['settings.manage'],
  '/admin/settings/business': ['settings.manage'],
  '/admin/settings/store': ['settings.manage'],
  '/admin/settings/payments': ['settings.manage'],
  '/admin/settings/delivery': ['settings.manage'],
  '/admin/settings/tax': ['settings.manage'],
  '/admin/settings/email': ['settings.manage'],
  '/admin/settings/security': ['settings.manage'],
  '/admin/settings/integrations': ['settings.manage'],
};
