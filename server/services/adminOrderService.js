import crypto from 'node:crypto';
import { getDatabase, getDbDriver } from '../../database/connection.js';
import { nowExpression, toDriverSql } from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';
import { getOrderPublicSummary } from './checkoutService.js';
import { buildTrackingTimeline } from './orderService.js';
import { ORDER_STATUSES } from '../validators/adminOrders.js';
import { eventTypeForOrderStatus, notifyBusinessEvent, safeNotify } from './notificationService.js';

function uuid() {
  return crypto.randomUUID();
}

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) * 100) / 100;
}

function parseMaybe(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Allowed next statuses from the current status (configurable transitions).
 */
export const ORDER_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'awaiting_payment', 'cancelled'],
  confirmed: ['awaiting_payment', 'paid', 'processing', 'cancelled'],
  awaiting_payment: ['paid', 'confirmed', 'cancelled'],
  paid: ['processing', 'cancelled', 'refunded'],
  processing: ['packed', 'ready_for_dispatch', 'cancelled'],
  packed: ['ready_for_dispatch', 'cancelled'],
  ready_for_dispatch: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

export function getAllowedTransitions(status) {
  return ORDER_STATUS_TRANSITIONS[status] || [];
}

function mapListRow(row) {
  const customer = parseMaybe(row.customer_snapshot) || {};
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    currency: row.currency || 'LRD',
    subtotal: money(row.subtotal),
    deliveryFee: money(row.delivery_fee),
    total: money(row.total),
    customerName:
      [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
      customer.name ||
      row.guest_email ||
      'Guest',
    phone: row.guest_phone || customer.phone || customer.whatsapp || null,
    email: row.guest_email || customer.email || null,
    paymentStatus: row.payment_status || null,
    paymentMethod: row.payment_method || null,
    itemCount: Number(row.item_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Admin order list with search / status filters.
 */
export async function listAdminOrders(filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const where = ['o.deleted_at IS NULL'];
  const params = [];

  if (filters.status && filters.status !== 'all') {
    where.push('o.status = ?');
    params.push(filters.status);
  }

  if (filters.q) {
    const term = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push(
      `(LOWER(o.order_number) LIKE ? OR LOWER(COALESCE(o.guest_email, '')) LIKE ? OR LOWER(COALESCE(o.guest_phone, '')) LIKE ? OR LOWER(COALESCE(o.customer_snapshot, '')) LIKE ?)`
    );
    params.push(term, term, term, term);
  }

  const whereSql = where.join(' AND ');

  const countResult = await db.query(
    toDriverSql(driver, `SELECT COUNT(*) AS count FROM orders o WHERE ${whereSql}`),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const list = await db.query(
    toDriverSql(
      driver,
      `SELECT o.id, o.order_number, o.status, o.currency, o.subtotal, o.delivery_fee, o.total,
              o.guest_email, o.guest_phone, o.customer_snapshot, o.created_at, o.updated_at,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
              (SELECT p.status FROM payments p WHERE p.order_id = o.id
               ORDER BY p.created_at DESC LIMIT 1) AS payment_status,
              (SELECT p.method FROM payments p WHERE p.order_id = o.id
               ORDER BY p.created_at DESC LIMIT 1) AS payment_method
       FROM orders o
       WHERE ${whereSql}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`
    ),
    [...params, pageSize, offset]
  );

  const statusCounts = await db.query(
    toDriverSql(
      driver,
      `SELECT status, COUNT(*) AS count
       FROM orders
       WHERE deleted_at IS NULL
       GROUP BY status`
    )
  );

  const counts = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]));
  for (const row of statusCounts.rows || []) {
    counts[row.status] = Number(row.count || 0);
  }

  return {
    orders: (list.rows || []).map(mapListRow),
    statusCounts: counts,
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

async function loadAdminHistory(db, driver, orderId) {
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT h.id, h.from_status, h.to_status, h.note, h.created_at, h.changed_by,
              u.email AS changed_by_email
       FROM order_status_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.order_id = ?
       ORDER BY h.created_at ASC`
    ),
    [orderId]
  );
  return (result.rows || []).map((row) => ({
    id: row.id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    changedBy: row.changed_by,
    changedByEmail: row.changed_by_email || null,
    at: row.created_at,
  }));
}

/**
 * Full admin order detail.
 */
export async function getAdminOrder(idOrNumber) {
  const db = await getDatabase();
  const driver = getDbDriver();

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT *
       FROM orders
       WHERE (id = ? OR UPPER(order_number) = UPPER(?)) AND deleted_at IS NULL
       LIMIT 1`
    ),
    [idOrNumber, idOrNumber]
  );
  const row = result.rows?.[0];
  if (!row) {
    throw new HttpError(404, 'Order not found', { code: 'NOT_FOUND' });
  }

  const summary = await getOrderPublicSummary(row.id);
  const history = await loadAdminHistory(db, driver, row.id);
  const timeline = buildTrackingTimeline(
    row.status,
    history.map((h) => ({
      to_status: h.toStatus,
      created_at: h.at,
    }))
  );

  return {
    ...summary,
    adminNotes: row.admin_notes || null,
    notes: row.notes || null,
    userId: row.user_id || null,
    customerProfileId: row.customer_profile_id || null,
    updatedAt: row.updated_at,
    allowedTransitions: getAllowedTransitions(row.status),
    timeline,
    statusHistory: history,
  };
}

/**
 * Transition order status with history row.
 */
export async function updateAdminOrderStatus(
  idOrNumber,
  { status, note = null, changedBy = null }
) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const current = await getAdminOrder(idOrNumber);

  if (current.status === status) {
    return current;
  }

  const allowed = getAllowedTransitions(current.status);
  if (!allowed.includes(status)) {
    throw new HttpError(409, `Cannot move from ${current.status} to ${status}`, {
      code: 'INVALID_TRANSITION',
      details: { from: current.status, to: status, allowed },
    });
  }

  await db.query(
    toDriverSql(
      driver,
      `UPDATE orders SET status = ?, updated_at = ${nowExpression(driver)} WHERE id = ?`
    ),
    [status, current.id]
  );

  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO order_status_history (id, order_id, from_status, to_status, note, changed_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    ),
    [uuid(), current.id, current.status, status, note || null, changedBy || null]
  );

  const updated = await getAdminOrder(current.id);
  const eventType = eventTypeForOrderStatus(status);
  if (eventType) {
    await safeNotify(() =>
      notifyBusinessEvent(eventType, {
        userId: updated.userId || null,
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        email: updated.email || null,
        guestEmail: updated.email || null,
      })
    );
  }
  return updated;
}

/**
 * Update internal admin notes (not customer-visible).
 */
export async function updateAdminOrderNotes(idOrNumber, { adminNotes = null }) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const current = await getAdminOrder(idOrNumber);

  await db.query(
    toDriverSql(
      driver,
      `UPDATE orders SET admin_notes = ?, updated_at = ${nowExpression(driver)} WHERE id = ?`
    ),
    [adminNotes || null, current.id]
  );

  return getAdminOrder(current.id);
}
