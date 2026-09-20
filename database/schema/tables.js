/**
 * Core relational tables for Shield Wolf.
 * Applied by database/migrations/001_initial_schema.js
 *
 * Production: Neon PostgreSQL (DATABASE_URL)
 * Local: SQLite (DB_DRIVER=sqlite) — no bidirectional sync
 */

export const CORE_TABLES = [
  'schema_migrations',
  'users',
  'customer_profiles',
  'admin_profiles',
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'categories',
  'products',
  'product_images',
  'product_variants',
  'inventory',
  'inventory_movements',
  'media',
  'carts',
  'cart_items',
  'addresses',
  'discounts',
  'coupons',
  'orders',
  'order_items',
  'order_status_history',
  'payments',
  'payment_attempts',
  'invoices',
  'receipts',
  'delivery_zones',
  'drivers',
  'vehicles',
  'deliveries',
  'delivery_status_history',
  'transactions',
  'expense_categories',
  'expenses',
  'reviews',
  'testimonials',
  'notifications',
  'site_settings',
  'business_settings',
  'audit_logs',
  'password_reset_tokens',
];
