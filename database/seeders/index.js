import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDatabase, getDbDriver, resetDatabaseAdapterForTests } from '../connection.js';
import { boolValue, isPostgres, jsonValue, toDriverSql } from '../dialect.js';
import { serverEnv } from '../../server/config/env.js';

function uuid() {
  return crypto.randomUUID();
}

async function insert(db, driver, table, row) {
  const keys = Object.keys(row);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = toDriverSql(
    driver,
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
  );
  await db.query(
    sql,
    keys.map((key) => row[key])
  );
}

async function countRows(db, driver, table) {
  const result = await db.query(toDriverSql(driver, `SELECT COUNT(*) AS count FROM ${table}`));
  const raw = result.rows?.[0]?.count ?? result.rows?.[0]?.COUNT ?? 0;
  return Number(raw);
}

const ROLES = [
  {
    slug: 'super_admin',
    name: 'Super Admin',
    description: 'Full platform access',
  },
  {
    slug: 'store_manager',
    name: 'Store Manager',
    description: 'Commerce and store operations',
  },
  {
    slug: 'sales_officer',
    name: 'Sales Officer',
    description: 'Orders and customer sales support',
  },
  {
    slug: 'inventory_officer',
    name: 'Inventory Officer',
    description: 'Stock and inventory movements',
  },
  {
    slug: 'delivery_manager',
    name: 'Delivery Manager',
    description: 'Dispatch, drivers, and delivery zones',
  },
  {
    slug: 'finance_officer',
    name: 'Finance Officer',
    description: 'Payments, expenses, and financial reports',
  },
  {
    slug: 'customer_support',
    name: 'Customer Support',
    description: 'Customer accounts and order support',
  },
];

const PERMISSIONS = [
  'products.view',
  'products.create',
  'products.update',
  'products.delete',
  'categories.view',
  'categories.manage',
  'orders.view',
  'orders.update',
  'orders.cancel',
  'payments.view',
  'payments.verify',
  'inventory.view',
  'inventory.adjust',
  'customers.view',
  'customers.manage',
  'delivery.view',
  'delivery.assign',
  'delivery.update',
  'finance.view',
  'expenses.create',
  'expenses.manage',
  'reports.view',
  'reports.export',
  'content.manage',
  'settings.manage',
  'staff.manage',
  'roles.manage',
  'audit.view',
];

const ROLE_PERMISSION_MAP = {
  super_admin: PERMISSIONS,
  store_manager: [
    'products.view',
    'products.create',
    'products.update',
    'categories.view',
    'categories.manage',
    'orders.view',
    'orders.update',
    'payments.view',
    'inventory.view',
    'customers.view',
    'delivery.view',
    'reports.view',
    'content.manage',
  ],
  sales_officer: [
    'products.view',
    'orders.view',
    'orders.update',
    'customers.view',
    'payments.view',
  ],
  inventory_officer: [
    'products.view',
    'inventory.view',
    'inventory.adjust',
    'categories.view',
    'reports.view',
  ],
  delivery_manager: [
    'orders.view',
    'delivery.view',
    'delivery.assign',
    'delivery.update',
    'customers.view',
  ],
  finance_officer: [
    'orders.view',
    'payments.view',
    'payments.verify',
    'finance.view',
    'expenses.create',
    'expenses.manage',
    'reports.view',
    'reports.export',
  ],
  customer_support: ['orders.view', 'customers.view', 'customers.manage', 'delivery.view'],
};

/**
 * Development / bootstrap seed.
 * Does not invent storefront mock UI data.
 * Product prices remain admin-managed — none seeded here.
 */
export async function runSeeders({ force = false } = {}) {
  const driver = getDbDriver();
  const db = await getDatabase();

  try {
    const roleCount = await countRows(db, driver, 'roles');
    if (roleCount > 0 && !force) {
      console.log(
        'Seed skipped: structural data already present. Use npm run db:reset for local SQLite, or seed missing admin/settings only with --force.'
      );
      return { skipped: true, driver };
    }

    await db.withTransaction(async (tx) => {
      const client = wrapClient(db, tx, driver);

      if (roleCount === 0) {
        await seedRolesAndPermissions(client, driver);
        await seedExpenseCategories(client, driver);
        await seedCategories(client, driver);
      } else if (force) {
        console.log('Roles already present — skipping role/category re-insert.');
      }

      await seedSettings(client, driver, { upsert: force || roleCount > 0 });
      await seedDevAdmin(client, driver);
    });

    return { skipped: false, driver };
  } finally {
    await db.close();
    resetDatabaseAdapterForTests();
  }
}

