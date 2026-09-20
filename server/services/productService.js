import { getDatabase, getDbDriver } from '../../database/connection.js';
import { toDriverSql } from '../../database/dialect.js';

function boolParam(driver, value) {
  return driver === 'postgres' ? Boolean(value) : value ? 1 : 0;
}

function mapProductRow(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    shortDescription: row.short_description,
    description: row.description,
    price: row.price == null ? null : Number(row.price),
    compareAtPrice: row.compare_at_price == null ? null : Number(row.compare_at_price),
    currency: row.currency || 'LRD',
    size: row.size,
    brand: row.brand,
    unit: row.unit,
    imageUrl: row.thumbnail_url,
    stockQuantity: Number(row.stock_quantity || 0),
    available: Number(row.stock_quantity || 0) > 0,
    featured: Boolean(row.featured),
    category: row.category_name || null,
    categorySlug: row.category_slug || null,
    categoryId: row.category_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Public catalog listing with filters, sort, and pagination.
 * Prices always come from the database — never from the client.
 */
export async function listProducts(filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();

  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(filters.pageSize) || 12));
  const offset = (page - 1) * pageSize;

  const where = ['p.active = ?', "p.status = 'published'", 'p.deleted_at IS NULL'];
  const params = [boolParam(driver, true)];

  if (filters.categorySlug) {
    where.push('c.slug = ?');
    params.push(filters.categorySlug);
  }

  if (filters.categoryId) {
    where.push('p.category_id = ?');
    params.push(filters.categoryId);
  }

  if (filters.q) {
    const term = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push(
      `(LOWER(p.name) LIKE ? OR LOWER(COALESCE(p.sku, '')) LIKE ? OR LOWER(COALESCE(p.description, '')) LIKE ? OR LOWER(COALESCE(c.name, '')) LIKE ?)`
    );
    params.push(term, term, term, term);
  }

  if (filters.brand) {
    where.push('LOWER(p.brand) = ?');
    params.push(String(filters.brand).trim().toLowerCase());
  }

  if (filters.size) {
    where.push('LOWER(p.size) = ?');
    params.push(String(filters.size).trim().toLowerCase());
  }

  if (filters.availability === 'in_stock') {
    where.push('p.stock_quantity > 0');
  } else if (filters.availability === 'out_of_stock') {
    where.push('p.stock_quantity <= 0');
  }

  if (filters.minPrice != null && filters.minPrice !== '') {
    where.push('p.price >= ?');
    params.push(Number(filters.minPrice));
  }

  if (filters.maxPrice != null && filters.maxPrice !== '') {
    where.push('p.price <= ?');
    params.push(Number(filters.maxPrice));
  }

  if (filters.featured === true || filters.featured === 'true' || filters.featured === '1') {
    where.push('p.featured = ?');
    params.push(boolParam(driver, true));
  }

  const whereSql = where.join(' AND ');

  const sort = String(filters.sort || 'featured').toLowerCase();
  let orderBy = 'p.featured DESC, p.updated_at DESC';
  if (sort === 'newest') orderBy = 'p.created_at DESC';
  else if (sort === 'price_asc') orderBy = 'p.price ASC NULLS LAST';
  else if (sort === 'price_desc') orderBy = 'p.price DESC NULLS LAST';
  else if (sort === 'name_asc') orderBy = 'p.name ASC';
  // best_selling reserved for later (needs sales data)
  else if (sort === 'best_selling') orderBy = 'p.featured DESC, p.updated_at DESC';

  // SQLite does not support NULLS LAST
  if (driver === 'sqlite') {
    if (sort === 'price_asc') orderBy = 'p.price IS NULL, p.price ASC';
    else if (sort === 'price_desc') orderBy = 'p.price IS NULL, p.price DESC';
  }

  const countResult = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS count
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${whereSql}`
    ),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const listParams = [...params, pageSize, offset];
  const listResult = await db.query(
    toDriverSql(
      driver,
      `SELECT p.id, p.name, p.slug, p.sku, p.short_description, p.description,
              p.price, p.compare_at_price, p.currency, p.size, p.brand, p.unit,
              p.thumbnail_url, p.stock_quantity, p.featured, p.category_id,
              p.created_at, p.updated_at,
              c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    ),
    listParams
  );

  const products = (listResult.rows || []).map(mapProductRow);

  return {
    products,
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
    filters: {
      q: filters.q || null,
      categorySlug: filters.categorySlug || null,
      brand: filters.brand || null,
      size: filters.size || null,
      availability: filters.availability || null,
      minPrice: filters.minPrice ?? null,
      maxPrice: filters.maxPrice ?? null,
      sort,
      featured: filters.featured || null,
    },
  };
}

