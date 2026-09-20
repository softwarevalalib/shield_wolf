/**
 * Notification channel abstraction.
 * Business events call this layer — never a single messaging provider.
 */
import crypto from 'node:crypto';
import { getDatabase, getDbDriver } from '../../database/connection.js';
import { isPostgres, jsonValue, nowExpression, toDriverSql } from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';
import { serverEnv } from '../config/env.js';
import { getSettingByKey } from './storefrontService.js';

function uuid() {
  return crypto.randomUUID();
}

function encodeJson(driver, value) {
  // Always stringify — pg treats JS arrays as PG arrays, not JSONB.
  return jsonValue(driver, value);
}

function parseJsonField(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export const NOTIFICATION_EVENTS = {
  'order.placed': {
    title: 'Order placed',
    customerBody: ({ orderNumber }) =>
      `Your order ${orderNumber} was placed successfully. We will confirm payment and prepare delivery.`,
    staffBody: ({ orderNumber, total, currency }) =>
      `New order ${orderNumber}${total != null ? ` · ${total} ${currency || 'LRD'}` : ''}.`,
    notifyStaff: true,
    notifyCustomer: true,
  },
  'payment.submitted': {
    title: 'Payment submitted',
    customerBody: ({ orderNumber }) =>
      `Payment details for order ${orderNumber} were received and await verification.`,
    staffBody: ({ orderNumber, reference }) =>
      `Payment submitted for ${orderNumber}${reference ? ` · ref ${reference}` : ''}.`,
    notifyStaff: true,
    notifyCustomer: true,
  },
  'payment.approved': {
    title: 'Payment approved',
    customerBody: ({ orderNumber }) =>
      `Payment for order ${orderNumber} was approved. We are preparing your order.`,
    staffBody: ({ orderNumber }) => `Payment approved for ${orderNumber}.`,
    notifyStaff: false,
    notifyCustomer: true,
  },
  'payment.rejected': {
    title: 'Payment rejected',
    customerBody: ({ orderNumber }) =>
      `Payment for order ${orderNumber} could not be verified. Please resubmit with a clear reference.`,
    staffBody: ({ orderNumber }) => `Payment rejected for ${orderNumber}.`,
    notifyStaff: false,
    notifyCustomer: true,
  },
  'order.confirmed': {
    title: 'Order confirmed',
    customerBody: ({ orderNumber }) => `Order ${orderNumber} is confirmed.`,
    staffBody: ({ orderNumber }) => `Order ${orderNumber} confirmed.`,
    notifyStaff: false,
    notifyCustomer: true,
  },
  'order.packed': {
    title: 'Order packed',
    customerBody: ({ orderNumber }) =>
      `Order ${orderNumber} has been packed and is ready for dispatch.`,
    staffBody: ({ orderNumber }) => `Order ${orderNumber} packed.`,
    notifyStaff: false,
    notifyCustomer: true,
  },
  'order.out_for_delivery': {
    title: 'Out for delivery',
    customerBody: ({ orderNumber }) => `Order ${orderNumber} is out for delivery.`,
    staffBody: ({ orderNumber }) => `Order ${orderNumber} out for delivery.`,
    notifyStaff: false,
    notifyCustomer: true,
  },
  'order.delivered': {
    title: 'Delivered',
    customerBody: ({ orderNumber }) =>
      `Order ${orderNumber} was delivered. Thank you for shopping with Shield Wolf.`,
    staffBody: ({ orderNumber }) => `Order ${orderNumber} delivered.`,
    notifyStaff: false,
    notifyCustomer: true,
  },
  'order.cancelled': {
    title: 'Order cancelled',
    customerBody: ({ orderNumber }) => `Order ${orderNumber} was cancelled.`,
    staffBody: ({ orderNumber }) => `Order ${orderNumber} cancelled.`,
    notifyStaff: true,
    notifyCustomer: true,
  },
  'auth.password_reset': {
    title: 'Password reset',
    customerBody: () => 'A password reset was requested for your account.',
    staffBody: () => 'Password reset requested.',
    notifyStaff: false,
    notifyCustomer: false,
  },
};

const ORDER_STATUS_EVENT = {
  confirmed: 'order.confirmed',
  packed: 'order.packed',
  out_for_delivery: 'order.out_for_delivery',
  delivered: 'order.delivered',
  cancelled: 'order.cancelled',
};

function mapNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    channel: row.channel,
    eventType: row.event_type,
    title: row.title,
    body: row.body,
    payload: parseJsonField(row.payload),
    status: row.status,
    readAt: row.read_at,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listStaffUserIds(db, driver) {
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id FROM users
       WHERE user_type IN ('admin', 'staff') AND status = 'active' AND deleted_at IS NULL
       LIMIT 100`
    )
  );
  return (result.rows || []).map((row) => row.id);
}

async function insertNotification(db, driver, row) {
  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO notifications
         (id, user_id, channel, event_type, title, body, payload, status, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    [
      row.id,
      row.userId,
      row.channel,
      row.eventType,
      row.title,
      row.body,
      encodeJson(driver, row.payload || {}),
      row.status,
      row.sentAt || null,
    ]
  );
}

async function deliverEmailChannel({ eventType, title, body, payload }) {
  if (serverEnv.emailProvider === 'console' || !serverEnv.isProd) {
    console.info('[notification:email]', {
      eventType,
      title,
      body,
      to: payload?.email || payload?.guestEmail || null,
    });
    return { channel: 'email', status: 'sent', provider: 'console' };
  }
  return {
    channel: 'email',
    status: 'deferred',
    reason: 'Email provider not configured — set EMAIL_PROVIDER when ready',
  };
}

/**
 * Low-level dispatch used by auth and business helpers.
 * Persists in-app rows; email/SMS/WhatsApp stay provider-abstracted.
 */
export async function dispatchNotification(event, payload = {}, channels = ['in_app']) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const catalog = NOTIFICATION_EVENTS[event] || {
    title: event,
    customerBody: () => payload.message || event,
    staffBody: () => payload.message || event,
  };
  const title = payload.title || catalog.title || event;
  const body =
    payload.body ||
    (payload.audience === 'staff'
      ? catalog.staffBody?.(payload) || title
      : catalog.customerBody?.(payload) || title);

  const results = [];

  for (const channel of channels) {
    if (channel === 'in_app') {
      if (!payload.userId) {
        results.push({ channel, status: 'skipped', reason: 'No userId for in-app' });
        continue;
      }
      const id = uuid();
      await insertNotification(db, driver, {
        id,
        userId: payload.userId,
        channel: 'in_app',
        eventType: event,
        title,
        body,
        payload,
        status: 'sent',
        sentAt: new Date().toISOString(),
      });
      results.push({ channel, status: 'sent', id });
      continue;
    }

    if (channel === 'email') {
      const emailResult = await deliverEmailChannel({
        eventType: event,
        title,
        body,
        payload,
      });
      const id = uuid();
      await insertNotification(db, driver, {
        id,
        userId: payload.userId || null,
        channel: 'email',
        eventType: event,
        title,
        body,
        payload,
        status: emailResult.status === 'sent' ? 'sent' : 'queued',
        sentAt: emailResult.status === 'sent' ? new Date().toISOString() : null,
      });
      results.push({ ...emailResult, id });
      continue;
    }

    if (channel === 'sms' || channel === 'whatsapp') {
      const id = uuid();
      await insertNotification(db, driver, {
        id,
        userId: payload.userId || null,
        channel,
        eventType: event,
        title,
        body,
        payload,
        status: 'queued',
      });
      results.push({
        channel,
        status: 'deferred',
        reason: `${channel} provider wiring is future`,
        id,
      });
      continue;
    }

    results.push({ channel, status: 'unsupported' });
  }

  return results;
}

/**
 * Fire-and-forget wrapper so notification failures never break checkout/payments.
 */
export async function safeNotify(task) {
  try {
    return await task();
  } catch (error) {
    console.error('[notification]', error?.message || error);
    return null;
  }
}

async function emailSettingsEnabled(kind) {
  const email = await getSettingByKey('business_settings', 'email');
  const value = email?.value || {};
  if (kind === 'order') return value.order_notifications !== false;
  if (kind === 'payment') return value.payment_notifications !== false;
  return true;
}

/**
 * High-level business event: customer + staff + optional email.
 */
export async function notifyBusinessEvent(eventType, context = {}) {
  const catalog = NOTIFICATION_EVENTS[eventType];
  if (!catalog) {
    return dispatchNotification(eventType, context, context.channels || ['in_app']);
  }

  const db = await getDatabase();
  const driver = getDbDriver();
  const results = { customer: [], staff: [], email: [] };
  const payload = {
    ...context,
    orderNumber: context.orderNumber || null,
    orderId: context.orderId || null,
    total: context.total ?? null,
    currency: context.currency || 'LRD',
    reference: context.reference || null,
  };

  const wantEmail =
    Boolean(context.email || context.guestEmail) &&
    (eventType.startsWith('payment.')
      ? await emailSettingsEnabled('payment')
      : await emailSettingsEnabled('order'));

  if (catalog.notifyCustomer && context.userId) {
    results.customer = await dispatchNotification(
      eventType,
      { ...payload, userId: context.userId, audience: 'customer' },
      ['in_app']
    );
  }

  if (wantEmail && (context.email || context.guestEmail)) {
    results.email = await dispatchNotification(
      eventType,
      {
        ...payload,
        userId: context.userId || null,
        email: context.email || context.guestEmail,
        audience: 'customer',
      },
      ['email']
    );
  }

  if (catalog.notifyStaff) {
    const staffIds = await listStaffUserIds(db, driver);
    const staffBody = catalog.staffBody(payload);
    for (const staffId of staffIds) {
      if (context.userId && staffId === context.userId) continue;
      const id = uuid();
      await insertNotification(db, driver, {
        id,
        userId: staffId,
        channel: 'in_app',
        eventType,
        title: catalog.title,
        body: staffBody,
        payload: { ...payload, audience: 'staff' },
        status: 'sent',
        sentAt: new Date().toISOString(),
      });
      results.staff.push({ channel: 'in_app', status: 'sent', id, userId: staffId });
    }
  }

  return results;
}

export function eventTypeForOrderStatus(status) {
  return ORDER_STATUS_EVENT[status] || null;
}

export async function listUserNotifications(userId, filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const where = ['user_id = ?', `channel = 'in_app'`];
  const params = [userId];

  if (filters.unreadOnly) {
    where.push(`status != 'read'`);
    where.push('read_at IS NULL');
  }

  const whereSql = where.join(' AND ');
  const countResult = await db.query(
    toDriverSql(driver, `SELECT COUNT(*) AS count FROM notifications WHERE ${whereSql}`),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT * FROM notifications
       WHERE ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ),
    [...params, pageSize, offset]
  );

  const unreadResult = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS count FROM notifications
       WHERE user_id = ? AND channel = 'in_app' AND status != 'read' AND read_at IS NULL`
    ),
    [userId]
  );

  return {
    items: (result.rows || []).map(mapNotification),
    unreadCount: Number(unreadResult.rows?.[0]?.count || 0),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function markNotificationRead(userId, notificationId) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, user_id, status FROM notifications
       WHERE id = ? AND user_id = ? AND channel = 'in_app' LIMIT 1`
    ),
    [notificationId, userId]
  );
  const row = result.rows?.[0];
  if (!row) throw new HttpError(404, 'Notification not found', { code: 'NOT_FOUND' });

  await db.query(
    toDriverSql(
      driver,
      `UPDATE notifications
       SET status = 'read', read_at = ${nowExpression(driver)}, updated_at = ${nowExpression(driver)}
       WHERE id = ?`
    ),
    [notificationId]
  );
  return { id: notificationId, read: true };
}

export async function markAllNotificationsRead(userId) {
  const db = await getDatabase();
  const driver = getDbDriver();
  await db.query(
    toDriverSql(
      driver,
      `UPDATE notifications
       SET status = 'read', read_at = COALESCE(read_at, ${nowExpression(driver)}),
           updated_at = ${nowExpression(driver)}
       WHERE user_id = ? AND channel = 'in_app' AND (status != 'read' OR read_at IS NULL)`
    ),
    [userId]
  );
  return { read: true };
}

export async function listAdminNotifications(filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 30));
  const offset = (page - 1) * pageSize;

  const where = ['1=1'];
  const params = [];

  if (filters.channel && filters.channel !== 'all') {
    where.push('channel = ?');
    params.push(filters.channel);
  }
  if (filters.eventType && filters.eventType !== 'all') {
    where.push('event_type = ?');
    params.push(filters.eventType);
  }
  if (filters.q) {
    const term = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push(
      "(LOWER(title) LIKE ? OR LOWER(COALESCE(body,'')) LIKE ? OR LOWER(event_type) LIKE ?)"
    );
    params.push(term, term, term);
  }

  const whereSql = where.join(' AND ');
  const countResult = await db.query(
    toDriverSql(driver, `SELECT COUNT(*) AS count FROM notifications WHERE ${whereSql}`),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT n.*, u.email AS user_email, u.user_type
       FROM notifications n
       LEFT JOIN users u ON u.id = n.user_id
       WHERE ${whereSql}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`
    ),
    [...params, pageSize, offset]
  );

  return {
    items: (result.rows || []).map((row) => ({
      ...mapNotification(row),
      userEmail: row.user_email || null,
      userType: row.user_type || null,
    })),
    eventTypes: Object.keys(NOTIFICATION_EVENTS),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
