import crypto from 'node:crypto';
import { getDatabase, getDbDriver } from '../../database/connection.js';
import { boolValue, nowExpression, toDriverSql } from '../../database/dialect.js';
import { withTransaction } from '../repositories/base.js';
import { HttpError } from '../utils/errors.js';

function uuid() {
  return crypto.randomUUID();
}

function boolParam(driver, value) {
  return boolValue(driver, Boolean(value));
}

/**
 * Signed delta for a movement type given a positive quantity (or absolute for adjustment).
 */
export function resolveMovementDelta(movementType, quantity, quantityBefore) {
  const amount = Math.abs(Number(quantity) || 0);
  switch (movementType) {
    case 'addition':
    case 'restock':
    case 'return':
      return amount;
    case 'deduction':
    case 'sale':
    case 'damaged':
      return -amount;
    case 'adjustment':
      return amount - Number(quantityBefore || 0);
    default:
      throw new HttpError(400, 'Unknown movement type', { code: 'VALIDATION_ERROR' });
  }
}

async function getStockRow(db, driver, productId, variantId = null) {
  if (variantId) {
    const result = await db.query(
      toDriverSql(
        driver,
        `SELECT pv.id, pv.product_id, pv.name, pv.sku, pv.stock_quantity,
                p.name AS product_name, p.sku AS product_sku, p.cost_price, p.price, p.currency,
                p.low_stock_threshold, p.thumbnail_url
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         WHERE pv.id = ? AND pv.product_id = ? AND pv.deleted_at IS NULL AND p.deleted_at IS NULL
         LIMIT 1`
      ),
      [variantId, productId]
    );
    const row = result.rows?.[0];
    if (!row) throw new HttpError(404, 'Variant not found', { code: 'NOT_FOUND' });
    return {
      productId: row.product_id,
      variantId: row.id,
      label: `${row.product_name} — ${row.name}`,
      sku: row.sku || row.product_sku,
      quantity: Number(row.stock_quantity || 0),
      lowStockThreshold: Number(row.low_stock_threshold || 5),
      costPrice: row.cost_price == null ? null : Number(row.cost_price),
      price: row.price == null ? null : Number(row.price),
      currency: row.currency || 'LRD',
      thumbnailUrl: row.thumbnail_url,
    };
  }

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, name, sku, stock_quantity, low_stock_threshold, cost_price, price, currency, thumbnail_url
       FROM products
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1`
    ),
    [productId]
  );
  const row = result.rows?.[0];
  if (!row) throw new HttpError(404, 'Product not found', { code: 'NOT_FOUND' });
  return {
    productId: row.id,
    variantId: null,
    label: row.name,
    sku: row.sku,
    quantity: Number(row.stock_quantity || 0),
    lowStockThreshold: Number(row.low_stock_threshold || 5),
    costPrice: row.cost_price == null ? null : Number(row.cost_price),
    price: row.price == null ? null : Number(row.price),
    currency: row.currency || 'LRD',
    thumbnailUrl: row.thumbnail_url,
  };
}

async function upsertInventoryRow(db, driver, productId, variantId, quantity, lowStockThreshold) {
  const existing = await db.query(
    toDriverSql(
      driver,
      variantId
        ? `SELECT id FROM inventory WHERE product_id = ? AND variant_id = ? LIMIT 1`
        : `SELECT id FROM inventory WHERE product_id = ? AND variant_id IS NULL LIMIT 1`
    ),
    variantId ? [productId, variantId] : [productId]
  );

  if (existing.rows?.length) {
    await db.query(
      toDriverSql(
        driver,
        variantId
          ? `UPDATE inventory SET quantity = ?, low_stock_threshold = ?, updated_at = ${nowExpression(driver)}
             WHERE product_id = ? AND variant_id = ?`
          : `UPDATE inventory SET quantity = ?, low_stock_threshold = ?, updated_at = ${nowExpression(driver)}
             WHERE product_id = ? AND variant_id IS NULL`
      ),
      variantId
        ? [quantity, lowStockThreshold, productId, variantId]
        : [quantity, lowStockThreshold, productId]
    );
  } else {
    await db.query(
      toDriverSql(
        driver,
        `INSERT INTO inventory (id, product_id, variant_id, quantity, low_stock_threshold)
         VALUES (?, ?, ?, ?, ?)`
      ),
      [uuid(), productId, variantId || null, quantity, lowStockThreshold]
    );
  }
}

/**
 * Apply a stock movement and persist an immutable history row.
 * Also keeps products / variants / inventory tables in sync.
 */
export async function applyInventoryMovement({
  productId,
  variantId = null,
  movementType,
  quantity,
  reason = null,
  notes = null,
  referenceType = null,
  referenceId = null,
  createdBy = null,
}) {
  return withTransaction(async (client, driver) => {
    const stock = await getStockRow(client, driver, productId, variantId || null);
    const delta = resolveMovementDelta(movementType, quantity, stock.quantity);
    const before = stock.quantity;
    const after = before + delta;

    if (after < 0) {
      throw new HttpError(409, 'Insufficient stock for this movement', {
        code: 'INSUFFICIENT_STOCK',
        details: { before, delta, after },
      });
    }

    if (variantId) {
      await client.query(
        toDriverSql(
          driver,
          `UPDATE product_variants SET stock_quantity = ?, updated_at = ${nowExpression(driver)}
           WHERE id = ? AND product_id = ?`
        ),
        [after, variantId, productId]
      );
      // Keep product-level aggregate as sum of active variants when variants exist
      const sum = await client.query(
        toDriverSql(
          driver,
          `SELECT COALESCE(SUM(stock_quantity), 0) AS total
           FROM product_variants
           WHERE product_id = ? AND deleted_at IS NULL AND active = ?`
        ),
        [productId, boolParam(driver, true)]
      );
      const productStock = Number(sum.rows?.[0]?.total || 0);
      await client.query(
        toDriverSql(
          driver,
          `UPDATE products SET stock_quantity = ?, updated_at = ${nowExpression(driver)} WHERE id = ?`
        ),
        [productStock, productId]
      );
    } else {
      await client.query(
        toDriverSql(
          driver,
          `UPDATE products SET stock_quantity = ?, updated_at = ${nowExpression(driver)} WHERE id = ?`
        ),
        [after, productId]
      );
    }

    await upsertInventoryRow(
      client,
      driver,
      productId,
      variantId || null,
      after,
      stock.lowStockThreshold
    );

    const reasonText = [reason, notes].filter(Boolean).join(' — ') || null;
    const movementId = uuid();
    await client.query(
      toDriverSql(
        driver,
        `INSERT INTO inventory_movements (
           id, product_id, variant_id, movement_type, quantity_delta,
           quantity_before, quantity_after, reason, reference_type, reference_id, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        movementId,
        productId,
        variantId || null,
        movementType,
        delta,
        before,
        after,
        reasonText,
        referenceType || 'manual',
        referenceId || null,
        createdBy || null,
      ]
    );

    return {
      movement: {
        id: movementId,
        productId,
        variantId: variantId || null,
        movementType,
        quantityDelta: delta,
        quantityBefore: before,
        quantityAfter: after,
        reason: reasonText,
        referenceType: referenceType || 'manual',
        referenceId: referenceId || null,
        createdBy: createdBy || null,
      },
      stock: {
        ...stock,
        quantity: after,
      },
    };
  });
}