export async function getCategoryBySlug(slug) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, name, slug, description, image_url, sort_order, active
       FROM categories
       WHERE slug = ? AND active = ? AND deleted_at IS NULL
       LIMIT 1`
    ),
    [slug, boolParam(driver, true)]
  );
  return result.rows?.[0] || null;
}

export async function getCatalogFacets(categorySlug = null) {
  const db = await getDatabase();
  const driver = getDbDriver();

  const where = ['p.active = ?', "p.status = 'published'", 'p.deleted_at IS NULL'];
  const params = [boolParam(driver, true)];

  if (categorySlug) {
    where.push('c.slug = ?');
    params.push(categorySlug);
  }

  const whereSql = where.join(' AND ');

  const brands = await db.query(
    toDriverSql(
      driver,
      `SELECT DISTINCT p.brand AS value
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${whereSql} AND p.brand IS NOT NULL AND TRIM(p.brand) != ''
       ORDER BY p.brand ASC`
    ),
    params
  );

  const sizes = await db.query(
    toDriverSql(
      driver,
      `SELECT DISTINCT p.size AS value
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${whereSql} AND p.size IS NOT NULL AND TRIM(p.size) != ''
       ORDER BY p.size ASC`
    ),
    params
  );

  return {
    brands: (brands.rows || []).map((row) => row.value).filter(Boolean),
    sizes: (sizes.rows || []).map((row) => row.value).filter(Boolean),
  };
}

/**
 * Public product detail by slug, including images, variants, and related products.
 */
export async function getProductBySlug(slug) {
  const db = await getDatabase();
  const driver = getDbDriver();

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = ? AND p.active = ? AND p.status = 'published' AND p.deleted_at IS NULL
       LIMIT 1`
    ),
    [slug, boolParam(driver, true)]
  );

  const row = result.rows?.[0];
  if (!row) return null;

  const [imagesResult, variantsResult] = await Promise.all([
    db.query(
      toDriverSql(
        driver,
        `SELECT id, url, alt_text, sort_order, is_primary
         FROM product_images
         WHERE product_id = ?
         ORDER BY is_primary DESC, sort_order ASC, created_at ASC`
      ),
      [row.id]
    ),
    db.query(
      toDriverSql(
        driver,
        `SELECT id, name, sku, size, unit, price, compare_at_price, cost_price,
                stock_quantity, weight, weight_unit, active, sort_order
         FROM product_variants
         WHERE product_id = ? AND active = ? AND deleted_at IS NULL
         ORDER BY sort_order ASC, name ASC`
      ),
      [row.id, boolParam(driver, true)]
    ),
  ]);

  const images = (imagesResult.rows || []).map((image) => ({
    id: image.id,
    url: image.url,
    altText: image.alt_text || row.name,
    sortOrder: image.sort_order,
    isPrimary: Boolean(image.is_primary),
  }));

  if (images.length === 0 && row.thumbnail_url) {
    images.push({
      id: 'thumbnail',
      url: row.thumbnail_url,
      altText: row.name,
      sortOrder: 0,
      isPrimary: true,
    });
  }

  const variants = (variantsResult.rows || []).map((variant) => ({
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    size: variant.size,
    unit: variant.unit,
    price: variant.price == null ? null : Number(variant.price),
    compareAtPrice: variant.compare_at_price == null ? null : Number(variant.compare_at_price),
    stockQuantity: Number(variant.stock_quantity || 0),
    available: Number(variant.stock_quantity || 0) > 0,
    weight: variant.weight == null ? null : Number(variant.weight),
    weightUnit: variant.weight_unit,
  }));

  const product = {
    ...mapProductRow(row),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    weight: row.weight == null ? null : Number(row.weight),
    weightUnit: row.weight_unit,
    images,
    variants,
  };

  const related = await getRelatedProducts(row.id, row.category_id, 4);

  return { product, related };
}

export async function getRelatedProducts(productId, categoryId, limit = 4) {
  const db = await getDatabase();
  const driver = getDbDriver();

  const params = [boolParam(driver, true), productId];
  let categoryClause = '';
  if (categoryId) {
    categoryClause = 'AND p.category_id = ?';
    params.push(categoryId);
  }
  params.push(limit);

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT p.id, p.name, p.slug, p.short_description, p.price, p.compare_at_price, p.currency,
              p.size, p.thumbnail_url, p.stock_quantity, p.featured, p.category_id,
              p.created_at, p.updated_at, p.sku, p.brand, p.unit, p.description,
              c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.active = ? AND p.status = 'published' AND p.deleted_at IS NULL
         AND p.id != ?
         ${categoryClause}
       ORDER BY p.featured DESC, p.updated_at DESC
       LIMIT ?`
    ),
    params
  );

  return (result.rows || []).map(mapProductRow);
}
