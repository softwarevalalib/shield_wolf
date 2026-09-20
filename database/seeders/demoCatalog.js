/**
 * Demo catalog seeder — products, inventory, testimonials, zones, enriched CMS.
 * Safe to re-run: upserts by slug / known keys. Does not create fake orders.
 *
 * Usage:
 *   npm run db:seed:demo
 *   SEED_DEMO=true npm run db:seed
 */
import crypto from 'node:crypto';
import { getDatabase, getDbDriver, resetDatabaseAdapterForTests } from '../connection.js';
import { boolValue, jsonValue, toDriverSql } from '../dialect.js';

function uuid() {
  return crypto.randomUUID();
}

function encodeJson(driver, value) {
  return jsonValue(driver, value);
}

async function insert(db, driver, table, row) {
  const keys = Object.keys(row);
  const placeholders = keys.map(() => '?').join(', ');
  await db.query(
    toDriverSql(driver, `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`),
    keys.map((key) => row[key])
  );
}

function wrapClient(db, tx, driver) {
  if (driver === 'postgres' && tx?.query) {
    return { query: (text, params = []) => tx.query(text, params) };
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

const DEMO_IMAGES = {
  product: '/demo/product.jpeg',
  detail: '/demo/detail_1.jpeg',
  banner: '/demo/banner_1.jpeg',
  lifestyle: '/demo/img.jpeg',
  logo: '/logo.jpeg',
};

const DEMO_PRODUCTS = [
  {
    slug: 'premium-lump-charcoal-5kg',
    sku: 'SW-DEMO-CH-5',
    name: 'Premium Lump Charcoal — 5 kg',
    category: 'charcoal',
    short_description: 'Clean-burning lump charcoal for home cooking and small gatherings.',
    description:
      'Shield Wolf premium lump charcoal in a convenient 5 kg pack. Long burn time, low smoke, ideal for everyday cooking and weekend grilling.',
    size: '5 kg',
    unit: 'bag',
    price: 850,
    compare_at_price: 950,
    cost_price: 520,
    stock: 120,
    featured: true,
    images: [DEMO_IMAGES.product, DEMO_IMAGES.detail],
  },
  {
    slug: 'premium-lump-charcoal-10kg',
    sku: 'SW-DEMO-CH-10',
    name: 'Premium Lump Charcoal — 10 kg',
    category: 'charcoal',
    short_description: 'Best-value pack for families and frequent cooks.',
    description:
      'A 10 kg bag of Shield Wolf lump charcoal — consistent heat for homes that cook with charcoal every day.',
    size: '10 kg',
    unit: 'bag',
    price: 1500,
    compare_at_price: 1700,
    cost_price: 900,
    stock: 95,
    featured: true,
    images: [DEMO_IMAGES.product, DEMO_IMAGES.banner],
  },
  {
    slug: 'restaurant-charcoal-sack-25kg',
    sku: 'SW-DEMO-CH-25',
    name: 'Restaurant Charcoal Sack — 25 kg',
    category: 'charcoal',
    short_description: 'Bulk charcoal for restaurants, cookshops, and events.',
    description:
      'Heavy-duty 25 kg sack sized for commercial kitchens. Reliable supply for high-volume grilling and open-fire cooking.',
    size: '25 kg',
    unit: 'sack',
    price: 3200,
    compare_at_price: null,
    cost_price: 2100,
    stock: 48,
    featured: false,
    images: [DEMO_IMAGES.banner, DEMO_IMAGES.product],
  },
  {
    slug: 'bbq-starter-pack-2kg',
    sku: 'SW-DEMO-CH-2',
    name: 'BBQ Starter Pack — 2 kg',
    category: 'charcoal',
    short_description: 'Compact pack for quick outdoor grilling.',
    description:
      'A 2 kg starter pack perfect for picnics, beach cookouts, and first-time Shield Wolf customers.',
    size: '2 kg',
    unit: 'bag',
    price: 450,
    compare_at_price: 500,
    cost_price: 260,
    stock: 160,
    featured: false,
    images: [DEMO_IMAGES.detail],
  },
  {
    slug: 'divine-red-palm-oil-1l',
    sku: 'SW-DEMO-PO-1',
    name: 'Divine Red Palm Oil — 1 L',
    category: 'red-palm-oil',
    short_description: 'Rich red palm oil for everyday Liberian cooking.',
    description:
      'Shield Wolf Divine Red Palm Oil in a 1 litre bottle — deep color, authentic flavor for soups, stews, and rice dishes.',
    size: '1 L',
    unit: 'bottle',
    price: 650,
    compare_at_price: 720,
    cost_price: 380,
    stock: 140,
    featured: true,
    images: [DEMO_IMAGES.detail, DEMO_IMAGES.lifestyle],
  },
  {
    slug: 'divine-red-palm-oil-5l',
    sku: 'SW-DEMO-PO-5',
    name: 'Divine Red Palm Oil — 5 L',
    category: 'red-palm-oil',
    short_description: 'Family and cookshop size with lasting value.',
    description:
      'Five litres of Divine Red Palm Oil for busy households and small food businesses.',
    size: '5 L',
    unit: 'jerry',
    price: 2800,
    compare_at_price: 3100,
    cost_price: 1750,
    stock: 72,
    featured: true,
    images: [DEMO_IMAGES.detail, DEMO_IMAGES.banner],
  },
  {
    slug: 'divine-red-palm-oil-20l',
    sku: 'SW-DEMO-PO-20',
    name: 'Divine Red Palm Oil — 20 L',
    category: 'red-palm-oil',
    short_description: 'Wholesale drum for restaurants and retailers.',
    description:
      'Twenty-litre supply of Divine Red Palm Oil for high-volume kitchens and resellers.',
    size: '20 L',
    unit: 'drum',
    price: 9500,
    compare_at_price: null,
    cost_price: 6200,
    stock: 28,
    featured: false,
    images: [DEMO_IMAGES.lifestyle],
  },
  {
    slug: 'cooking-palm-oil-750ml',
    sku: 'SW-DEMO-PO-750',
    name: 'Cooking Palm Oil — 750 ml',
    category: 'red-palm-oil',
    short_description: 'Everyday bottle for light cooking needs.',
    description: 'A handy 750 ml bottle of cooking palm oil — easy to store and pour.',
    size: '750 ml',
    unit: 'bottle',
    price: 480,
    compare_at_price: 520,
    cost_price: 280,
    stock: 110,
    featured: false,
    images: [DEMO_IMAGES.detail],
  },
  {
    slug: 'fire-starter-cubes-12pc',
    sku: 'SW-DEMO-OT-FS',
    name: 'Fire Starter Cubes — 12 pc',
    category: 'other-products',
    short_description: 'Quick, clean ignition for charcoal fires.',
    description: 'Twelve fire starter cubes that light charcoal fast with less smoke and fuss.',
    size: '12 pieces',
    unit: 'box',
    price: 350,
    compare_at_price: null,
    cost_price: 180,
    stock: 200,
    featured: false,
    images: [DEMO_IMAGES.lifestyle],
  },
  {
    slug: 'charcoal-grill-basket',
    sku: 'SW-DEMO-OT-GB',
    name: 'Charcoal Grill Basket',
    category: 'other-products',
    short_description: 'Sturdy basket for even charcoal burning.',
    description:
      'Metal grill basket designed for Shield Wolf charcoal — safer handling and better airflow.',
    size: 'Standard',
    unit: 'each',
    price: 1200,
    compare_at_price: 1350,
    cost_price: 700,
    stock: 35,
    featured: false,
    images: [DEMO_IMAGES.banner],
  },
  {
    slug: 'shield-wolf-gift-bundle',
    sku: 'SW-DEMO-OT-GIFT',
    name: 'Shield Wolf Gift Bundle',
    category: 'other-products',
    short_description: 'Charcoal + palm oil starter set for new customers.',
    description:
      'A curated gift bundle with 5 kg charcoal and 1 L Divine Red Palm Oil — perfect for households discovering Shield Wolf.',
    size: 'Bundle',
    unit: 'set',
    price: 2500,
    compare_at_price: 2800,
    cost_price: 1500,
    stock: 40,
    featured: true,
    images: [DEMO_IMAGES.lifestyle, DEMO_IMAGES.product, DEMO_IMAGES.detail],
  },
];

const TESTIMONIALS = [
  {
    customer_name: 'Mary K., Gardnersville',
    body: 'The charcoal burns long and clean. Delivery arrived the same afternoon — exactly what my cookshop needed.',
    rating: 5,
    featured: true,
    sort_order: 1,
  },
  {
    customer_name: 'Joseph T., Paynesville',
    body: 'Divine Red Palm Oil has that deep color we trust for palm butter. Ordering online saved me a trip across town.',
    rating: 5,
    featured: true,
    sort_order: 2,
  },
  {
    customer_name: 'Hawa S., Sinkor',
    body: 'Transparent prices, clear delivery zones, and the tracking link kept me updated. Will order again.',
    rating: 5,
    featured: true,
    sort_order: 3,
  },
  {
    customer_name: 'Emmanuel B., Congo Town',
    body: 'We switched our restaurant to Shield Wolf 25 kg sacks. Supply has been consistent week after week.',
    rating: 4,
    featured: false,
    sort_order: 4,
  },
  {
    customer_name: 'Grace N., Red Light',
    body: 'The gift bundle was perfect for my sister’s new home. Quality products and friendly delivery.',
    rating: 5,
    featured: true,
    sort_order: 5,
  },
];

const ZONES = [
  {
    name: 'Gardnersville',
    county: 'Montserrado',
    communities: ['Gardnersville', 'Japanese Freeway'],
    fee: 150,
    freeAt: 2000,
    eta: 'Same day / next day',
  },
  {
    name: 'Paynesville',
    county: 'Montserrado',
    communities: ['Paynesville', 'Red Light'],
    fee: 200,
    freeAt: 2500,
    eta: '1–2 days',
  },
  {
    name: 'Central Monrovia',
    county: 'Montserrado',
    communities: ['Sinkor', 'Congo Town', 'Central Monrovia'],
    fee: 250,
    freeAt: 3000,
    eta: '1–2 days',
  },
];

export async function runDemoCatalogSeed() {
  const driver = getDbDriver();
  const db = await getDatabase();

  try {
    await db.withTransaction(async (tx) => {
      const client = wrapClient(db, tx, driver);
      await enrichCategories(client, driver);
      await seedDeliveryZones(client, driver);
      await seedProductsAndInventory(client, driver);
      await seedTestimonials(client, driver);
      await enrichCms(client, driver);
      await seedMediaLibrary(client, driver);
    });

    return { driver, products: DEMO_PRODUCTS.length };
  } finally {
    await db.close();
    resetDatabaseAdapterForTests();
  }
}

async function enrichCategories(db, driver) {
  const updates = [
    {
      slug: 'charcoal',
      description: 'Premium lump charcoal for homes, cookshops, and restaurants across Liberia.',
      image_url: DEMO_IMAGES.product,
    },
    {
      slug: 'red-palm-oil',
      description: 'Divine Red Palm Oil — rich color and authentic flavor in every size.',
      image_url: DEMO_IMAGES.detail,
    },
    {
      slug: 'other-products',
      description: 'Accessories, starters, and curated bundles that pair with Shield Wolf staples.',
      image_url: DEMO_IMAGES.lifestyle,
    },
  ];

  for (const row of updates) {
    const result = await db.query(
      toDriverSql(driver, `UPDATE categories SET description = ?, image_url = ? WHERE slug = ?`),
      [row.description, row.image_url, row.slug]
    );
    if (!result.rowCount) {
      await insert(db, driver, 'categories', {
        id: uuid(),
        parent_id: null,
        name: row.slug
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
          .replace('Red Palm Oil', 'Red Palm Oil'),
        slug: row.slug,
        description: row.description,
        image_url: row.image_url,
        sort_order: row.slug === 'charcoal' ? 1 : row.slug === 'red-palm-oil' ? 2 : 3,
        active: boolValue(driver, true),
      });
    }
  }

  // Fix category display names if we inserted via slug
  await db.query(
    toDriverSql(driver, `UPDATE categories SET name = ? WHERE slug = ?`),
    ['Charcoal', 'charcoal']
  );
  await db.query(
    toDriverSql(driver, `UPDATE categories SET name = ? WHERE slug = ?`),
    ['Red Palm Oil', 'red-palm-oil']
  );
  await db.query(
    toDriverSql(driver, `UPDATE categories SET name = ? WHERE slug = ?`),
    ['Other Products', 'other-products']
  );

  console.log('✓ Demo categories enriched with images');
}

async function seedDeliveryZones(db, driver) {
  for (const zone of ZONES) {
    const existing = await db.query(
      toDriverSql(driver, `SELECT id FROM delivery_zones WHERE name = ? AND deleted_at IS NULL`),
      [zone.name]
    );
    if (existing.rows?.length) continue;

    await insert(db, driver, 'delivery_zones', {
      id: uuid(),
      name: zone.name,
      county: zone.county,
      communities: encodeJson(driver, zone.communities),
      delivery_fee: zone.fee,
      minimum_free_delivery_amount: zone.freeAt,
      estimated_time: zone.eta,
      active: boolValue(driver, true),
    });
  }
  console.log(`✓ Demo delivery zones ready (${ZONES.length})`);
}

async function seedProductsAndInventory(db, driver) {
  const categoryIds = {};
  const catRows = await db.query(toDriverSql(driver, `SELECT id, slug FROM categories`));
  for (const row of catRows.rows || []) {
    categoryIds[row.slug] = row.id;
  }

  let created = 0;
  let updated = 0;

  for (const product of DEMO_PRODUCTS) {
    const categoryId = categoryIds[product.category] || null;
    const existing = await db.query(
      toDriverSql(driver, `SELECT id FROM products WHERE slug = ? LIMIT 1`),
      [product.slug]
    );

    const thumbnail = product.images[0];
    let productId;

    if (existing.rows?.length) {
      productId = existing.rows[0].id;
      await db.query(
        toDriverSql(
          driver,
          `UPDATE products SET
            name = ?, sku = ?, description = ?, short_description = ?, category_id = ?,
            price = ?, compare_at_price = ?, cost_price = ?, currency = ?,
            stock_quantity = ?, low_stock_threshold = ?, size = ?, unit = ?,
            featured = ?, active = ?, status = ?, thumbnail_url = ?, brand = ?,
            seo_title = ?, seo_description = ?
           WHERE id = ?`
        ),
        [
          product.name,
          product.sku,
          product.description,
          product.short_description,
          categoryId,
          product.price,
          product.compare_at_price,
          product.cost_price,
          'LRD',
          product.stock,
          8,
          product.size,
          product.unit,
          boolValue(driver, product.featured),
          boolValue(driver, true),
          'published',
          thumbnail,
          'Shield Wolf',
          `${product.name} | Shield Wolf`,
          product.short_description,
          productId,
        ]
      );
      await db.query(toDriverSql(driver, `DELETE FROM product_images WHERE product_id = ?`), [
        productId,
      ]);
      updated += 1;
    } else {
      productId = uuid();
      await insert(db, driver, 'products', {
        id: productId,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        barcode: null,
        description: product.description,
        short_description: product.short_description,
        category_id: categoryId,
        subcategory: null,
        brand: 'Shield Wolf',
        price: product.price,
        compare_at_price: product.compare_at_price,
        cost_price: product.cost_price,
        currency: 'LRD',
        tax: null,
        stock_quantity: product.stock,
        low_stock_threshold: 8,
        weight: null,
        weight_unit: null,
        size: product.size,
        unit: product.unit,
        featured: boolValue(driver, product.featured),
        active: boolValue(driver, true),
        status: 'published',
        thumbnail_url: thumbnail,
        seo_title: `${product.name} | Shield Wolf`,
        seo_description: product.short_description,
      });
      created += 1;
    }

    for (let i = 0; i < product.images.length; i += 1) {
      await insert(db, driver, 'product_images', {
        id: uuid(),
        product_id: productId,
        url: product.images[i],
        alt_text: product.name,
        sort_order: i,
        is_primary: boolValue(driver, i === 0),
      });
    }

    const inv = await db.query(
      toDriverSql(
        driver,
        `SELECT id FROM inventory WHERE product_id = ? AND variant_id IS NULL LIMIT 1`
      ),
      [productId]
    );
    if (inv.rows?.length) {
      await db.query(
        toDriverSql(
          driver,
          `UPDATE inventory SET quantity = ?, low_stock_threshold = ? WHERE id = ?`
        ),
        [product.stock, 8, inv.rows[0].id]
      );
    } else {
      await insert(db, driver, 'inventory', {
        id: uuid(),
        product_id: productId,
        variant_id: null,
        quantity: product.stock,
        low_stock_threshold: 8,
      });
    }

    const movementExists = await db.query(
      toDriverSql(
        driver,
        `SELECT id FROM inventory_movements WHERE product_id = ? AND reference_type = ? LIMIT 1`
      ),
      [productId, 'demo_seed']
    );
    if (!movementExists.rows?.length) {
      await insert(db, driver, 'inventory_movements', {
        id: uuid(),
        product_id: productId,
        variant_id: null,
        movement_type: 'restock',
        quantity_delta: product.stock,
        quantity_before: 0,
        quantity_after: product.stock,
        reason: 'Demo catalog seed',
        reference_type: 'demo_seed',
        reference_id: null,
        created_by: null,
      });
    }
  }

  console.log(`✓ Demo products: ${created} created, ${updated} updated`);
}

async function seedTestimonials(db, driver) {
  const count = await db.query(
    toDriverSql(driver, `SELECT COUNT(*) AS count FROM testimonials WHERE deleted_at IS NULL`)
  );
  const existingCount = Number(count.rows?.[0]?.count || 0);

  if (existingCount >= TESTIMONIALS.length) {
    console.log('✓ Testimonials already present — leaving as-is');
    return;
  }

  for (const item of TESTIMONIALS) {
    const found = await db.query(
      toDriverSql(
        driver,
        `SELECT id FROM testimonials WHERE customer_name = ? AND deleted_at IS NULL LIMIT 1`
      ),
      [item.customer_name]
    );
    if (found.rows?.length) continue;
    await insert(db, driver, 'testimonials', {
      id: uuid(),
      customer_name: item.customer_name,
      body: item.body,
      rating: item.rating,
      featured: boolValue(driver, item.featured),
      active: boolValue(driver, true),
      sort_order: item.sort_order,
    });
  }
  console.log(`✓ Seeded testimonials (target ${TESTIMONIALS.length})`);
}

async function enrichCms(db, driver) {
  const homepage = {
    announcement_message:
      'Free delivery tips · Premium charcoal & Divine Red Palm Oil · Order online',
    announcement_active: true,
    hero_headline: 'Premium Quality. Delivered to Your Door.',
    hero_supporting_text:
      'Shop Shield Wolf charcoal, Divine Red Palm Oil, and trusted essentials — ordered online, delivered across Monrovia.',
    hero_image_url: DEMO_IMAGES.banner,
  };

  const banners = {
    items: [
      {
        title: 'Stock up on charcoal',
        imageUrl: DEMO_IMAGES.product,
        link: '/shop/charcoal',
        active: true,
      },
      {
        title: 'Divine Red Palm Oil',
        imageUrl: DEMO_IMAGES.detail,
        link: '/shop/red-palm-oil',
        active: true,
      },
      {
        title: 'Gift bundle for new homes',
        imageUrl: DEMO_IMAGES.lifestyle,
        link: '/product/shield-wolf-gift-bundle',
        active: true,
      },
    ],
  };

  // Objects are fine as raw values for JSONB via node-pg; stringify for SQLite TEXT.
  const encodeSetting = (value) =>
    driver === 'postgres' ? value : jsonValue(driver, value);

  async function upsertSite(key, value, description) {
    const existing = await db.query(
      toDriverSql(driver, `SELECT id FROM site_settings WHERE key = ?`),
      [key]
    );
    const encoded = encodeSetting(value);
    if (existing.rows?.length) {
      await db.query(
        toDriverSql(driver, `UPDATE site_settings SET value = ?, description = ? WHERE key = ?`),
        [encoded, description, key]
      );
    } else {
      await insert(db, driver, 'site_settings', {
        id: uuid(),
        key,
        value: encoded,
        description,
      });
    }
  }

  await upsertSite('homepage', homepage, 'Homepage / announcement CMS settings');
  await upsertSite(
    'announcements',
    {
      message: homepage.announcement_message,
      active: homepage.announcement_active,
    },
    'Site-wide announcement bar'
  );
  await upsertSite('banners', banners, 'Promotional banners');

  console.log('✓ Demo homepage CMS and banners updated');
}

async function seedMediaLibrary(db, driver) {
  const assets = [
    { url: DEMO_IMAGES.banner, alt: 'Shield Wolf banner' },
    { url: DEMO_IMAGES.product, alt: 'Shield Wolf charcoal' },
    { url: DEMO_IMAGES.detail, alt: 'Shield Wolf palm oil' },
    { url: DEMO_IMAGES.lifestyle, alt: 'Shield Wolf lifestyle' },
    { url: DEMO_IMAGES.logo, alt: 'Shield Wolf logo' },
  ];

  for (const asset of assets) {
    const existing = await db.query(
      toDriverSql(driver, `SELECT id FROM media WHERE url = ? AND deleted_at IS NULL LIMIT 1`),
      [asset.url]
    );
    if (existing.rows?.length) continue;
    await insert(db, driver, 'media', {
      id: uuid(),
      provider: 'local',
      public_id: null,
      url: asset.url,
      mime_type: 'image/jpeg',
      size_bytes: null,
      width: null,
      height: null,
      alt_text: asset.alt,
      uploaded_by: null,
    });
  }
  console.log('✓ Demo media library entries ready');
}