function wrapClient(db, tx, driver) {
  if (driver === 'postgres' && tx?.query) {
    return {
      async query(text, params = []) {
        return tx.query(text, params);
      },
    };
  }
  if (driver === 'sqlite' && tx?.prepare) {
    return {
      async query(text, params = []) {
        const trimmed = text.trim().toLowerCase();
        const statement = tx.prepare(text);
        if (trimmed.startsWith('select') || trimmed.startsWith('pragma')) {
          const rows = statement.all(...params);
          return { rows, rowCount: rows.length };
        }
        const info = statement.run(...params);
        return { rows: [], rowCount: info.changes, lastInsertRowid: info.lastInsertRowid };
      },
    };
  }
  return db;
}

async function seedRolesAndPermissions(db, driver) {
  const roleIds = {};
  for (const role of ROLES) {
    const id = uuid();
    roleIds[role.slug] = id;
    await insert(db, driver, 'roles', {
      id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      is_system: boolValue(driver, true),
    });
  }

  const permissionIds = {};
  for (const slug of PERMISSIONS) {
    const id = uuid();
    permissionIds[slug] = id;
    await insert(db, driver, 'permissions', {
      id,
      slug,
      name: slug,
      description: `Permission: ${slug}`,
    });
  }

  for (const [roleSlug, permissionSlugs] of Object.entries(ROLE_PERMISSION_MAP)) {
    for (const permissionSlug of permissionSlugs) {
      await insert(db, driver, 'role_permissions', {
        role_id: roleIds[roleSlug],
        permission_id: permissionIds[permissionSlug],
      });
    }
  }

  console.log(`✓ Seeded ${ROLES.length} roles and ${PERMISSIONS.length} permissions`);
}

async function seedExpenseCategories(db, driver) {
  const categories = [
    ['Fuel', 'fuel'],
    ['Delivery', 'delivery'],
    ['Packaging', 'packaging'],
    ['Staff', 'staff'],
    ['Utilities', 'utilities'],
    ['Marketing', 'marketing'],
    ['Stock Purchase', 'stock-purchase'],
    ['Maintenance', 'maintenance'],
    ['Other', 'other'],
  ];

  for (const [name, slug] of categories) {
    await insert(db, driver, 'expense_categories', {
      id: uuid(),
      name,
      slug,
      description: null,
      active: boolValue(driver, true),
    });
  }

  console.log(`✓ Seeded ${categories.length} expense categories`);
}

async function seedCategories(db, driver) {
  const categories = [
    {
      name: 'Charcoal',
      slug: 'charcoal',
      description: 'Shield Wolf charcoal products',
      sort_order: 1,
    },
    {
      name: 'Red Palm Oil',
      slug: 'red-palm-oil',
      description: 'Shield Wolf Divine Red Palm Oil',
      sort_order: 2,
    },
    {
      name: 'Other Products',
      slug: 'other-products',
      description: 'Additional Shield Wolf products',
      sort_order: 3,
    },
  ];

  for (const category of categories) {
    await insert(db, driver, 'categories', {
      id: uuid(),
      parent_id: null,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image_url: null,
      sort_order: category.sort_order,
      active: boolValue(driver, true),
    });
  }

  console.log(`✓ Seeded ${categories.length} product categories (no product prices)`);
}

