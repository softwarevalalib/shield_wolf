import {
  booleanColumn,
  idColumn,
  integerColumn,
  isPostgres,
  jsonColumn,
  moneyColumn,
  timestampColumn,
} from '../dialect.js';

/**
 * 001 — Initial relational schema
 * PostgreSQL/Neon is production source of truth.
 * SQLite variant is for local development only (no bidirectional sync).
 */

function timestamps(driver) {
  return [
    timestampColumn(driver, 'created_at', { required: true, defaultNow: true }),
    timestampColumn(driver, 'updated_at', { required: true, defaultNow: true }),
  ].join(',\n  ');
}

function softDelete(driver) {
  return timestampColumn(driver, 'deleted_at', { required: false });
}

function fk(driver, column, table, opts = {}) {
  const onDelete = opts.onDelete || 'RESTRICT';
  const nullability = opts.required === false ? '' : 'NOT NULL';
  const type = isPostgres(driver) ? 'UUID' : 'TEXT';
  return `${column} ${type} ${nullability} REFERENCES ${table}(id) ON DELETE ${onDelete}`.replace(
    /\s+/g,
    ' '
  );
}

export async function up(db, driver) {
  if (isPostgres(driver)) {
    await db.exec('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  }

  // —— Identity & RBAC ——
  await db.exec(`
    CREATE TABLE users (
      ${idColumn(driver)},
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'admin', 'staff')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
      email_verified_at ${isPostgres(driver) ? 'TIMESTAMPTZ' : 'TEXT'},
      phone_verified_at ${isPostgres(driver) ? 'TIMESTAMPTZ' : 'TEXT'},
      last_login_at ${isPostgres(driver) ? 'TIMESTAMPTZ' : 'TEXT'},
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE customer_profiles (
      ${idColumn(driver)},
      ${fk(driver, 'user_id', 'users', { onDelete: 'CASCADE' })},
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      whatsapp TEXT,
      notes TEXT,
      ${timestamps(driver)},
      UNIQUE (user_id)
    );
  `);

  await db.exec(`
    CREATE TABLE admin_profiles (
      ${idColumn(driver)},
      ${fk(driver, 'user_id', 'users', { onDelete: 'CASCADE' })},
      display_name TEXT NOT NULL,
      job_title TEXT,
      ${timestamps(driver)},
      UNIQUE (user_id)
    );
  `);

  await db.exec(`
    CREATE TABLE roles (
      ${idColumn(driver)},
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      ${booleanColumn(driver, 'is_system', true)},
      ${timestamps(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE permissions (
      ${idColumn(driver)},
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      ${timestamps(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE role_permissions (
      ${fk(driver, 'role_id', 'roles', { onDelete: 'CASCADE' })},
      ${fk(driver, 'permission_id', 'permissions', { onDelete: 'CASCADE' })},
      PRIMARY KEY (role_id, permission_id)
    );
  `);

  await db.exec(`
    CREATE TABLE user_roles (
      ${fk(driver, 'user_id', 'users', { onDelete: 'CASCADE' })},
      ${fk(driver, 'role_id', 'roles', { onDelete: 'CASCADE' })},
      ${timestampColumn(driver, 'assigned_at', { required: true, defaultNow: true })},
      PRIMARY KEY (user_id, role_id)
    );
  `);

  // —— Catalog ——
  await db.exec(`
    CREATE TABLE categories (
      ${idColumn(driver)},
      ${fk(driver, 'parent_id', 'categories', { required: false, onDelete: 'SET NULL' })},
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      image_url TEXT,
      ${integerColumn('sort_order', { required: true, defaultValue: 0 })},
      ${booleanColumn(driver, 'active', true)},
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE products (
      ${idColumn(driver)},
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sku TEXT UNIQUE,
      barcode TEXT,
      description TEXT,
      short_description TEXT,
      ${fk(driver, 'category_id', 'categories', { required: false, onDelete: 'SET NULL' })},
      subcategory TEXT,
      brand TEXT,
      ${moneyColumn(driver, 'price')},
      ${moneyColumn(driver, 'compare_at_price')},
      ${moneyColumn(driver, 'cost_price')},
      currency TEXT NOT NULL DEFAULT 'LRD',
      ${moneyColumn(driver, 'tax')},
      ${integerColumn('stock_quantity', { required: true, defaultValue: 0 })},
      ${integerColumn('low_stock_threshold', { required: true, defaultValue: 5 })},
      weight ${isPostgres(driver) ? 'NUMERIC(12, 3)' : 'NUMERIC'},
      weight_unit TEXT,
      size TEXT,
      unit TEXT,
      ${booleanColumn(driver, 'featured', false)},
      ${booleanColumn(driver, 'active', true)},
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      thumbnail_url TEXT,
      seo_title TEXT,
      seo_description TEXT,
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE product_images (
      ${idColumn(driver)},
      ${fk(driver, 'product_id', 'products', { onDelete: 'CASCADE' })},
      url TEXT NOT NULL,
      alt_text TEXT,
      ${integerColumn('sort_order', { required: true, defaultValue: 0 })},
      ${booleanColumn(driver, 'is_primary', false)},
      ${timestamps(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE product_variants (
      ${idColumn(driver)},
      ${fk(driver, 'product_id', 'products', { onDelete: 'CASCADE' })},
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      size TEXT,
      unit TEXT,
      ${moneyColumn(driver, 'price')},
      ${moneyColumn(driver, 'compare_at_price')},
      ${moneyColumn(driver, 'cost_price')},
      ${integerColumn('stock_quantity', { required: true, defaultValue: 0 })},
      weight ${isPostgres(driver) ? 'NUMERIC(12, 3)' : 'NUMERIC'},
      weight_unit TEXT,
      ${booleanColumn(driver, 'active', true)},
      ${integerColumn('sort_order', { required: true, defaultValue: 0 })},
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  // —— Inventory ——
  await db.exec(`
    CREATE TABLE inventory (
      ${idColumn(driver)},
      ${fk(driver, 'product_id', 'products', { onDelete: 'CASCADE' })},
      ${fk(driver, 'variant_id', 'product_variants', { required: false, onDelete: 'CASCADE' })},
      ${integerColumn('quantity', { required: true, defaultValue: 0 })},
      ${integerColumn('low_stock_threshold', { required: true, defaultValue: 5 })},
      ${timestamps(driver)},
      UNIQUE (product_id, variant_id)
    );
  `);

  await db.exec(`
    CREATE TABLE inventory_movements (
      ${idColumn(driver)},
      ${fk(driver, 'product_id', 'products', { onDelete: 'RESTRICT' })},
      ${fk(driver, 'variant_id', 'product_variants', { required: false, onDelete: 'SET NULL' })},
      movement_type TEXT NOT NULL CHECK (
        movement_type IN (
          'addition', 'deduction', 'adjustment', 'sale', 'return', 'damaged', 'restock'
        )
      ),
      quantity_delta INTEGER NOT NULL,
      quantity_before INTEGER NOT NULL,
      quantity_after INTEGER NOT NULL,
      reason TEXT,
      reference_type TEXT,
      reference_id ${isPostgres(driver) ? 'UUID' : 'TEXT'},
      ${fk(driver, 'created_by', 'users', { required: false, onDelete: 'SET NULL' })},
      ${timestampColumn(driver, 'created_at', { required: true, defaultNow: true })}
    );
  `);

  // —— Media ——
  await db.exec(`
    CREATE TABLE media (
      ${idColumn(driver)},
      provider TEXT NOT NULL DEFAULT 'local',
      public_id TEXT,
      url TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER,
      width INTEGER,
      height INTEGER,
      alt_text TEXT,
      ${fk(driver, 'uploaded_by', 'users', { required: false, onDelete: 'SET NULL' })},
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  // —— Cart ——
  await db.exec(`
    CREATE TABLE carts (
      ${idColumn(driver)},
      ${fk(driver, 'user_id', 'users', { required: false, onDelete: 'CASCADE' })},
      guest_token TEXT UNIQUE,
      currency TEXT NOT NULL DEFAULT 'LRD',
      ${timestamps(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE cart_items (
      ${idColumn(driver)},
      ${fk(driver, 'cart_id', 'carts', { onDelete: 'CASCADE' })},
      ${fk(driver, 'product_id', 'products', { onDelete: 'CASCADE' })},
      ${fk(driver, 'variant_id', 'product_variants', { required: false, onDelete: 'SET NULL' })},
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      ${timestamps(driver)},
      UNIQUE (cart_id, product_id, variant_id)
    );
  `);

  // —— Addresses ——
  await db.exec(`
    CREATE TABLE addresses (
      ${idColumn(driver)},
      ${fk(driver, 'user_id', 'users', { required: false, onDelete: 'CASCADE' })},
      label TEXT,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      county TEXT,
      city TEXT,
      community TEXT,
      street_landmark TEXT,
      delivery_instructions TEXT,
      ${booleanColumn(driver, 'is_default', false)},
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  // —— Promotions ——
  await db.exec(`
    CREATE TABLE discounts (
      ${idColumn(driver)},
      name TEXT NOT NULL,
      description TEXT,
      discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
      ${moneyColumn(driver, 'value', { required: true })},
      ${moneyColumn(driver, 'minimum_order_amount')},
      ${timestampColumn(driver, 'starts_at', { required: false })},
      ${timestampColumn(driver, 'ends_at', { required: false })},
      ${booleanColumn(driver, 'active', true)},
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE coupons (
      ${idColumn(driver)},
      code TEXT NOT NULL UNIQUE,
      ${fk(driver, 'discount_id', 'discounts', { onDelete: 'CASCADE' })},
      ${integerColumn('usage_limit')},
      ${integerColumn('used_count', { required: true, defaultValue: 0 })},
      ${booleanColumn(driver, 'active', true)},
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  // —— Orders ——
  await db.exec(`
    CREATE TABLE orders (
      ${idColumn(driver)},
      order_number TEXT NOT NULL UNIQUE,
      ${fk(driver, 'user_id', 'users', { required: false, onDelete: 'SET NULL' })},
      ${fk(driver, 'customer_profile_id', 'customer_profiles', { required: false, onDelete: 'SET NULL' })},
      guest_email TEXT,
      guest_phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
          'pending', 'confirmed', 'awaiting_payment', 'paid', 'processing', 'packed',
          'ready_for_dispatch', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'
        )
      ),
      currency TEXT NOT NULL DEFAULT 'LRD',
      ${moneyColumn(driver, 'subtotal', { required: true })},
      ${moneyColumn(driver, 'discount_amount')},
      ${moneyColumn(driver, 'delivery_fee')},
      ${moneyColumn(driver, 'tax_amount')},
      ${moneyColumn(driver, 'total', { required: true })},
      ${fk(driver, 'coupon_id', 'coupons', { required: false, onDelete: 'SET NULL' })},
      ${fk(driver, 'address_id', 'addresses', { required: false, onDelete: 'SET NULL' })},
      delivery_snapshot ${jsonColumn(driver, 'delivery_snapshot').replace('delivery_snapshot ', '')},
      customer_snapshot ${jsonColumn(driver, 'customer_snapshot').replace('customer_snapshot ', '')},
      notes TEXT,
      admin_notes TEXT,
      idempotency_key TEXT UNIQUE,
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE order_items (
      ${idColumn(driver)},
      ${fk(driver, 'order_id', 'orders', { onDelete: 'CASCADE' })},
      ${fk(driver, 'product_id', 'products', { required: false, onDelete: 'SET NULL' })},
      ${fk(driver, 'variant_id', 'product_variants', { required: false, onDelete: 'SET NULL' })},
      product_snapshot ${isPostgres(driver) ? 'JSONB NOT NULL' : 'TEXT NOT NULL'},
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      ${moneyColumn(driver, 'unit_price', { required: true })},
      ${moneyColumn(driver, 'line_total', { required: true })},
      ${timestamps(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE order_status_history (
      ${idColumn(driver)},
      ${fk(driver, 'order_id', 'orders', { onDelete: 'CASCADE' })},
      from_status TEXT,
      to_status TEXT NOT NULL,
      note TEXT,
      ${fk(driver, 'changed_by', 'users', { required: false, onDelete: 'SET NULL' })},
      ${timestampColumn(driver, 'created_at', { required: true, defaultNow: true })}
    );
  `);

  // —— Payments ——
  await db.exec(`
    CREATE TABLE payments (
      ${idColumn(driver)},
      ${fk(driver, 'order_id', 'orders', { onDelete: 'CASCADE' })},
      method TEXT NOT NULL CHECK (
        method IN ('cod', 'mtn_momo', 'orange_money', 'card', 'bank_transfer', 'other')
      ),
      provider TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
          'pending', 'pending_verification', 'paid', 'failed', 'rejected',
          'refunded', 'cancelled'
        )
      ),
      ${moneyColumn(driver, 'amount', { required: true })},
      currency TEXT NOT NULL DEFAULT 'LRD',
      reference TEXT,
      evidence_url TEXT,
      customer_note TEXT,
      admin_note TEXT,
      ${fk(driver, 'verified_by', 'users', { required: false, onDelete: 'SET NULL' })},
      ${timestampColumn(driver, 'verified_at', { required: false })},
      ${timestamps(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE payment_attempts (
      ${idColumn(driver)},
      ${fk(driver, 'payment_id', 'payments', { onDelete: 'CASCADE' })},
      status TEXT NOT NULL,
      provider_response ${jsonColumn(driver, 'provider_response').replace('provider_response ', '')},
      ${timestampColumn(driver, 'created_at', { required: true, defaultNow: true })}
    );
  `);

  // —— Invoices & receipts ——
  await db.exec(`
    CREATE TABLE invoices (
      ${idColumn(driver)},
      invoice_number TEXT NOT NULL UNIQUE,
      ${fk(driver, 'order_id', 'orders', { onDelete: 'CASCADE' })},
      ${fk(driver, 'user_id', 'users', { required: false, onDelete: 'SET NULL' })},
      status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'void')),
      ${moneyColumn(driver, 'amount_due', { required: true })},
      ${moneyColumn(driver, 'amount_paid')},
      currency TEXT NOT NULL DEFAULT 'LRD',
      issued_at ${isPostgres(driver) ? 'TIMESTAMPTZ' : 'TEXT'},
      pdf_url TEXT,
      snapshot ${jsonColumn(driver, 'snapshot').replace('snapshot ', '')},
      ${timestamps(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE receipts (
      ${idColumn(driver)},
      receipt_number TEXT NOT NULL UNIQUE,
      ${fk(driver, 'order_id', 'orders', { onDelete: 'CASCADE' })},
      ${fk(driver, 'payment_id', 'payments', { required: false, onDelete: 'SET NULL' })},
      ${fk(driver, 'invoice_id', 'invoices', { required: false, onDelete: 'SET NULL' })},
      ${moneyColumn(driver, 'amount_paid', { required: true })},
      currency TEXT NOT NULL DEFAULT 'LRD',
      paid_at ${isPostgres(driver) ? 'TIMESTAMPTZ' : 'TEXT'},
      pdf_url TEXT,
      snapshot ${jsonColumn(driver, 'snapshot').replace('snapshot ', '')},
      ${timestamps(driver)}
    );
  `);

  // —— Delivery ——
  await db.exec(`
    CREATE TABLE delivery_zones (
      ${idColumn(driver)},
      name TEXT NOT NULL UNIQUE,
      county TEXT,
      communities ${jsonColumn(driver, 'communities').replace('communities ', '')},
      ${moneyColumn(driver, 'delivery_fee', { required: true })},
      ${moneyColumn(driver, 'minimum_free_delivery_amount')},
      estimated_time TEXT,
      ${booleanColumn(driver, 'active', true)},
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE drivers (
      ${idColumn(driver)},
      ${fk(driver, 'user_id', 'users', { required: false, onDelete: 'SET NULL' })},
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_delivery')),
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE vehicles (
      ${idColumn(driver)},
      label TEXT NOT NULL,
      plate_number TEXT,
      vehicle_type TEXT,
      ${booleanColumn(driver, 'active', true)},
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE deliveries (
      ${idColumn(driver)},
      delivery_number TEXT NOT NULL UNIQUE,
      ${fk(driver, 'order_id', 'orders', { onDelete: 'CASCADE' })},
      ${fk(driver, 'delivery_zone_id', 'delivery_zones', { required: false, onDelete: 'SET NULL' })},
      ${fk(driver, 'driver_id', 'drivers', { required: false, onDelete: 'SET NULL' })},
      ${fk(driver, 'vehicle_id', 'vehicles', { required: false, onDelete: 'SET NULL' })},
      customer_name TEXT,
      customer_phone TEXT,
      county TEXT,
      city TEXT,
      community TEXT,
      street_landmark TEXT,
      delivery_instructions TEXT,
      ${moneyColumn(driver, 'delivery_fee')},
      status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
          'pending', 'scheduled', 'assigned', 'picked_up', 'out_for_delivery',
          'attempted', 'delivered', 'failed', 'returned', 'cancelled'
        )
      ),
      dispatch_at ${isPostgres(driver) ? 'TIMESTAMPTZ' : 'TEXT'},
      expected_at ${isPostgres(driver) ? 'TIMESTAMPTZ' : 'TEXT'},
      delivered_at ${isPostgres(driver) ? 'TIMESTAMPTZ' : 'TEXT'},
      admin_notes TEXT,
      driver_notes TEXT,
      failure_reason TEXT,
      proof_of_delivery_url TEXT,
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE delivery_status_history (
      ${idColumn(driver)},
      ${fk(driver, 'delivery_id', 'deliveries', { onDelete: 'CASCADE' })},
      from_status TEXT,
      to_status TEXT NOT NULL,
      note TEXT,
      ${fk(driver, 'changed_by', 'users', { required: false, onDelete: 'SET NULL' })},
      ${timestampColumn(driver, 'created_at', { required: true, defaultNow: true })}
    );
  `);

  // —— Finance ——
  await db.exec(`
    CREATE TABLE transactions (
      ${idColumn(driver)},
      transaction_number TEXT NOT NULL UNIQUE,
      ${timestampColumn(driver, 'occurred_at', { required: true, defaultNow: true })},
      ${fk(driver, 'order_id', 'orders', { required: false, onDelete: 'SET NULL' })},
      ${fk(driver, 'user_id', 'users', { required: false, onDelete: 'SET NULL' })},
      payment_method TEXT,
      ${moneyColumn(driver, 'amount', { required: true })},
      currency TEXT NOT NULL DEFAULT 'LRD',
      type TEXT NOT NULL CHECK (
        type IN ('sale', 'payment', 'refund', 'expense', 'delivery_income', 'adjustment')
      ),
      status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('pending', 'posted', 'void')),
      reference TEXT,
      ${fk(driver, 'created_by', 'users', { required: false, onDelete: 'SET NULL' })},
      ${timestamps(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE expense_categories (
      ${idColumn(driver)},
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      ${booleanColumn(driver, 'active', true)},
      ${timestamps(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE expenses (
      ${idColumn(driver)},
      ${fk(driver, 'category_id', 'expense_categories', { onDelete: 'RESTRICT' })},
      description TEXT NOT NULL,
      ${moneyColumn(driver, 'amount', { required: true })},
      currency TEXT NOT NULL DEFAULT 'LRD',
      ${timestampColumn(driver, 'expense_date', { required: true, defaultNow: true })},
      payment_method TEXT,
      reference TEXT,
      receipt_url TEXT,
      ${fk(driver, 'entered_by', 'users', { required: false, onDelete: 'SET NULL' })},
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  // —— Content & feedback ——
  await db.exec(`
    CREATE TABLE reviews (
      ${idColumn(driver)},
      ${fk(driver, 'product_id', 'products', { onDelete: 'CASCADE' })},
      ${fk(driver, 'user_id', 'users', { required: false, onDelete: 'SET NULL' })},
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title TEXT,
      body TEXT,
      ${booleanColumn(driver, 'approved', false)},
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE testimonials (
      ${idColumn(driver)},
      customer_name TEXT NOT NULL,
      body TEXT NOT NULL,
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      ${booleanColumn(driver, 'featured', false)},
      ${booleanColumn(driver, 'active', true)},
      ${integerColumn('sort_order', { required: true, defaultValue: 0 })},
      ${timestamps(driver)},
      ${softDelete(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE notifications (
      ${idColumn(driver)},
      ${fk(driver, 'user_id', 'users', { required: false, onDelete: 'CASCADE' })},
      channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'whatsapp')),
      event_type TEXT NOT NULL,
      title TEXT,
      body TEXT,
      payload ${jsonColumn(driver, 'payload').replace('payload ', '')},
      status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'queued', 'sent', 'failed', 'read')
      ),
      ${timestampColumn(driver, 'read_at', { required: false })},
      ${timestampColumn(driver, 'sent_at', { required: false })},
      ${timestamps(driver)}
    );
  `);

  // —— Settings ——
  await db.exec(`
    CREATE TABLE site_settings (
      ${idColumn(driver)},
      key TEXT NOT NULL UNIQUE,
      value ${isPostgres(driver) ? 'JSONB' : 'TEXT'},
      description TEXT,
      ${timestamps(driver)}
    );
  `);

  await db.exec(`
    CREATE TABLE business_settings (
      ${idColumn(driver)},
      key TEXT NOT NULL UNIQUE,
      value ${isPostgres(driver) ? 'JSONB' : 'TEXT'},
      description TEXT,
      ${timestamps(driver)}
    );
  `);

  // —— Audit ——
  await db.exec(`
    CREATE TABLE audit_logs (
      ${idColumn(driver)},
      ${fk(driver, 'actor_id', 'users', { required: false, onDelete: 'SET NULL' })},
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id ${isPostgres(driver) ? 'TEXT' : 'TEXT'},
      old_value ${jsonColumn(driver, 'old_value').replace('old_value ', '')},
      new_value ${jsonColumn(driver, 'new_value').replace('new_value ', '')},
      ip_address TEXT,
      user_agent TEXT,
      ${timestampColumn(driver, 'created_at', { required: true, defaultNow: true })}
    );
  `);

  // —— Indexes ——
  await db.exec(`
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_phone ON users(phone);
    CREATE INDEX idx_users_type_status ON users(user_type, status);
    CREATE INDEX idx_products_slug ON products(slug);
    CREATE INDEX idx_products_category ON products(category_id);
    CREATE INDEX idx_products_status_active ON products(status, active);
    CREATE INDEX idx_product_variants_product ON product_variants(product_id);
    CREATE INDEX idx_inventory_product ON inventory(product_id);
    CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
    CREATE INDEX idx_orders_number ON orders(order_number);
    CREATE INDEX idx_orders_user ON orders(user_id);
    CREATE INDEX idx_orders_status ON orders(status);
    CREATE INDEX idx_order_items_order ON order_items(order_id);
    CREATE INDEX idx_payments_order ON payments(order_id);
    CREATE INDEX idx_payments_status ON payments(status);
    CREATE INDEX idx_deliveries_order ON deliveries(order_id);
    CREATE INDEX idx_deliveries_status ON deliveries(status);
    CREATE INDEX idx_deliveries_driver ON deliveries(driver_id);
    CREATE INDEX idx_transactions_type ON transactions(type);
    CREATE INDEX idx_transactions_occurred ON transactions(occurred_at);
    CREATE INDEX idx_expenses_date ON expenses(expense_date);
    CREATE INDEX idx_notifications_user ON notifications(user_id);
    CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
    CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
    CREATE INDEX idx_carts_user ON carts(user_id);
    CREATE INDEX idx_addresses_user ON addresses(user_id);
  `);
}
