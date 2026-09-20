/**
 * Admin sidebar navigation config (Phase 14).
 * Paths map to placeholders until their feature phases ship.
 */

export const ADMIN_NAV_GROUPS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    items: [
      { to: '/admin', label: 'Dashboard', end: true, icon: 'grid', permissions: null },
      { to: '/admin/live', label: 'Live Overview', icon: 'pulse', permissions: null },
    ],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: 'orders', permissions: ['orders.view'] },
      { to: '/admin/products', label: 'Products', icon: 'box', permissions: ['products.view'] },
      {
        to: '/admin/categories',
        label: 'Categories',
        icon: 'tags',
        permissions: ['categories.view', 'categories.manage'],
      },
      {
        to: '/admin/inventory',
        label: 'Inventory',
        icon: 'layers',
        permissions: ['inventory.view'],
      },
      {
        to: '/admin/customers',
        label: 'Customers',
        icon: 'users',
        permissions: ['customers.view'],
      },
      {
        to: '/admin/discounts',
        label: 'Discounts',
        icon: 'percent',
        permissions: ['products.update', 'content.manage'],
      },
      {
        to: '/admin/promotions',
        label: 'Promotions',
        icon: 'megaphone',
        permissions: ['content.manage'],
      },
    ],
  },
  {
    id: 'delivery',
    label: 'Delivery',
    items: [
      {
        to: '/admin/deliveries',
        label: 'Delivery Dashboard',
        icon: 'truck',
        permissions: ['delivery.view'],
      },
      {
        to: '/admin/deliveries/all',
        label: 'All Deliveries',
        icon: 'list',
        permissions: ['delivery.view'],
      },
      {
        to: '/admin/deliveries/dispatch',
        label: 'Dispatch Board',
        icon: 'board',
        permissions: ['delivery.assign', 'delivery.update'],
      },
      {
        to: '/admin/drivers',
        label: 'Drivers / Riders',
        icon: 'rider',
        permissions: ['delivery.view'],
      },
      {
        to: '/admin/vehicles',
        label: 'Vehicles',
        icon: 'vehicle',
        permissions: ['delivery.view'],
      },
      {
        to: '/admin/delivery-zones',
        label: 'Delivery Zones',
        icon: 'map',
        permissions: ['delivery.view', 'settings.manage'],
      },
      {
        to: '/admin/delivery-settings',
        label: 'Delivery Settings',
        icon: 'sliders',
        permissions: ['settings.manage', 'delivery.update'],
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      {
        to: '/admin/finance',
        label: 'Financial Dashboard',
        icon: 'chart',
        permissions: ['finance.view'],
      },
      {
        to: '/admin/finance/sales',
        label: 'Sales',
        icon: 'trend',
        permissions: ['finance.view', 'reports.view'],
      },
      {
        to: '/admin/payments',
        label: 'Payments',
        icon: 'card',
        permissions: ['payments.view'],
      },
      {
        to: '/admin/transactions',
        label: 'Transactions',
        icon: 'swap',
        permissions: ['finance.view'],
      },
      {
        to: '/admin/invoices',
        label: 'Invoices',
        icon: 'file',
        permissions: ['finance.view', 'orders.view'],
      },
      {
        to: '/admin/receipts',
        label: 'Receipts',
        icon: 'receipt',
        permissions: ['finance.view', 'payments.view'],
      },
      {
        to: '/admin/expenses',
        label: 'Expenses',
        icon: 'wallet',
        permissions: ['expenses.create', 'expenses.manage', 'finance.view'],
      },
      {
        to: '/admin/refunds',
        label: 'Refunds',
        icon: 'undo',
        permissions: ['payments.verify', 'finance.view'],
      },
      {
        to: '/admin/finance/reports',
        label: 'Financial Reports',
        icon: 'report',
        permissions: ['reports.view', 'reports.export', 'finance.view'],
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      {
        to: '/admin/marketing/promotions',
        label: 'Promotions',
        icon: 'megaphone',
        permissions: ['content.manage'],
      },
      {
        to: '/admin/marketing/coupons',
        label: 'Coupons',
        icon: 'ticket',
        permissions: ['content.manage'],
      },
      {
        to: '/admin/marketing/banners',
        label: 'Banners',
        icon: 'image',
        permissions: ['content.manage'],
      },
      {
        to: '/admin/marketing/testimonials',
        label: 'Testimonials',
        icon: 'quote',
        permissions: ['content.manage'],
      },
      {
        to: '/admin/marketing/announcements',
        label: 'Announcements',
        icon: 'bell',
        permissions: ['content.manage'],
      },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      {
        to: '/admin/content/homepage',
        label: 'Homepage',
        icon: 'home',
        permissions: ['content.manage'],
      },
      { to: '/admin/content/about', label: 'About', icon: 'info', permissions: ['content.manage'] },
      { to: '/admin/content/faq', label: 'FAQ', icon: 'help', permissions: ['content.manage'] },
      {
        to: '/admin/content/contact',
        label: 'Contact',
        icon: 'mail',
        permissions: ['content.manage'],
      },
      {
        to: '/admin/content/delivery',
        label: 'Delivery page',
        icon: 'truck',
        permissions: ['content.manage'],
      },
      {
        to: '/admin/media',
        label: 'Media Library',
        icon: 'image',
        permissions: ['content.manage'],
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [
      {
        to: '/admin/reports',
        label: 'Reports Hub',
        icon: 'report',
        permissions: ['reports.view'],
      },
      {
        to: '/admin/reports/sales',
        label: 'Sales Reports',
        icon: 'trend',
        permissions: ['reports.view'],
      },
      {
        to: '/admin/reports/products',
        label: 'Product Reports',
        icon: 'box',
        permissions: ['reports.view'],
      },
      {
        to: '/admin/reports/customers',
        label: 'Customer Reports',
        icon: 'users',
        permissions: ['reports.view'],
      },
      {
        to: '/admin/reports/inventory',
        label: 'Inventory Reports',
        icon: 'layers',
        permissions: ['reports.view', 'inventory.view'],
      },
      {
        to: '/admin/reports/delivery',
        label: 'Delivery Reports',
        icon: 'truck',
        permissions: ['reports.view', 'delivery.view'],
      },
      {
        to: '/admin/reports/finance',
        label: 'Financial Reports',
        icon: 'chart',
        permissions: ['reports.view', 'finance.view'],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      { to: '/admin/staff', label: 'Staff', icon: 'badge', permissions: ['staff.manage'] },
      {
        to: '/admin/roles',
        label: 'Roles & Permissions',
        icon: 'key',
        permissions: ['roles.manage', 'staff.manage'],
      },
      {
        to: '/admin/audit-logs',
        label: 'Audit Logs',
        icon: 'shield',
        permissions: ['audit.view'],
      },
      {
        to: '/admin/notifications',
        label: 'Notifications',
        icon: 'bell',
        permissions: ['settings.manage', 'content.manage', 'orders.view'],
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      {
        to: '/admin/settings',
        label: 'Settings Hub',
        icon: 'settings',
        permissions: ['settings.manage'],
      },
      {
        to: '/admin/settings/business',
        label: 'Business Settings',
        icon: 'building',
        permissions: ['settings.manage'],
      },
      {
        to: '/admin/settings/store',
        label: 'Store Settings',
        icon: 'store',
        permissions: ['settings.manage'],
      },
      {
        to: '/admin/settings/payments',
        label: 'Payment Settings',
        icon: 'card',
        permissions: ['settings.manage'],
      },
      {
        to: '/admin/settings/delivery',
        label: 'Delivery Settings',
        icon: 'truck',
        permissions: ['settings.manage'],
      },
      {
        to: '/admin/settings/tax',
        label: 'Tax Settings',
        icon: 'percent',
        permissions: ['settings.manage'],
      },
      {
        to: '/admin/settings/email',
        label: 'Email Settings',
        icon: 'mail',
        permissions: ['settings.manage'],
      },
      {
        to: '/admin/settings/security',
        label: 'Security',
        icon: 'lock',
        permissions: ['settings.manage'],
      },
      {
        to: '/admin/settings/integrations',
        label: 'Integrations',
        icon: 'plug',
        permissions: ['settings.manage'],
      },
    ],
  },
];

export const ADMIN_QUICK_ACTIONS = [
  {
    to: '/admin/products',
    label: 'Products',
    permissions: ['products.create', 'products.view'],
  },
  {
    to: '/admin/orders',
    label: 'Orders',
    permissions: ['orders.view'],
  },
  {
    to: '/admin/payments',
    label: 'Payments',
    permissions: ['payments.verify', 'payments.view'],
  },
  {
    to: '/admin/deliveries/dispatch',
    label: 'Dispatch',
    permissions: ['delivery.assign', 'delivery.update'],
  },
];

/** Flatten path → permission map for RBAC helpers. */
export function buildAdminNavPermissionMap() {
  const map = {};
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      map[item.to] = item.permissions;
    }
  }
  return map;
}
