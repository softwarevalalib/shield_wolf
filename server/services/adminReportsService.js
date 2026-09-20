import { getDatabase, getDbDriver } from '../../database/connection.js';
import { toDriverSql } from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';
import { resolveFinanceRange } from './adminFinanceService.js';

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) * 100) / 100;
}

function dayKeyExpr(driver, column) {
  if (driver === 'postgres') {
    return `TO_CHAR(${column}::timestamptz, 'YYYY-MM-DD')`;
  }
  return `substr(${column}, 1, 10)`;
}

const ORDER_SALES_STATUSES = `('paid','processing','packed','ready_for_dispatch','out_for_delivery','delivered','confirmed')`;

export const REPORT_TYPES = [
  'sales',
  'orders',
  'products',
  'customers',
  'inventory',
  'delivery',
  'finance',
];

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(columns, rows) {
  const header = columns.map((c) => csvEscape(c.header)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) => csvEscape(typeof c.value === 'function' ? c.value(row) : row[c.key]))
      .join(',')
  );
  return [header, ...lines].join('\n');
}

async function reportSales(db, driver, range) {
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
       WHERE deleted_at IS NULL AND status IN ${ORDER_SALES_STATUSES}
         AND created_at >= ? AND created_at < ?
       GROUP BY 1 ORDER BY 1 ASC`
    ),
    params
  );

  const summary = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS orders,
              COALESCE(SUM(subtotal), 0) AS gross,
              COALESCE(SUM(discount_amount), 0) AS discounts,
              COALESCE(SUM(subtotal - discount_amount), 0) AS net,
              COALESCE(SUM(total), 0) AS total
       FROM orders
       WHERE deleted_at IS NULL AND status IN ${ORDER_SALES_STATUSES}
         AND created_at >= ? AND created_at < ?`
    ),
    params
  );
  const s = summary.rows?.[0] || {};

  const rows = (daily.rows || []).map((r) => ({
    day: String(r.day).slice(0, 10),
    orders: Number(r.orders || 0),
    gross: money(r.gross),
    discounts: money(r.discounts),
    net: money(r.net),
    delivery: money(r.delivery),
    total: money(r.total),
  }));

  return {
    title: 'Sales report',
    summary: {
      orders: Number(s.orders || 0),
      gross: money(s.gross),
      discounts: money(s.discounts),
      net: money(s.net),
      total: money(s.total),
      averageOrderValue: Number(s.orders || 0) > 0 ? money(Number(s.total) / Number(s.orders)) : 0,
    },
    columns: [
      { key: 'day', header: 'Day' },
      { key: 'orders', header: 'Orders' },
      { key: 'gross', header: 'Gross' },
      { key: 'discounts', header: 'Discounts' },
      { key: 'net', header: 'Net' },
      { key: 'delivery', header: 'Delivery' },
      { key: 'total', header: 'Total' },
    ],
    rows,
  };
}