/**
 * Record a stock change from product editor without inventing business reason.
 */
export async function recordStockSyncMovement({
  productId,
  previousQuantity,
  nextQuantity,
  createdBy = null,
  reason = 'Product editor stock sync',
}) {
  const before = Number(previousQuantity || 0);
  const after = Number(nextQuantity || 0);
  if (before === after) return null;

  const db = await getDatabase();
  const driver = getDbDriver();
  const delta = after - before;
  const movementType = delta > 0 ? 'adjustment' : 'adjustment';

  await upsertInventoryRow(db, driver, productId, null, after, 5);

  const movementId = uuid();
  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO inventory_movements (
         id, product_id, variant_id, movement_type, quantity_delta,
         quantity_before, quantity_after, reason, reference_type, reference_id, created_by
       ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'product', ?, ?)`
    ),
    [movementId, productId, movementType, delta, before, after, reason, productId, createdBy]
  );

  return movementId;
}

export async function getInventoryDashboard() {
  const db = await getDatabase();
  const driver = getDbDriver();

  const summary = await db.query(
    toDriverSql(
      driver,
      `SELECT
         COALESCE(SUM(p.stock_quantity), 0) AS current_stock,
         COALESCE(SUM(p.stock_quantity * COALESCE(p.cost_price, 0)), 0) AS stock_value,
         COALESCE(SUM(CASE WHEN p.stock_quantity <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock,
         COALESCE(SUM(CASE
           WHEN p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold THEN 1 ELSE 0
         END), 0) AS low_stock,
         COALESCE(SUM(CASE WHEN p.stock_quantity > p.low_stock_threshold THEN 1 ELSE 0 END), 0) AS healthy_stock,
         COUNT(*) AS product_count
       FROM products p
       WHERE p.deleted_at IS NULL AND p.status != 'archived'`
    )
  );

  const incoming = await db.query(
    toDriverSql(
      driver,
      `SELECT COALESCE(SUM(quantity_delta), 0) AS incoming
       FROM inventory_movements
       WHERE movement_type IN ('addition', 'restock')
         AND quantity_delta > 0
         AND created_at >= ${
           driver === 'postgres' ? "NOW() - INTERVAL '7 days'" : "datetime('now', '-7 days')"
         }`
    )
  );

  const recentMovements = await db.query(
    toDriverSql(
      driver,
      `SELECT m.id, m.product_id, m.variant_id, m.movement_type, m.quantity_delta,
              m.quantity_before, m.quantity_after, m.reason, m.reference_type, m.reference_id,
              m.created_at, p.name AS product_name, p.sku AS product_sku
       FROM inventory_movements m
       JOIN products p ON p.id = m.product_id
       ORDER BY m.created_at DESC
       LIMIT 8`
    )
  );

  const row = summary.rows?.[0] || {};
  return {
    summary: {
      currentStock: Number(row.current_stock || 0),
      stockValue: Number(row.stock_value || 0),
      lowStock: Number(row.low_stock || 0),
      outOfStock: Number(row.out_of_stock || 0),
      incomingStock: Number(incoming.rows?.[0]?.incoming || 0),
      productCount: Number(row.product_count || 0),
      healthyStock: Number(row.healthy_stock || 0),
      currency: 'LRD',
      stockValueBasis: 'cost_price',
    },
    recentMovements: (recentMovements.rows || []).map(mapMovement),
  };
}

function mapMovement(row) {
  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    productName: row.product_name || null,
    productSku: row.product_sku || null,
    movementType: row.movement_type,
    quantityDelta: Number(row.quantity_delta),
    quantityBefore: Number(row.quantity_before),
    quantityAfter: Number(row.quantity_after),
    reason: row.reason,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
  };
}

export async function listInventoryLevels(filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const where = [`p.deleted_at IS NULL`, `p.status != 'archived'`];
  const params = [];

  if (filters.q) {
    const term = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push(
      `(LOWER(p.name) LIKE ? OR LOWER(COALESCE(p.sku, '')) LIKE ? OR LOWER(COALESCE(p.slug, '')) LIKE ?)`
    );
    params.push(term, term, term);
  }

  if (filters.categoryId) {
    where.push('p.category_id = ?');
    params.push(filters.categoryId);
  }

  if (filters.status === 'out') {
    where.push('p.stock_quantity <= 0');
  } else if (filters.status === 'low') {
    where.push('p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold');
  } else if (filters.status === 'in_stock') {
    where.push('p.stock_quantity > p.low_stock_threshold');
  }

  const whereSql = where.join(' AND ');
  const countResult = await db.query(
    toDriverSql(driver, `SELECT COUNT(*) AS count FROM products p WHERE ${whereSql}`),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const list = await db.query(
    toDriverSql(
      driver,
      `SELECT p.id, p.name, p.slug, p.sku, p.stock_quantity, p.low_stock_threshold,
              p.cost_price, p.price, p.currency, p.thumbnail_url, p.status,
              c.name AS category_name,
              (p.stock_quantity * COALESCE(p.cost_price, 0)) AS line_value
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${whereSql}
       ORDER BY
         CASE
           WHEN p.stock_quantity <= 0 THEN 0
           WHEN p.stock_quantity <= p.low_stock_threshold THEN 1
           ELSE 2
         END ASC,
         p.name ASC
       LIMIT ? OFFSET ?`
    ),
    [...params, pageSize, offset]
  );

  return {
    items: (list.rows || []).map((row) => {
      const qty = Number(row.stock_quantity || 0);
      const threshold = Number(row.low_stock_threshold || 5);
      let stockStatus = 'healthy';
      if (qty <= 0) stockStatus = 'out';
      else if (qty <= threshold) stockStatus = 'low';
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        sku: row.sku,
        stockQuantity: qty,
        lowStockThreshold: threshold,
        costPrice: row.cost_price == null ? null : Number(row.cost_price),
        price: row.price == null ? null : Number(row.price),
        currency: row.currency || 'LRD',
        thumbnailUrl: row.thumbnail_url,
        status: row.status,
        categoryName: row.category_name,
        lineValue: Number(row.line_value || 0),
        stockStatus,
      };
    }),
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function listInventoryMovements(filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const where = ['1=1'];
  const params = [];

  if (filters.productId) {
    where.push('m.product_id = ?');
    params.push(filters.productId);
  }
  if (filters.movementType && filters.movementType !== 'all') {
    where.push('m.movement_type = ?');
    params.push(filters.movementType);
  }

  const whereSql = where.join(' AND ');
  const countResult = await db.query(
    toDriverSql(driver, `SELECT COUNT(*) AS count FROM inventory_movements m WHERE ${whereSql}`),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const list = await db.query(
    toDriverSql(
      driver,
      `SELECT m.*, p.name AS product_name, p.sku AS product_sku
       FROM inventory_movements m
       JOIN products p ON p.id = m.product_id
       WHERE ${whereSql}
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`
    ),
    [...params, pageSize, offset]
  );

  return {
    movements: (list.rows || []).map(mapMovement),
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