async function seedSettings(db, driver, { upsert = false } = {}) {
  const business = {
    business_name: 'Shield Wolf',
    logo_url: null,
    favicon_url: null,
    phones: ['+231 778 450 169', '+231 881 938 277', '+231 775 580 655'],
    emails: ['swcharcoal@gmail.com', 'shieldwolfcharcoal@gmail.com'],
    whatsapp: '+231 778 450 169',
    address: {
      line: 'Gardnersville / Japanese Freeway',
      city: 'Monrovia',
      country: 'Liberia',
    },
    currency: 'LRD',
    business_hours: 'Open daily — delivery available',
    social_links: {},
    invoice_footer: 'Thank you for choosing Shield Wolf.',
    receipt_footer: 'Thank you for your payment.',
    tax_enabled: false,
    tax_rate: 0,
    minimum_order_amount: null,
    free_delivery_threshold: null,
  };

  const site = {
    announcement_message: 'Premium Products • Reliable Service • Delivery Available',
    announcement_active: true,
    hero_headline: 'Premium Quality. Delivered to Your Door.',
    hero_supporting_text:
      'Shop Shield Wolf premium charcoal, red palm oil and other trusted products with convenient ordering and reliable delivery.',
    hero_image_url: '/demo/banner_1.jpeg',
  };

  const about = {
    title: 'About Shield Wolf',
    intro:
      'Shield Wolf provides premium charcoal, red palm oil, and reliable delivery across Liberia.',
    mission:
      'Deliver quality household and commercial products with dependable service and local pride.',
    vision: 'Be Liberia’s most trusted name for charcoal, palm oil, and everyday essentials.',
    body: 'Produced in Liberia for homes, restaurants, retailers, and outdoor cooking businesses.',
  };

  const faq = {
    title: 'Frequently Asked Questions',
    intro: 'Answers to common questions about ordering, payment, and delivery.',
    items: [
      {
        question: 'How do I place an order?',
        answer:
          'Browse the shop, add products to your cart, and complete checkout. You can pay with MTN MoMo or Orange Money.',
      },
      {
        question: 'Do you deliver?',
        answer:
          'Yes. Delivery is available across supported Monrovia communities. Fees and free-delivery rules depend on your zone.',
      },
      {
        question: 'How do I track my order?',
        answer: 'Use Track Order with your order number and the phone used at checkout.',
      },
    ],
  };

  const contact = {
    title: 'Contact Us',
    intro:
      'Reach Shield Wolf by phone, WhatsApp, or email. Business details are managed in settings.',
    form_note: 'For order help, include your order number when you message us.',
  };

  const deliveryPage = {
    title: 'Delivery Information',
    intro: 'We deliver premium products across supported communities in Monrovia.',
    body: 'Delivery fees and free-delivery thresholds are set per zone. Checkout shows the fee for your address.',
    notes: 'Same-day and next-day options depend on rider availability and order timing.',
  };

  const encode = (value) => (isPostgres(driver) ? value : jsonValue(driver, value));

  async function ensureSetting(table, key, value, description) {
    const existing = await db.query(toDriverSql(driver, `SELECT id FROM ${table} WHERE key = ?`), [
      key,
    ]);
    if (existing.rows?.length) {
      if (!upsert) return;
      await db.query(
        toDriverSql(driver, `UPDATE ${table} SET value = ?, description = ? WHERE key = ?`),
        [encode(value), description, key]
      );
      return;
    }
    await insert(db, driver, table, {
      id: uuid(),
      key,
      value: encode(value),
      description,
    });
  }

  await ensureSetting(
    'business_settings',
    'general',
    business,
    'Core business configuration (admin-editable)'
  );
  await ensureSetting('site_settings', 'homepage', site, 'Homepage / announcement CMS settings');
  await ensureSetting('site_settings', 'about', about, 'About page CMS');
  await ensureSetting('site_settings', 'faq', faq, 'FAQ page CMS');
  await ensureSetting('site_settings', 'contact', contact, 'Contact page CMS');
  await ensureSetting('site_settings', 'delivery_page', deliveryPage, 'Public delivery info CMS');
  await ensureSetting(
    'site_settings',
    'announcements',
    {
      message: site.announcement_message,
      active: site.announcement_active,
    },
    'Site-wide announcement bar'
  );
  await ensureSetting('site_settings', 'banners', { items: [] }, 'Promotional banners');

  console.log('✓ Seeded business_settings and site_settings defaults');
}

async function seedDevAdmin(db, driver) {
  if (serverEnv.isProd && process.env.ALLOW_PROD_SEED_ADMIN !== 'true') {
    console.log('✓ Skipped dev admin seed in production');
    return;
  }

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@shieldwolf.local';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMeNow!123';
  const existing = await db.query(toDriverSql(driver, 'SELECT id FROM users WHERE email = ?'), [
    email,
  ]);
  if (existing.rows?.length) {
    console.log(`✓ Admin user already exists (${email})`);
    return;
  }

  const userId = uuid();
  const profileId = uuid();
  const passwordHash = await bcrypt.hash(password, serverEnv.bcryptSaltRounds);

  await insert(db, driver, 'users', {
    id: userId,
    email,
    phone: null,
    password_hash: passwordHash,
    user_type: 'admin',
    status: 'active',
  });

  await insert(db, driver, 'admin_profiles', {
    id: profileId,
    user_id: userId,
    display_name: 'Shield Wolf Admin',
    job_title: 'Super Admin',
  });

  const role = await db.query(toDriverSql(driver, 'SELECT id FROM roles WHERE slug = ?'), [
    'super_admin',
  ]);
  const roleId = role.rows?.[0]?.id;
  if (roleId) {
    await insert(db, driver, 'user_roles', {
      user_id: userId,
      role_id: roleId,
    });
  }

  console.log(`✓ Seeded development admin (${email}) — change password immediately`);
}