async function reportOrders(db, driver, range) {
  const params = [range.from, range.to];
  const byStatus = await db.query(
    toDriverSql(
      driver,
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(total), 0) AS total
       FROM orders
       WHERE deleted_at IS NULL AND created_at >= ? AND created_at < ?
       GROUP BY status ORDER BY count DESC`
    ),
    params
  );

  const list = await db.query(
    toDriverSql(
      driver,
      `SELECT id, order_number, status, currency, total, created_at, guest_phone
       FROM orders
       WHERE deleted_at IS NULL AND created_at >= ? AND created_at < ?
       ORDER BY created_at DESC
       LIMIT 200`
    ),
    params
  );

  return {
    title: 'Orders report',
    summary: {
      orders: (list.rows || []).length,
      byStatus: (byStatus.rows || []).map((r) => ({
        status: r.status,
        count: Number(r.count || 0),
        total: money(r.total),
      })),
    },
    columns: [
      { key: 'orderNumber', header: 'Order' },
      { key: 'status', header: 'Status' },
      { key: 'total', header: 'Total' },
      { key: 'phone', header: 'Phone' },
      { key: 'createdAt', header: 'Created' },
    ],
    rows: (list.rows || []).map((r) => ({
      id: r.id,
      orderNumber: r.order_number,
      status: r.status,
      total: money(r.total),
      currency: r.currency,
      phone: r.guest_phone,
      createdAt: r.created_at,
    })),
  };
}

async function reportProducts(db, driver, range) {
  const params = [range.from, range.to];
  const best = await db.query(
    toDriverSql(
      driver,
      `SELECT COALESCE(p.name, 'Unknown') AS name,
              COALESCE(p.sku, '') AS sku,
              COALESCE(SUM(oi.quantity), 0) AS quantity,
              COALESCE(SUM(oi.line_total), 0) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.deleted_at IS NULL AND o.status IN ${ORDER_SALES_STATUSES}
         AND o.created_at >= ? AND o.created_at < ?
       GROUP BY COALESCE(p.name, 'Unknown'), COALESCE(p.sku, '')
       ORDER BY quantity DESC
       LIMIT 50`
    ),
    params
  );

  const slow = await db.query(
    toDriverSql(
      driver,
      `SELECT p.id, p.name, p.sku, COALESCE(sold.qty, 0) AS quantity_sold,
              COALESCE(i.quantity, p.stock_quantity, 0) AS stock
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id AND i.variant_id IS NULL
       LEFT JOIN (
         SELECT oi.product_id, SUM(oi.quantity) AS qty
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.deleted_at IS NULL AND o.status IN ${ORDER_SALES_STATUSES}
           AND o.created_at >= ? AND o.created_at < ?
         GROUP BY oi.product_id
       ) sold ON sold.product_id = p.id
       WHERE p.deleted_at IS NULL AND p.active = ${driver === 'postgres' ? 'TRUE' : '1'}
       ORDER BY COALESCE(sold.qty, 0) ASC, p.name ASC
       LIMIT 50`
    ),
    params
  );

  return {
    title: 'Product reports',
    summary: {
      bestSellers: (best.rows || []).length,
      slowMovers: (slow.rows || []).length,
    },
    sections: [
      {
        id: 'best',
        title: 'Best selling products',
        columns: [
          { key: 'name', header: 'Product' },
          { key: 'sku', header: 'SKU' },
          { key: 'quantity', header: 'Qty sold' },
          { key: 'revenue', header: 'Revenue' },
        ],
        rows: (best.rows || []).map((r) => ({
          name: r.name,
          sku: r.sku || '',
          quantity: Number(r.quantity || 0),
          revenue: money(r.revenue),
        })),
      },
      {
        id: 'slow',
        title: 'Slow / low-movement products',
        columns: [
          { key: 'name', header: 'Product' },
          { key: 'sku', header: 'SKU' },
          { key: 'quantitySold', header: 'Qty sold' },
          { key: 'stock', header: 'Stock' },
        ],
        rows: (slow.rows || []).map((r) => ({
          name: r.name,
          sku: r.sku || '',
          quantitySold: Number(r.quantity_sold || 0),
          stock: Number(r.stock || 0),
        })),
      },
    ],
    columns: [
      { key: 'name', header: 'Product' },
      { key: 'sku', header: 'SKU' },
      { key: 'quantity', header: 'Qty sold' },
      { key: 'revenue', header: 'Revenue' },
    ],
    rows: (best.rows || []).map((r) => ({
      name: r.name,
      sku: r.sku || '',
      quantity: Number(r.quantity || 0),
      revenue: money(r.revenue),
    })),
  };
}

async function reportCustomers(db, driver, range) {
  const params = [range.from, range.to];
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT
         COALESCE(o.user_id, o.guest_phone, o.guest_email, o.id) AS customer_key,
         o.guest_phone AS phone,
         o.guest_email AS email,
         COUNT(*) AS orders,
         COALESCE(SUM(o.total), 0) AS spend,
         MAX(o.created_at) AS last_order_at
       FROM orders o
       WHERE o.deleted_at IS NULL AND o.status IN ${ORDER_SALES_STATUSES}
         AND o.created_at >= ? AND o.created_at < ?
       GROUP BY COALESCE(o.user_id, o.guest_phone, o.guest_email, o.id), o.guest_phone, o.guest_email
       ORDER BY spend DESC
       LIMIT 100`
    ),
    params
  );

  const rows = (result.rows || []).map((r) => ({
    phone: r.phone || '—',
    email: r.email || '—',
    orders: Number(r.orders || 0),
    spend: money(r.spend),
    lastOrderAt: r.last_order_at,
  }));

  return {
    title: 'Customer reports',
    summary: {
      customers: rows.length,
      totalSpend: money(rows.reduce((s, r) => s + r.spend, 0)),
    },
    columns: [
      { key: 'phone', header: 'Phone' },
      { key: 'email', header: 'Email' },
      { key: 'orders', header: 'Orders' },
      { key: 'spend', header: 'Spend' },
      { key: 'lastOrderAt', header: 'Last order' },
    ],
    rows,
  };
}

