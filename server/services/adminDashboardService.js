import { getDatabase, getDbDriver } from '../../database/connection.js';
import { toDriverSql } from '../../database/dialect.js';

function boolParam(driver) {
  return driver === 'postgres' ? true : 1;
}

/**
 * Live admin home metrics — counts from the database (no fabricated KPIs).
 */
export async function getAdminDashboardOverview() {
  const db = await getDatabase();
  const driver = getDbDriver();
  const active = boolParam(driver);

  const [
    products,
    published,
    lowStock,
    ordersOpen,
    ordersToday,
    paymentsPending,
    deliveriesActive,
    customers,
  ] = await Promise.all([
    count(
      db,
      driver,
      `SELECT COUNT(*) AS c FROM products WHERE deleted_at IS NULL AND active = ?`,
      [active]
    ),
    count(
      db,
      driver,
      `SELECT COUNT(*) AS c FROM products WHERE deleted_at IS NULL AND active = ? AND status = ?`,
      [active, 'published']
    ),
    count(
      db,
      driver,
      `SELECT COUNT(*) AS c FROM products
       WHERE deleted_at IS NULL AND active = ?
         AND stock_quantity <= low_stock_threshold`,
      [active]
    ),
    count(
      db,
      driver,
      `SELECT COUNT(*) AS c FROM orders
       WHERE deleted_at IS NULL
         AND status NOT IN ('delivered', 'cancelled', 'refunded')`
    ),
    count(
      db,
      driver,
      driver === 'postgres'
        ? `SELECT COUNT(*) AS c FROM orders
           WHERE deleted_at IS NULL AND created_at::date = CURRENT_DATE`
        : `SELECT COUNT(*) AS c FROM orders
           WHERE deleted_at IS NULL AND date(created_at) = date('now')`
    ),
    count(
      db,
      driver,
      `SELECT COUNT(*) AS c FROM payments
       WHERE status IN ('pending', 'pending_verification')`
    ),
    count(
      db,
      driver,
      `SELECT COUNT(*) AS c FROM deliveries
       WHERE deleted_at IS NULL
         AND status NOT IN ('delivered', 'cancelled', 'returned', 'failed')`
    ),
    count(
      db,
      driver,
      `SELECT COUNT(*) AS c FROM users WHERE user_type = ? AND deleted_at IS NULL`,
      ['customer']
    ),
  ]);

  const recentOrders = await db.query(
    toDriverSql(
      driver,
      `SELECT id, order_number, status, total, currency, created_at
       FROM orders
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 5`
    )
  );

  return {
    ready: true,
    generatedAt: new Date().toISOString(),
    metrics: {
      productsTotal: products,
      productsPublished: published,
      lowStock,
      ordersOpen,
      ordersToday,
      paymentsPending,
      deliveriesActive,
      customers,
    },
    recentOrders: (recentOrders.rows || []).map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      grandTotal: row.total == null ? null : Number(row.total),
      currency: row.currency || 'LRD',
      createdAt: row.created_at,
    })),
  };
}

async function count(db, driver, sql, params = []) {
  const result = await db.query(toDriverSql(driver, sql), params);
  return Number(result.rows?.[0]?.c ?? result.rows?.[0]?.count ?? 0);
}
