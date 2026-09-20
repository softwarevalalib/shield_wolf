import { getDatabase, getDbDriver } from '../../database/connection.js';
import { toDriverSql } from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';
import { getOrderPublicSummary } from './checkoutService.js';

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

/** Digits-only phone for comparison. */
export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/**
 * Match phones allowing optional country-code prefix differences.
 */
export function phonesMatch(a, b) {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const len = Math.min(na.length, nb.length);
  if (len < 7) return false;
  return na.slice(-Math.min(len, 9)) === nb.slice(-Math.min(len, 9));
}

/**
 * Customer-facing tracking steps (simplified from internal statuses).
 */
export const TRACKING_STEPS = [
  {
    key: 'confirmed',
    label: 'Order Confirmed',
    statuses: ['pending', 'confirmed', 'awaiting_payment', 'paid'],
  },
  {
    key: 'preparing',
    label: 'Preparing',
    statuses: ['processing', 'packed'],
  },
  {
    key: 'ready',
    label: 'Ready for Dispatch',
    statuses: ['ready_for_dispatch'],
  },
  {
    key: 'out',
    label: 'Out for Delivery',
    statuses: ['out_for_delivery'],
  },
  {
    key: 'delivered',
    label: 'Delivered',
    statuses: ['delivered'],
  },
];

const STATUS_STEP_INDEX = (() => {
  const map = {};
  TRACKING_STEPS.forEach((step, index) => {
    step.statuses.forEach((status) => {
      map[status] = index;
    });
  });
  return map;
})();

export function buildTrackingTimeline(status, historyRows = []) {
  const terminal = ['cancelled', 'refunded'].includes(status);
  const currentIndex = STATUS_STEP_INDEX[status];
  const historyByTo = new Map();
  for (const row of historyRows) {
    if (row.to_status && !historyByTo.has(row.to_status)) {
      historyByTo.set(row.to_status, row.created_at);
    }
  }

  const steps = TRACKING_STEPS.map((step, index) => {
    let state = 'upcoming';
    if (terminal) {
      state = currentIndex != null && index <= currentIndex ? 'complete' : 'upcoming';
    } else if (currentIndex == null) {
      state = index === 0 ? 'current' : 'upcoming';
    } else if (index < currentIndex) {
      state = 'complete';
    } else if (index === currentIndex) {
      state = status === 'delivered' ? 'complete' : 'current';
    }

    const reachedAt = step.statuses.map((s) => historyByTo.get(s)).find(Boolean) || null;

    return {
      key: step.key,
      label: step.label,
      state,
      reachedAt,
    };
  });

  return {
    steps,
    terminalStatus: terminal ? status : null,
    currentStatus: status,
  };
}

async function loadStatusHistory(db, driver, orderId) {
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT from_status, to_status, note, created_at
       FROM order_status_history
       WHERE order_id = ?
       ORDER BY created_at ASC`
    ),
    [orderId]
  );
  return result.rows || [];
}

function toPublicHistory(rows) {
  return rows.map((row) => ({
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    at: row.created_at,
  }));
}

async function enrichOrderView(order) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const history = await loadStatusHistory(db, driver, order.id);
  const timeline = buildTrackingTimeline(order.status, history);

  return {
    ...order,
    timeline,
    statusHistory: toPublicHistory(history),
  };
}

/**
 * Guest/public track: order number + phone must match.
 */
export async function trackOrderByNumberAndPhone(orderNumber, phone) {
  const number = String(orderNumber || '')
    .trim()
    .toUpperCase();
  const phoneInput = String(phone || '').trim();
  if (!number || !phoneInput) {
    throw new HttpError(400, 'Order number and phone are required', {
      code: 'VALIDATION_ERROR',
    });
  }

  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, guest_phone, customer_snapshot
       FROM orders
       WHERE UPPER(order_number) = ? AND deleted_at IS NULL
       LIMIT 1`
    ),
    [number]
  );
  const row = result.rows?.[0];
  if (!row) {
    throw new HttpError(404, 'Order not found. Check the number and try again.', {
      code: 'NOT_FOUND',
    });
  }

  const snapshot = parseMaybe(row.customer_snapshot) || {};
  const candidates = [row.guest_phone, snapshot.phone, snapshot.whatsapp].filter(Boolean);
  const matched = candidates.some((candidate) => phonesMatch(candidate, phoneInput));
  if (!matched) {
    throw new HttpError(403, 'Phone number does not match this order.', {
      code: 'PHONE_MISMATCH',
    });
  }

  const order = await getOrderPublicSummary(row.id);
  return enrichOrderView(order);
}

function userOwnsOrder(user, row) {
  if (!user || !row) return false;
  if (row.user_id && row.user_id === user.id) return true;
  if (user.email && row.guest_email && user.email.toLowerCase() === row.guest_email.toLowerCase()) {
    return true;
  }
  if (user.phone && phonesMatch(user.phone, row.guest_phone)) return true;
  return false;
}

/**
 * Paginated order list for the signed-in customer.
 */
export async function listOrdersForUser(user, { page = 1, pageSize = 10 } = {}) {
  if (!user?.id) {
    throw new HttpError(401, 'Authentication required', { code: 'UNAUTHENTICATED' });
  }

  const db = await getDatabase();
  const driver = getDbDriver();
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(50, Math.max(1, Number(pageSize) || 10));
  const offset = (safePage - 1) * safeSize;

  const where = `WHERE deleted_at IS NULL AND (user_id = ?${
    user.email ? ' OR LOWER(guest_email) = LOWER(?)' : ''
  })`;

  const countParams = user.email ? [user.id, user.email] : [user.id];
  const countResult = await db.query(
    toDriverSql(driver, `SELECT COUNT(*) AS count FROM orders ${where}`),
    countParams
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const listParams = [...countParams, safeSize, offset];
  const list = await db.query(
    toDriverSql(
      driver,
      `SELECT id, order_number, status, currency, subtotal, delivery_fee, total, created_at
       FROM orders
       ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ),
    listParams
  );

  return {
    orders: (list.rows || []).map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      currency: row.currency,
      subtotal: money(row.subtotal),
      deliveryFee: money(row.delivery_fee),
      total: money(row.total),
      createdAt: row.created_at,
    })),
    pagination: {
      page: safePage,
      pageSize: safeSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / safeSize)),
    },
  };
}

/**
 * Order detail for the owning customer (includes timeline + line items).
 */
export async function getOrderForUser(user, orderIdOrNumber) {
  if (!user?.id) {
    throw new HttpError(401, 'Authentication required', { code: 'UNAUTHENTICATED' });
  }

  const key = String(orderIdOrNumber || '').trim();
  if (!key) {
    throw new HttpError(400, 'Order reference is required', { code: 'VALIDATION_ERROR' });
  }

  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, user_id, guest_email, guest_phone
       FROM orders
       WHERE (id = ? OR order_number = ?) AND deleted_at IS NULL
       LIMIT 1`
    ),
    [key, key]
  );
  const row = result.rows?.[0];
  if (!row || !userOwnsOrder(user, row)) {
    throw new HttpError(404, 'Order not found', { code: 'NOT_FOUND' });
  }

  const order = await getOrderPublicSummary(row.id);
  return enrichOrderView(order);
}

/**
 * Public confirmation lookup (order success) — no phone gate.
 * Adds timeline for richer confirmation.
 */
export async function getOrderPublicWithTimeline(orderIdOrNumber) {
  const order = await getOrderPublicSummary(orderIdOrNumber);
  return enrichOrderView(order);
}
