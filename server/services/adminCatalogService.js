import crypto from 'node:crypto';
import { getDatabase, getDbDriver } from '../../database/connection.js';
import { boolValue, nowExpression, toDriverSql } from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';
import { recordStockSyncMovement } from './inventoryService.js';

function uuid() {
  return crypto.randomUUID();
}

function boolParam(driver, value) {
  return boolValue(driver, Boolean(value));
}

export function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

async function ensureUniqueSlug(db, driver, table, slug, excludeId = null) {
  let candidate = slug || `item-${Date.now()}`;
  let attempt = 0;

  while (attempt < 20) {
    const params = [candidate];
    let sql = `SELECT id FROM ${table} WHERE slug = ? AND deleted_at IS NULL`;
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    sql += ' LIMIT 1';
    const existing = await db.query(toDriverSql(driver, sql), params);
    if (!existing.rows?.length) return candidate;
    attempt += 1;
    candidate = `${slug}-${attempt + 1}`;
  }

  return `${slug}-${uuid().slice(0, 8)}`;
}

function mapAdminProduct(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    barcode: row.barcode,
    shortDescription: row.short_description,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name || null,
    subcategory: row.subcategory,
    brand: row.brand,
    price: row.price == null ? null : Number(row.price),
    compareAtPrice: row.compare_at_price == null ? null : Number(row.compare_at_price),
    costPrice: row.cost_price == null ? null : Number(row.cost_price),
    currency: row.currency || 'LRD',
    tax: row.tax == null ? null : Number(row.tax),
    stockQuantity: Number(row.stock_quantity || 0),
    lowStockThreshold: Number(row.low_stock_threshold || 5),
    weight: row.weight == null ? null : Number(row.weight),
    weightUnit: row.weight_unit,
    size: row.size,
    unit: row.unit,
    featured: Boolean(row.featured),
    active: Boolean(row.active),
    status: row.status,
    thumbnailUrl: row.thumbnail_url,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    salesCount: Number(row.sales_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCategory(row) {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url,
    sortOrder: Number(row.sort_order || 0),
    active: Boolean(row.active),
    productCount: Number(row.product_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadProductImages(db, driver, productId) {
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, url, alt_text, sort_order, is_primary
       FROM product_images
       WHERE product_id = ?
       ORDER BY is_primary DESC, sort_order ASC, created_at ASC`
    ),
    [productId]
  );
  return (result.rows || []).map((image) => ({
    id: image.id,
    url: image.url,
    altText: image.alt_text,
    sortOrder: Number(image.sort_order || 0),
    isPrimary: Boolean(image.is_primary),
  }));
}

async function loadProductVariants(db, driver, productId, { includeInactive = true } = {}) {
  const where = includeInactive
    ? 'product_id = ? AND deleted_at IS NULL'
    : 'product_id = ? AND deleted_at IS NULL AND active = ?';
  const params = includeInactive ? [productId] : [productId, boolParam(driver, true)];
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, name, sku, size, unit, price, compare_at_price, cost_price,
              stock_quantity, weight, weight_unit, active, sort_order
       FROM product_variants
       WHERE ${where}
       ORDER BY sort_order ASC, name ASC`
    ),
    params
  );
  return (result.rows || []).map((variant) => ({
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    size: variant.size,
    unit: variant.unit,
    price: variant.price == null ? null : Number(variant.price),
    compareAtPrice: variant.compare_at_price == null ? null : Number(variant.compare_at_price),
    costPrice: variant.cost_price == null ? null : Number(variant.cost_price),
    stockQuantity: Number(variant.stock_quantity || 0),
    weight: variant.weight == null ? null : Number(variant.weight),
    weightUnit: variant.weight_unit,
    active: Boolean(variant.active),
    sortOrder: Number(variant.sort_order || 0),
  }));
}

async function replaceImages(db, driver, productId, images = []) {
  await db.query(toDriverSql(driver, `DELETE FROM product_images WHERE product_id = ?`), [
    productId,
  ]);

  let primarySet = false;
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const isPrimary = Boolean(image.isPrimary) || (!primarySet && index === 0);
    if (isPrimary) primarySet = true;
    await db.query(
      toDriverSql(
        driver,
        `INSERT INTO product_images (id, product_id, url, alt_text, sort_order, is_primary)
         VALUES (?, ?, ?, ?, ?, ?)`
      ),
      [
        uuid(),
        productId,
        image.url,
        image.altText || null,
        image.sortOrder ?? index,
        boolParam(driver, isPrimary),
      ]
    );
  }
}

async function syncVariants(db, driver, productId, variants = []) {
  const existing = await db.query(
    toDriverSql(
      driver,
      `SELECT id FROM product_variants WHERE product_id = ? AND deleted_at IS NULL`
    ),
    [productId]
  );
  const keepIds = new Set(variants.map((variant) => variant.id).filter(Boolean));

  for (const row of existing.rows || []) {
    if (!keepIds.has(row.id)) {
      await db.query(
        toDriverSql(
          driver,
          `UPDATE product_variants SET deleted_at = ${nowExpression(driver)}, active = ?
           WHERE id = ?`
        ),
        [boolParam(driver, false), row.id]
      );
    }
  }

  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index];
    if (variant.id && keepIds.has(variant.id)) {
      await db.query(
        toDriverSql(
          driver,
          `UPDATE product_variants SET
             name = ?, sku = ?, size = ?, unit = ?, price = ?, compare_at_price = ?,
             cost_price = ?, stock_quantity = ?, weight = ?, weight_unit = ?,
             active = ?, sort_order = ?, updated_at = ${nowExpression(driver)}
           WHERE id = ? AND product_id = ?`
        ),
        [
          variant.name,
          variant.sku || null,
          variant.size || null,
          variant.unit || null,
          variant.price,
          variant.compareAtPrice,
          variant.costPrice,
          variant.stockQuantity ?? 0,
          variant.weight,
          variant.weightUnit || null,
          boolParam(driver, variant.active !== false),
          variant.sortOrder ?? index,
          variant.id,
          productId,
        ]
      );
    } else {
      await db.query(
        toDriverSql(
          driver,
          `INSERT INTO product_variants (
             id, product_id, name, sku, size, unit, price, compare_at_price, cost_price,
             stock_quantity, weight, weight_unit, active, sort_order
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ),
        [
          uuid(),
          productId,
          variant.name,
          variant.sku || null,
          variant.size || null,
          variant.unit || null,
          variant.price,
          variant.compareAtPrice,
          variant.costPrice,
          variant.stockQuantity ?? 0,
          variant.weight,
          variant.weightUnit || null,
          boolParam(driver, variant.active !== false),
          variant.sortOrder ?? index,
        ]
      );
    }
  }
}

async function upsertInventory(db, driver, productId, quantity, lowStockThreshold) {
  const existing = await db.query(
    toDriverSql(
      driver,
      `SELECT id FROM inventory WHERE product_id = ? AND variant_id IS NULL LIMIT 1`
    ),
    [productId]
  );

  if (existing.rows?.length) {
    await db.query(
      toDriverSql(
        driver,
        `UPDATE inventory SET quantity = ?, low_stock_threshold = ?, updated_at = ${nowExpression(driver)}
         WHERE product_id = ? AND variant_id IS NULL`
      ),
      [quantity, lowStockThreshold, productId]
    );
  } else {
    await db.query(
      toDriverSql(
        driver,
        `INSERT INTO inventory (id, product_id, variant_id, quantity, low_stock_threshold)
         VALUES (?, ?, NULL, ?, ?)`
      ),
      [uuid(), productId, quantity, lowStockThreshold]
    );
  }
}

function normalizeThumbnail(data) {
  const explicit = data.thumbnailUrl === '' ? null : data.thumbnailUrl || null;
  if (explicit) return explicit;
  const primary = (data.images || []).find((image) => image.isPrimary) || data.images?.[0];
  return primary?.url || null;
}

function assertPublishable(input) {
  if (input.status !== 'published') return;
  if (input.price == null) {
    throw new HttpError(400, 'Published products require a price', {
      code: 'VALIDATION_ERROR',
      details: { fieldErrors: { price: ['Published products require a price'] } },
    });
  }
  if (!input.categoryId) {
    throw new HttpError(400, 'Published products require a category', {
      code: 'VALIDATION_ERROR',
      details: { fieldErrors: { categoryId: ['Published products require a category'] } },
    });
  }
}

/**
 * Admin product list (includes drafts/archived).
 */
export async function listAdminProducts(filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();

  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const where = ['p.deleted_at IS NULL'];
  const params = [];

  if (filters.status && filters.status !== 'all') {
    where.push('p.status = ?');
    params.push(filters.status);
  }

  if (filters.categoryId) {
    where.push('p.category_id = ?');
    params.push(filters.categoryId);
  }

  if (filters.q) {
    const term = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push(
      `(LOWER(p.name) LIKE ? OR LOWER(COALESCE(p.sku, '')) LIKE ? OR LOWER(COALESCE(p.slug, '')) LIKE ?)`
    );
    params.push(term, term, term);
  }

  const whereSql = where.join(' AND ');
  const sort = filters.sort || 'updated_desc';
  let orderBy = 'p.updated_at DESC';
  if (sort === 'name_asc') orderBy = 'p.name ASC';
  else if (sort === 'price_asc')
    orderBy = driver === 'sqlite' ? 'p.price IS NULL, p.price ASC' : 'p.price ASC NULLS LAST';
  else if (sort === 'price_desc')
    orderBy = driver === 'sqlite' ? 'p.price IS NULL, p.price DESC' : 'p.price DESC NULLS LAST';
  else if (sort === 'stock_asc') orderBy = 'p.stock_quantity ASC';
  else if (sort === 'stock_desc') orderBy = 'p.stock_quantity DESC';

  const countResult = await db.query(
    toDriverSql(driver, `SELECT COUNT(*) AS count FROM products p WHERE ${whereSql}`),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const listResult = await db.query(
    toDriverSql(
      driver,
      `SELECT p.*, c.name AS category_name,
              COALESCE((
                SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.product_id = p.id
              ), 0) AS sales_count
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    ),
    [...params, pageSize, offset]
  );

  return {
    products: (listResult.rows || []).map(mapAdminProduct),
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getAdminProduct(id) {
  const db = await getDatabase();
  const driver = getDbDriver();

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT p.*, c.name AS category_name,
              COALESCE((
                SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.product_id = p.id
              ), 0) AS sales_count
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ? AND p.deleted_at IS NULL
       LIMIT 1`
    ),
    [id]
  );
  const row = result.rows?.[0];
  if (!row) {
    throw new HttpError(404, 'Product not found', { code: 'NOT_FOUND' });
  }

  const [images, variants] = await Promise.all([
    loadProductImages(db, driver, id),
    loadProductVariants(db, driver, id),
  ]);

  return {
    ...mapAdminProduct(row),
    images,
    variants,
  };
}

export async function createAdminProduct(input) {
  assertPublishable(input);
  const db = await getDatabase();
  const driver = getDbDriver();
  const id = uuid();
  const baseSlug = slugify(input.slug || input.name);
  const slug = await ensureUniqueSlug(db, driver, 'products', baseSlug);
  const thumbnailUrl = normalizeThumbnail(input);

  if (input.categoryId) {
    const category = await db.query(
      toDriverSql(driver, `SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL LIMIT 1`),
      [input.categoryId]
    );
    if (!category.rows?.length) {
      throw new HttpError(400, 'Category not found', { code: 'INVALID_CATEGORY' });
    }
  }

  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO products (
         id, name, slug, sku, barcode, description, short_description, category_id, subcategory,
         brand, price, compare_at_price, cost_price, currency, tax, stock_quantity,
         low_stock_threshold, weight, weight_unit, size, unit, featured, active, status,
         thumbnail_url, seo_title, seo_description
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    [
      id,
      input.name,
      slug,
      input.sku || null,
      input.barcode || null,
      input.description || null,
      input.shortDescription || null,
      input.categoryId || null,
      input.subcategory || null,
      input.brand || null,
      input.price,
      input.compareAtPrice,
      input.costPrice,
      input.currency || 'LRD',
      input.tax,
      input.stockQuantity ?? 0,
      input.lowStockThreshold ?? 5,
      input.weight,
      input.weightUnit || null,
      input.size || null,
      input.unit || null,
      boolParam(driver, Boolean(input.featured)),
      boolParam(driver, input.active !== false),
      input.status || 'draft',
      thumbnailUrl,
      input.seoTitle || null,
      input.seoDescription || null,
    ]
  );

  await replaceImages(db, driver, id, input.images || []);
  await syncVariants(db, driver, id, input.variants || []);
  await upsertInventory(db, driver, id, input.stockQuantity ?? 0, input.lowStockThreshold ?? 5);

  const initialStock = input.stockQuantity ?? 0;
  if (initialStock > 0) {
    await recordStockSyncMovement({
      productId: id,
      previousQuantity: 0,
      nextQuantity: initialStock,
      reason: 'Initial stock on product create',
    });
  }

  return getAdminProduct(id);
}

export async function updateAdminProduct(id, input) {
  assertPublishable(input);
  const db = await getDatabase();
  const driver = getDbDriver();
  const existing = await getAdminProduct(id);

  const baseSlug = slugify(input.slug || input.name || existing.slug);
  const slug = await ensureUniqueSlug(db, driver, 'products', baseSlug, id);
  const thumbnailUrl = normalizeThumbnail(input);

  if (input.categoryId) {
    const category = await db.query(
      toDriverSql(driver, `SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL LIMIT 1`),
      [input.categoryId]
    );
    if (!category.rows?.length) {
      throw new HttpError(400, 'Category not found', { code: 'INVALID_CATEGORY' });
    }
  }

  await db.query(
    toDriverSql(
      driver,
      `UPDATE products SET
         name = ?, slug = ?, sku = ?, barcode = ?, description = ?, short_description = ?,
         category_id = ?, subcategory = ?, brand = ?, price = ?, compare_at_price = ?,
         cost_price = ?, currency = ?, tax = ?, stock_quantity = ?, low_stock_threshold = ?,
         weight = ?, weight_unit = ?, size = ?, unit = ?, featured = ?, active = ?, status = ?,
         thumbnail_url = ?, seo_title = ?, seo_description = ?,
         updated_at = ${nowExpression(driver)}
       WHERE id = ? AND deleted_at IS NULL`
    ),
    [
      input.name,
      slug,
      input.sku || null,
      input.barcode || null,
      input.description || null,
      input.shortDescription || null,
      input.categoryId || null,
      input.subcategory || null,
      input.brand || null,
      input.price,
      input.compareAtPrice,
      input.costPrice,
      input.currency || 'LRD',
      input.tax,
      input.stockQuantity ?? 0,
      input.lowStockThreshold ?? 5,
      input.weight,
      input.weightUnit || null,
      input.size || null,
      input.unit || null,
      boolParam(driver, Boolean(input.featured)),
      boolParam(driver, input.active !== false),
      input.status || 'draft',
      thumbnailUrl,
      input.seoTitle || null,
      input.seoDescription || null,
      id,
    ]
  );

  await replaceImages(db, driver, id, input.images || []);
  await syncVariants(db, driver, id, input.variants || []);
  await upsertInventory(db, driver, id, input.stockQuantity ?? 0, input.lowStockThreshold ?? 5);

  await recordStockSyncMovement({
    productId: id,
    previousQuantity: existing.stockQuantity,
    nextQuantity: input.stockQuantity ?? 0,
    reason: 'Product editor stock sync',
  });

  return getAdminProduct(id);
}

export async function duplicateAdminProduct(id) {
  const source = await getAdminProduct(id);
  return createAdminProduct({
    ...source,
    name: `${source.name} (Copy)`,
    slug: null,
    sku: source.sku ? `${source.sku}-COPY` : null,
    status: 'draft',
    featured: false,
    images: source.images.map(({ url, altText, sortOrder, isPrimary }) => ({
      url,
      altText,
      sortOrder,
      isPrimary,
    })),
    variants: source.variants.map((variant) => ({
      ...variant,
      id: null,
      sku: variant.sku ? `${variant.sku}-COPY` : null,
    })),
  });
}

export async function softDeleteAdminProduct(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  await getAdminProduct(id);

  const sales = await db.query(
    toDriverSql(driver, `SELECT COUNT(*) AS count FROM order_items WHERE product_id = ?`),
    [id]
  );
  const salesCount = Number(sales.rows?.[0]?.count || 0);

  if (salesCount > 0) {
    throw new HttpError(409, 'Product has order history — archive it instead of deleting', {
      code: 'DELETE_NOT_SAFE',
      details: { salesCount },
    });
  }

  await db.query(
    toDriverSql(
      driver,
      `UPDATE products SET deleted_at = ${nowExpression(driver)}, status = 'archived',
         active = ?, updated_at = ${nowExpression(driver)}
       WHERE id = ?`
    ),
    [boolParam(driver, false), id]
  );

  return { id, deleted: true };
}

export async function bulkUpdateAdminProducts({ ids, action }) {
  const results = [];
  for (const id of ids) {
    try {
      if (action === 'delete') {
        results.push(await softDeleteAdminProduct(id));
      } else {
        const product = await getAdminProduct(id);
        const status =
          action === 'publish' ? 'published' : action === 'draft' ? 'draft' : 'archived';
        const active = action !== 'archive';
        await updateAdminProduct(id, {
          ...product,
          status,
          active,
          images: product.images,
          variants: product.variants,
        });
        results.push({ id, status, ok: true });
      }
    } catch (error) {
      results.push({
        id,
        ok: false,
        code: error.code || 'ERROR',
        message: error.message,
      });
    }
  }
  return { results };
}

export async function listAdminCategories() {
  const db = await getDatabase();
  const driver = getDbDriver();

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT c.*,
              (SELECT COUNT(*) FROM products p
               WHERE p.category_id = c.id AND p.deleted_at IS NULL) AS product_count
       FROM categories c
       WHERE c.deleted_at IS NULL
       ORDER BY c.sort_order ASC, c.name ASC`
    )
  );

  return { categories: (result.rows || []).map(mapCategory) };
}

export async function getAdminCategory(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT c.*,
              (SELECT COUNT(*) FROM products p
               WHERE p.category_id = c.id AND p.deleted_at IS NULL) AS product_count
       FROM categories c
       WHERE c.id = ? AND c.deleted_at IS NULL
       LIMIT 1`
    ),
    [id]
  );
  const row = result.rows?.[0];
  if (!row) throw new HttpError(404, 'Category not found', { code: 'NOT_FOUND' });
  return mapCategory(row);
}

export async function createAdminCategory(input) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const id = uuid();
  const slug = await ensureUniqueSlug(db, driver, 'categories', slugify(input.slug || input.name));

  if (input.parentId) {
    const parent = await db.query(
      toDriverSql(driver, `SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL LIMIT 1`),
      [input.parentId]
    );
    if (!parent.rows?.length) {
      throw new HttpError(400, 'Parent category not found', { code: 'INVALID_PARENT' });
    }
  }

  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO categories (id, parent_id, name, slug, description, image_url, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    [
      id,
      input.parentId || null,
      input.name,
      slug,
      input.description || null,
      input.imageUrl || null,
      input.sortOrder ?? 0,
      boolParam(driver, input.active !== false),
    ]
  );

  return getAdminCategory(id);
}

export async function updateAdminCategory(id, input) {
  const db = await getDatabase();
  const driver = getDbDriver();
  await getAdminCategory(id);

  if (input.parentId === id) {
    throw new HttpError(400, 'Category cannot be its own parent', { code: 'INVALID_PARENT' });
  }

  const slug = await ensureUniqueSlug(
    db,
    driver,
    'categories',
    slugify(input.slug || input.name),
    id
  );

  await db.query(
    toDriverSql(
      driver,
      `UPDATE categories SET
         parent_id = ?, name = ?, slug = ?, description = ?, image_url = ?,
         sort_order = ?, active = ?, updated_at = ${nowExpression(driver)}
       WHERE id = ? AND deleted_at IS NULL`
    ),
    [
      input.parentId || null,
      input.name,
      slug,
      input.description || null,
      input.imageUrl || null,
      input.sortOrder ?? 0,
      boolParam(driver, input.active !== false),
      id,
    ]
  );

  return getAdminCategory(id);
}

export async function softDeleteAdminCategory(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const category = await getAdminCategory(id);

  if (category.productCount > 0) {
    throw new HttpError(409, 'Category still has products — reassign or archive products first', {
      code: 'DELETE_NOT_SAFE',
      details: { productCount: category.productCount },
    });
  }

  await db.query(
    toDriverSql(
      driver,
      `UPDATE categories SET deleted_at = ${nowExpression(driver)}, active = ?,
         updated_at = ${nowExpression(driver)}
       WHERE id = ?`
    ),
    [boolParam(driver, false), id]
  );

  return { id, deleted: true };
}
