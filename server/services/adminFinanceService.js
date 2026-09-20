import { getDatabase, getDbDriver } from '../../database/connection.js';
import { toDriverSql } from '../../database/dialect.js';

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) * 100) / 100;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function toDateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Resolve preset / custom range into [fromInclusive, toExclusive) ISO bounds.
 */
export function resolveFinanceRange(query = {}) {
  const now = new Date();
  const today = startOfDay(now);
  let from = today;
  let to = addDays(today, 1);
  let preset = query.range || '30d';

  if (query.from && query.to) {
    preset = 'custom';
    from = startOfDay(new Date(query.from));
    to = addDays(startOfDay(new Date(query.to)), 1);
  } else {
    switch (preset) {
      case 'today':
        from = today;
        to = addDays(today, 1);
        break;
      case 'yesterday':
        from = addDays(today, -1);
        to = today;
        break;
      case '7d':
        from = addDays(today, -6);
        to = addDays(today, 1);
        break;
      case 'this_month':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = addDays(today, 1);
        break;
      case 'last_month': {
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      }
      case '30d':
      default:
        preset = '30d';
        from = addDays(today, -29);
        to = addDays(today, 1);
        break;
    }
  }

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    from = addDays(today, -29);
    to = addDays(today, 1);
    preset = '30d';
  }

  return {
    preset,
    from: from.toISOString(),
    to: to.toISOString(),
    fromLabel: toDateKey(from),
    toLabel: toDateKey(addDays(to, -1)),
  };
}

function dayKeyExpr(driver, column) {
  if (driver === 'postgres') {
    return `TO_CHAR(${column}::timestamptz, 'YYYY-MM-DD')`;
  }
  return `substr(${column}, 1, 10)`;
}

const ORDER_SALES_STATUSES = `('paid','processing','packed','ready_for_dispatch','out_for_delivery','delivered','confirmed')`;

/**
 * Financial dashboard — KPIs and chart series from live orders/payments/expenses.
 * Revenue ≠ profit; definitions returned for UI.
 */
