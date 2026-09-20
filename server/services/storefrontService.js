import { getDatabase, getDbDriver } from '../../database/connection.js';
import { toDriverSql } from '../../database/dialect.js';

function parseJsonField(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function getSettingByKey(table, key) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(driver, `SELECT key, value, description FROM ${table} WHERE key = ? LIMIT 1`),
    [key]
  );
  const row = result.rows?.[0];
  if (!row) return null;
  return {
    key: row.key,
    value: parseJsonField(row.value),
    description: row.description,
  };
}

export async function getPublicStorefrontData() {
  const [business, site, banners, categories, testimonials, featuredProducts] = await Promise.all([
    getSettingByKey('business_settings', 'general'),
    getSettingByKey('site_settings', 'homepage'),
    getSettingByKey('site_settings', 'banners'),
    listActiveCategories(),
    listActiveTestimonials(),
    listFeaturedProducts(),
  ]);

  const bannerItems = Array.isArray(banners?.value?.items)
    ? banners.value.items.filter((item) => item && item.active !== false)
    : [];

  return {
    business: business?.value || null,
    site: site?.value || null,
    banners: bannerItems,
    categories,
    testimonials,
    featuredProducts,
  };
}

export async function listActiveCategories() {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, name, slug, description, image_url, sort_order
       FROM categories
       WHERE active = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, name ASC`
    ),
    [driver === 'postgres' ? true : 1]
  );
  return result.rows || [];
}

export async function listActiveTestimonials() {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, customer_name, body, rating
       FROM testimonials
       WHERE active = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at DESC
       LIMIT 6`
    ),
    [driver === 'postgres' ? true : 1]
  );
  return result.rows || [];
}

export async function listFeaturedProducts() {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT p.id, p.name, p.slug, p.short_description, p.price, p.compare_at_price, p.currency, p.size,
              p.thumbnail_url, p.stock_quantity, p.featured,
              c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.active = ? AND p.status = ? AND p.featured = ? AND p.deleted_at IS NULL
       ORDER BY p.updated_at DESC
       LIMIT 8`
    ),
    [driver === 'postgres' ? true : 1, 'published', driver === 'postgres' ? true : 1]
  );
  return (result.rows || []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    price: row.price == null ? null : Number(row.price),
    compareAtPrice: row.compare_at_price == null ? null : Number(row.compare_at_price),
    currency: row.currency || 'LRD',
    size: row.size,
    imageUrl: row.thumbnail_url,
    available: Number(row.stock_quantity || 0) > 0,
    category: row.category_name || null,
    categorySlug: row.category_slug || null,
  }));
}