async function reportInventory(db, driver) {
  const low = await db.query(
    toDriverSql(
      driver,
      `SELECT p.id, p.name, p.sku,
              COALESCE(i.quantity, p.stock_quantity, 0) AS quantity,
              COALESCE(i.low_stock_threshold, p.low_stock_threshold, 5) AS threshold
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id AND i.variant_id IS NULL
       WHERE p.deleted_at IS NULL
         AND COALESCE(i.quantity, p.stock_quantity, 0)
             <= COALESCE(i.low_stock_threshold, p.low_stock_threshold, 5)
       ORDER BY quantity ASC, p.name ASC
       LIMIT 100`
    )
  );

  const out = await db.query(
    toDriverSql(
      driver,
      `SELECT p.id, p.name, p.sku,
              COALESCE(i.quantity, p.stock_quantity, 0) AS quantity
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id AND i.variant_id IS NULL
       WHERE p.deleted_at IS NULL
         AND COALESCE(i.quantity, p.stock_quantity, 0) <= 0
       ORDER BY p.name ASC
       LIMIT 100`
    )
  );

  const value = await db.query(
    toDriverSql(
      driver,
      `SELECT COALESCE(SUM(
         COALESCE(i.quantity, p.stock_quantity, 0) * COALESCE(p.cost_price, p.price, 0)
       ), 0) AS stock_value,
       COUNT(*) AS products
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id AND i.variant_id IS NULL
       WHERE p.deleted_at IS NULL`
    )
  );

  return {
    title: 'Inventory report',
    summary: {
      products: Number(value.rows?.[0]?.products || 0),
      stockValue: money(value.rows?.[0]?.stock_value),
      lowStock: (low.rows || []).length,
      outOfStock: (out.rows || []).length,
    },
    sections: [
      {
        id: 'low',
        title: 'Low stock',
        columns: [
          { key: 'name', header: 'Product' },
          { key: 'sku', header: 'SKU' },
          { key: 'quantity', header: 'Qty' },
          { key: 'threshold', header: 'Threshold' },
        ],
        rows: (low.rows || []).map((r) => ({
          name: r.name,
          sku: r.sku || '',
          quantity: Number(r.quantity || 0),
          threshold: Number(r.threshold || 0),
        })),
      },
      {
        id: 'out',
        title: 'Out of stock',
        columns: [
          { key: 'name', header: 'Product' },
          { key: 'sku', header: 'SKU' },
          { key: 'quantity', header: 'Qty' },
        ],
        rows: (out.rows || []).map((r) => ({
          name: r.name,
          sku: r.sku || '',
          quantity: Number(r.quantity || 0),
        })),
      },
    ],
    columns: [
      { key: 'name', header: 'Product' },
      { key: 'sku', header: 'SKU' },
      { key: 'quantity', header: 'Qty' },
      { key: 'threshold', header: 'Threshold' },
    ],
    rows: (low.rows || []).map((r) => ({
      name: r.name,
      sku: r.sku || '',
      quantity: Number(r.quantity || 0),
      threshold: Number(r.threshold || 0),
    })),
  };
}