export async function getFinanceDashboard(query = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const range = resolveFinanceRange(query);
  const params = [range.from, range.to];

  const orderAgg = await db.query(
    toDriverSql(
      driver,
      `SELECT
         COUNT(*) AS order_count,
         COALESCE(SUM(subtotal), 0) AS gross_sales,
         COALESCE(SUM(discount_amount), 0) AS discounts,
         COALESCE(SUM(delivery_fee), 0) AS delivery_revenue,
         COALESCE(SUM(tax_amount), 0) AS tax_total,
         COALESCE(SUM(total), 0) AS order_total
       FROM orders
       WHERE deleted_at IS NULL
         AND status IN ${ORDER_SALES_STATUSES}
         AND created_at >= ? AND created_at < ?`
    ),
    params
  );
  const oa = orderAgg.rows?.[0] || {};

  const paidAgg = await db.query(
    toDriverSql(
      driver,
      `SELECT
         COUNT(*) AS paid_count,
         COALESCE(SUM(amount), 0) AS revenue
       FROM payments
       WHERE status = 'paid'
         AND COALESCE(verified_at, updated_at, created_at) >= ?
         AND COALESCE(verified_at, updated_at, created_at) < ?`
    ),
    params
  );
  const pa = paidAgg.rows?.[0] || {};

  const refundAgg = await db.query(
    toDriverSql(
      driver,
      `SELECT COALESCE(SUM(amount), 0) AS refunds
       FROM payments
       WHERE status = 'refunded'
         AND COALESCE(updated_at, created_at) >= ?
         AND COALESCE(updated_at, created_at) < ?`
    ),
    params
  );

  const outstandingPayments = await db.query(
    toDriverSql(
      driver,
      `SELECT COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count
       FROM payments
       WHERE status IN ('pending', 'pending_verification')`
    )
  );

  const outstandingOrders = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS count
       FROM orders
       WHERE deleted_at IS NULL AND status = 'awaiting_payment'`
    )
  );

  const expenseAgg = await db.query(
    toDriverSql(
      driver,
      `SELECT COALESCE(SUM(amount), 0) AS expenses
       FROM expenses
       WHERE deleted_at IS NULL
         AND expense_date >= ? AND expense_date < ?`
    ),
    params
  );

  // COGS from product/variant cost at line level (0 when cost not set)
  const cogsAgg = await db.query(
    toDriverSql(
      driver,
      `SELECT COALESCE(SUM(
         oi.quantity * COALESCE(v.cost_price, p.cost_price, 0)
       ), 0) AS cogs
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN product_variants v ON v.id = oi.variant_id
       WHERE o.deleted_at IS NULL
         AND o.status IN ${ORDER_SALES_STATUSES}
         AND o.created_at >= ? AND o.created_at < ?`
    ),
    params
  );

  const grossSales = money(oa.gross_sales);
  const discounts = money(oa.discounts);
  const netSales = money(grossSales - discounts);
  const deliveryRevenue = money(oa.delivery_revenue);
  const revenue = money(pa.revenue);
  const cogs = money(cogsAgg.rows?.[0]?.cogs);
  const grossProfit = money(netSales - cogs);
  const expenses = money(expenseAgg.rows?.[0]?.expenses);
  const refunds = money(refundAgg.rows?.[0]?.refunds);
  const estimatedOperatingProfit = money(grossProfit + deliveryRevenue - expenses - refunds);
  const paidOrders = Number(pa.paid_count || 0);
  const orderCount = Number(oa.order_count || 0);
  const averageOrderValue = orderCount > 0 ? money(Number(oa.order_total || 0) / orderCount) : 0;

  // Daily revenue (paid) + daily net sales (orders)
  const dailyRevenue = await db.query(
    toDriverSql(
      driver,
      `SELECT ${dayKeyExpr(driver, 'COALESCE(verified_at, updated_at, created_at)')} AS day,
              COALESCE(SUM(amount), 0) AS amount
       FROM payments
       WHERE status = 'paid'
         AND COALESCE(verified_at, updated_at, created_at) >= ?
         AND COALESCE(verified_at, updated_at, created_at) < ?
       GROUP BY 1
       ORDER BY 1 ASC`
    ),
    params
  );

  const dailySales = await db.query(
    toDriverSql(
      driver,
      `SELECT ${dayKeyExpr(driver, 'created_at')} AS day,
              COALESCE(SUM(subtotal - discount_amount), 0) AS amount,
              COALESCE(SUM(delivery_fee), 0) AS delivery
       FROM orders
       WHERE deleted_at IS NULL
         AND status IN ${ORDER_SALES_STATUSES}
         AND created_at >= ? AND created_at < ?
       GROUP BY 1
       ORDER BY 1 ASC`
    ),
    params
  );

  const dailyExpenses = await db.query(
    toDriverSql(
      driver,
      `SELECT ${dayKeyExpr(driver, 'expense_date')} AS day,
              COALESCE(SUM(amount), 0) AS amount
       FROM expenses
       WHERE deleted_at IS NULL
         AND expense_date >= ? AND expense_date < ?
       GROUP BY 1
       ORDER BY 1 ASC`
    ),
    params
  );

  const byMethod = await db.query(
    toDriverSql(
      driver,
      `SELECT method, COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count
       FROM payments
       WHERE status = 'paid'
         AND COALESCE(verified_at, updated_at, created_at) >= ?
         AND COALESCE(verified_at, updated_at, created_at) < ?
       GROUP BY method
       ORDER BY amount DESC`
    ),
    params
  );

  const byCategory = await db.query(
    toDriverSql(
      driver,
      `SELECT COALESCE(c.name, 'Uncategorized') AS name,
              COALESCE(SUM(oi.line_total), 0) AS amount,
              COALESCE(SUM(oi.quantity), 0) AS quantity
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE o.deleted_at IS NULL
         AND o.status IN ${ORDER_SALES_STATUSES}
         AND o.created_at >= ? AND o.created_at < ?
       GROUP BY COALESCE(c.name, 'Uncategorized')
       ORDER BY amount DESC
       LIMIT 12`
    ),
    params
  );

  const byProduct = await db.query(
    toDriverSql(
      driver,
      `SELECT COALESCE(p.name, 'Unknown product') AS name,
              COALESCE(SUM(oi.line_total), 0) AS amount,
              COALESCE(SUM(oi.quantity), 0) AS quantity
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.deleted_at IS NULL
         AND o.status IN ${ORDER_SALES_STATUSES}
         AND o.created_at >= ? AND o.created_at < ?
       GROUP BY COALESCE(p.name, 'Unknown product')
       ORDER BY amount DESC
       LIMIT 10`
    ),
    params
  );

  const fillDays = (rows, amountKey = 'amount') => {
    const map = Object.fromEntries(
      (rows || []).map((r) => [String(r.day).slice(0, 10), money(r[amountKey])])
    );
    const series = [];
    let cursor = startOfDay(new Date(range.from));
    const end = startOfDay(new Date(range.to));
    while (cursor < end) {
      const key = toDateKey(cursor);
      series.push({ day: key, amount: map[key] || 0 });
      cursor = addDays(cursor, 1);
    }
    return series;
  };

  const revenueSeries = fillDays(dailyRevenue.rows);
  const salesSeries = fillDays(dailySales.rows);
  const expenseSeries = fillDays(dailyExpenses.rows);
  const profitSeries = salesSeries.map((point, i) => ({
    day: point.day,
    amount: money(point.amount - (expenseSeries[i]?.amount || 0)),
  }));

  return {
    range,
    currency: 'LRD',
    definitions: {
      grossSales: 'Sum of order subtotals (excludes cancelled/refunded).',
      netSales: 'Gross sales minus discounts.',
      revenue: 'Collected payments marked paid (not the same as profit).',
      cogs: 'Estimated cost of goods using product/variant cost_price × quantity.',
      grossProfit: 'Net sales − COGS. Does not subtract operating expenses.',
      estimatedOperatingProfit:
        'Gross profit + delivery fees − expenses − refunds (estimate until full ledger).',
    },
    metrics: {
      grossSales,
      netSales,
      revenue,
      cogs,
      grossProfit,
      expenses,
      discounts,
      refunds,
      deliveryRevenue,
      outstandingPayments: money(outstandingPayments.rows?.[0]?.amount),
      outstandingPaymentCount: Number(outstandingPayments.rows?.[0]?.count || 0),
      awaitingPaymentOrders: Number(outstandingOrders.rows?.[0]?.count || 0),
      paidOrders,
      orderCount,
      averageOrderValue,
      estimatedOperatingProfit,
      taxTotal: money(oa.tax_total),
    },
    charts: {
      revenueTrend: revenueSeries,
      profitTrend: profitSeries,
      salesVsExpenses: salesSeries.map((point, i) => ({
        day: point.day,
        sales: point.amount,
        expenses: expenseSeries[i]?.amount || 0,
      })),
      revenueByProduct: (byProduct.rows || []).map((r) => ({
        name: r.name,
        amount: money(r.amount),
        quantity: Number(r.quantity || 0),
      })),
      revenueByCategory: (byCategory.rows || []).map((r) => ({
        name: r.name,
        amount: money(r.amount),
        quantity: Number(r.quantity || 0),
      })),
      paymentMethods: (byMethod.rows || []).map((r) => ({
        method: r.method,
        amount: money(r.amount),
        count: Number(r.count || 0),
      })),
    },
  };
}

/**
 * Sales breakdown for /admin/finance/sales.
 */
export async function getFinanceSales(query = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const range = resolveFinanceRange(query);
  const params = [range.from, range.to];

  const daily = await db.query(
    toDriverSql(
      driver,
      `SELECT ${dayKeyExpr(driver, 'created_at')} AS day,
              COUNT(*) AS orders,
              COALESCE(SUM(subtotal), 0) AS gross,
              COALESCE(SUM(discount_amount), 0) AS discounts,
              COALESCE(SUM(subtotal - discount_amount), 0) AS net,
              COALESCE(SUM(delivery_fee), 0) AS delivery,
              COALESCE(SUM(total), 0) AS total
       FROM orders
       WHERE deleted_at IS NULL
         AND status IN ${ORDER_SALES_STATUSES}
         AND created_at >= ? AND created_at < ?
       GROUP BY 1
       ORDER BY 1 DESC`
    ),
    params
  );

  const topProducts = await db.query(
    toDriverSql(
      driver,
      `SELECT COALESCE(p.name, 'Unknown') AS name,
              COALESCE(p.sku, '') AS sku,
              COALESCE(SUM(oi.quantity), 0) AS quantity,
              COALESCE(SUM(oi.line_total), 0) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.deleted_at IS NULL
         AND o.status IN ${ORDER_SALES_STATUSES}
         AND o.created_at >= ? AND o.created_at < ?
       GROUP BY COALESCE(p.name, 'Unknown'), COALESCE(p.sku, '')
       ORDER BY revenue DESC
       LIMIT 25`
    ),
    params
  );

  const recentOrders = await db.query(
    toDriverSql(
      driver,
      `SELECT id, order_number, status, currency, total, created_at
       FROM orders
       WHERE deleted_at IS NULL
         AND status IN ${ORDER_SALES_STATUSES}
         AND created_at >= ? AND created_at < ?
       ORDER BY created_at DESC
       LIMIT 20`
    ),
    params
  );

  const totals = await db.query(
    toDriverSql(
      driver,
      `SELECT
         COUNT(*) AS orders,
         COALESCE(SUM(subtotal), 0) AS gross,
         COALESCE(SUM(discount_amount), 0) AS discounts,
         COALESCE(SUM(subtotal - discount_amount), 0) AS net,
         COALESCE(SUM(delivery_fee), 0) AS delivery,
         COALESCE(SUM(total), 0) AS total
       FROM orders
       WHERE deleted_at IS NULL
         AND status IN ${ORDER_SALES_STATUSES}
         AND created_at >= ? AND created_at < ?`
    ),
    params
  );
  const t = totals.rows?.[0] || {};

  return {
    range,
    currency: 'LRD',
    summary: {
      orders: Number(t.orders || 0),
      grossSales: money(t.gross),
      discounts: money(t.discounts),
      netSales: money(t.net),
      deliveryRevenue: money(t.delivery),
      total: money(t.total),
      averageOrderValue:
        Number(t.orders || 0) > 0 ? money(Number(t.total || 0) / Number(t.orders)) : 0,
    },
    daily: (daily.rows || []).map((r) => ({
      day: String(r.day).slice(0, 10),
      orders: Number(r.orders || 0),
      gross: money(r.gross),
      discounts: money(r.discounts),
      net: money(r.net),
      delivery: money(r.delivery),
      total: money(r.total),
    })),
    topProducts: (topProducts.rows || []).map((r) => ({
      name: r.name,
      sku: r.sku || null,
      quantity: Number(r.quantity || 0),
      revenue: money(r.revenue),
    })),
    recentOrders: (recentOrders.rows || []).map((r) => ({
      id: r.id,
      orderNumber: r.order_number,
      status: r.status,
      currency: r.currency,
      total: money(r.total),
      createdAt: r.created_at,
    })),
  };
}