async function reportDelivery(db, driver, range) {
  const params = [range.from, range.to];
  const byStatus = await db.query(
    toDriverSql(
      driver,
      `SELECT status, COUNT(*) AS count
       FROM deliveries
       WHERE deleted_at IS NULL AND created_at >= ? AND created_at < ?
       GROUP BY status ORDER BY count DESC`
    ),
    params
  );

  const totals = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
              SUM(CASE WHEN status IN ('failed','returned','cancelled') THEN 1 ELSE 0 END) AS failed
       FROM deliveries
       WHERE deleted_at IS NULL AND created_at >= ? AND created_at < ?`
    ),
    params
  );
  const t = totals.rows?.[0] || {};
  const total = Number(t.total || 0);
  const delivered = Number(t.delivered || 0);

  return {
    title: 'Delivery report',
    summary: {
      total,
      delivered,
      failed: Number(t.failed || 0),
      successRate: total > 0 ? Math.round((delivered / total) * 1000) / 10 : 0,
    },
    columns: [
      { key: 'status', header: 'Status' },
      { key: 'count', header: 'Count' },
    ],
    rows: (byStatus.rows || []).map((r) => ({
      status: r.status,
      count: Number(r.count || 0),
    })),
  };
}

async function reportFinance(db, driver, range) {
  const params = [range.from, range.to];

  const payments = await db.query(
    toDriverSql(
      driver,
      `SELECT status, method, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
       FROM payments
       WHERE created_at >= ? AND created_at < ?
       GROUP BY status, method
       ORDER BY amount DESC`
    ),
    params
  );

  const collected = await db.query(
    toDriverSql(
      driver,
      `SELECT COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count
       FROM payments
       WHERE status = 'paid'
         AND COALESCE(verified_at, updated_at, created_at) >= ?
         AND COALESCE(verified_at, updated_at, created_at) < ?`
    ),
    params
  );

  const outstanding = await db.query(
    toDriverSql(
      driver,
      `SELECT COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count
       FROM payments WHERE status IN ('pending','pending_verification')`
    )
  );

  const expenses = await db.query(
    toDriverSql(
      driver,
      `SELECT c.name AS category, COALESCE(SUM(e.amount), 0) AS amount, COUNT(*) AS count
       FROM expenses e
       JOIN expense_categories c ON c.id = e.category_id
       WHERE e.deleted_at IS NULL AND e.expense_date >= ? AND e.expense_date < ?
       GROUP BY c.name ORDER BY amount DESC`
    ),
    params
  );

  const sales = await db.query(
    toDriverSql(
      driver,
      `SELECT COALESCE(SUM(subtotal - discount_amount), 0) AS net,
              COALESCE(SUM(delivery_fee), 0) AS delivery
       FROM orders
       WHERE deleted_at IS NULL AND status IN ${ORDER_SALES_STATUSES}
         AND created_at >= ? AND created_at < ?`
    ),
    params
  );

  const net = money(sales.rows?.[0]?.net);
  const expenseTotal = money((expenses.rows || []).reduce((s, r) => s + Number(r.amount || 0), 0));
  const revenue = money(collected.rows?.[0]?.amount);

  return {
    title: 'Financial report',
    summary: {
      revenue,
      netSales: net,
      deliveryRevenue: money(sales.rows?.[0]?.delivery),
      expenses: expenseTotal,
      outstandingPayments: money(outstanding.rows?.[0]?.amount),
      outstandingCount: Number(outstanding.rows?.[0]?.count || 0),
      estimatedProfit: money(net + Number(sales.rows?.[0]?.delivery || 0) - expenseTotal),
      paidPayments: Number(collected.rows?.[0]?.count || 0),
    },
    sections: [
      {
        id: 'payments',
        title: 'Payments by status / method',
        columns: [
          { key: 'status', header: 'Status' },
          { key: 'method', header: 'Method' },
          { key: 'count', header: 'Count' },
          { key: 'amount', header: 'Amount' },
        ],
        rows: (payments.rows || []).map((r) => ({
          status: r.status,
          method: r.method,
          count: Number(r.count || 0),
          amount: money(r.amount),
        })),
      },
      {
        id: 'expenses',
        title: 'Expenses by category',
        columns: [
          { key: 'category', header: 'Category' },
          { key: 'count', header: 'Count' },
          { key: 'amount', header: 'Amount' },
        ],
        rows: (expenses.rows || []).map((r) => ({
          category: r.category,
          count: Number(r.count || 0),
          amount: money(r.amount),
        })),
      },
    ],
    columns: [
      { key: 'status', header: 'Status' },
      { key: 'method', header: 'Method' },
      { key: 'count', header: 'Count' },
      { key: 'amount', header: 'Amount' },
    ],
    rows: (payments.rows || []).map((r) => ({
      status: r.status,
      method: r.method,
      count: Number(r.count || 0),
      amount: money(r.amount),
    })),
  };
}

/**
 * Run a named admin report with optional CSV payload fields.
 */
export async function runAdminReport(type, query = {}) {
  if (!REPORT_TYPES.includes(type)) {
    throw new HttpError(400, `Unknown report type: ${type}`, { code: 'VALIDATION_ERROR' });
  }

  const db = await getDatabase();
  const driver = getDbDriver();
  const range = resolveFinanceRange(query);

  let report;
  switch (type) {
    case 'sales':
      report = await reportSales(db, driver, range);
      break;
    case 'orders':
      report = await reportOrders(db, driver, range);
      break;
    case 'products':
      report = await reportProducts(db, driver, range);
      break;
    case 'customers':
      report = await reportCustomers(db, driver, range);
      break;
    case 'inventory':
      report = await reportInventory(db, driver);
      break;
    case 'delivery':
      report = await reportDelivery(db, driver, range);
      break;
    case 'finance':
      report = await reportFinance(db, driver, range);
      break;
    default:
      throw new HttpError(400, 'Unknown report type', { code: 'VALIDATION_ERROR' });
  }

  return {
    type,
    range: type === 'inventory' ? null : range,
    currency: 'LRD',
    generatedAt: new Date().toISOString(),
    ...report,
  };
}

export function reportToCsv(report) {
  const sections = report.sections?.length
    ? report.sections
    : [{ title: report.title, columns: report.columns, rows: report.rows }];

  const parts = [];
  for (const section of sections) {
    parts.push(`# ${section.title || report.title}`);
    parts.push(rowsToCsv(section.columns || [], section.rows || []));
    parts.push('');
  }
  return parts.join('\n');
}
