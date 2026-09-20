import crypto from 'node:crypto';
import { getDatabase, getDbDriver } from '../../database/connection.js';
import { isPostgres, jsonValue, toDriverSql } from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';
import { serverEnv } from '../config/env.js';
import { getUserFromAccessToken } from './authService.js';
import { getOrderPublicSummary } from './checkoutService.js';
import { phonesMatch } from './orderService.js';
import { getSettingByKey } from './storefrontService.js';
import { notifyBusinessEvent, safeNotify } from './notificationService.js';

function uuid() {
  return crypto.randomUUID();
}

function encodeJson(driver, value) {
  // Always stringify — pg treats JS arrays as PG arrays, not JSONB.
  return jsonValue(driver, value);
}

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) * 100) / 100;
}

const MANUAL_METHODS = new Set(['mtn_momo', 'orange_money']);
const SUBMITTABLE_STATUSES = new Set(['pending', 'pending_verification', 'rejected', 'failed']);

/**
 * Payment provider abstraction — checkout must not couple to one company.
 */
export function listConfiguredPaymentMethods() {
  const mode =
    serverEnv.paymentProvider === 'manual' ? 'manual_verification' : serverEnv.paymentProvider;
  return [
    { id: 'cod', label: 'Cash on Delivery', enabled: true, mode: 'cod' },
    { id: 'mtn_momo', label: 'MTN MoMo', enabled: true, mode },
    { id: 'orange_money', label: 'Orange Money', enabled: true, mode },
  ];
}

export async function getPublicPaymentConfig() {
  const businessSetting = await getSettingByKey('business_settings', 'general');
  const business = businessSetting?.value || {};
  const fallbackPhone = Array.isArray(business.phones) ? business.phones[0] : null;
  const evidenceEnabled = process.env.PAYMENT_EVIDENCE_ENABLED !== 'false';

  return {
    provider: serverEnv.paymentProvider || 'manual',
    evidenceEnabled,
    evidenceMode: 'url', // file upload arrives with media phase
    methods: listConfiguredPaymentMethods().filter((m) => m.enabled),
    instructions: {
      mtn_momo: {
        label: 'MTN MoMo',
        accountName: business.business_name || 'Shield Wolf',
        number: process.env.MTN_MOMO_NUMBER || fallbackPhone || null,
        hint: 'Send the order total, then submit your transaction reference below. Never share your PIN or OTP.',
      },
      orange_money: {
        label: 'Orange Money',
        accountName: business.business_name || 'Shield Wolf',
        number: process.env.ORANGE_MONEY_NUMBER || fallbackPhone || null,
        hint: 'Send the order total, then submit your transaction reference below. Never share your PIN or OTP.',
      },
      cod: {
        label: 'Cash on Delivery',
        hint: 'Pay the rider when your order arrives. No online payment is required.',
      },
    },
  };
}

function mapPaymentRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    method: row.method,
    provider: row.provider,
    status: row.status,
    amount: money(row.amount),
    currency: row.currency,
    reference: row.reference,
    evidenceUrl: row.evidence_url,
    customerNote: row.customer_note,
    verifiedAt: row.verified_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

async function loadOrderAccessRow(orderNumber) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const number = String(orderNumber || '')
    .trim()
    .toUpperCase();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, order_number, user_id, guest_email, guest_phone, customer_snapshot, status, total, currency
       FROM orders
       WHERE UPPER(order_number) = ? AND deleted_at IS NULL
       LIMIT 1`
    ),
    [number]
  );
  return result.rows?.[0] || null;
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

async function assertOrderPaymentAccess(orderRow, { phone, accessToken }) {
  if (!orderRow) {
    throw new HttpError(404, 'Order not found', { code: 'NOT_FOUND' });
  }

  if (accessToken) {
    try {
      const user = await getUserFromAccessToken(accessToken);
      if (user?.id && orderRow.user_id === user.id) return user;
      if (
        user?.email &&
        orderRow.guest_email &&
        user.email.toLowerCase() === String(orderRow.guest_email).toLowerCase()
      ) {
        return user;
      }
      if (user?.phone && phonesMatch(user.phone, orderRow.guest_phone)) return user;
    } catch {
      // fall through to phone verification
    }
  }

  const phoneInput = String(phone || '').trim();
  if (!phoneInput) {
    throw new HttpError(401, 'Authentication or matching phone is required', {
      code: 'UNAUTHENTICATED',
    });
  }

  const snapshot = parseMaybe(orderRow.customer_snapshot) || {};
  const candidates = [orderRow.guest_phone, snapshot.phone, snapshot.whatsapp].filter(Boolean);
  const matched = candidates.some((candidate) => phonesMatch(candidate, phoneInput));
  if (!matched) {
    throw new HttpError(403, 'Phone number does not match this order.', {
      code: 'PHONE_MISMATCH',
    });
  }
  return null;
}

export async function getPaymentByOrderNumber(orderNumber, { phone, accessToken } = {}) {
  const orderRow = await loadOrderAccessRow(orderNumber);
  await assertOrderPaymentAccess(orderRow, { phone, accessToken });

  const db = await getDatabase();
  const driver = getDbDriver();
  const payment = await db.query(
    toDriverSql(
      driver,
      `SELECT id, order_id, method, provider, status, amount, currency, reference,
              evidence_url, customer_note, verified_at, created_at, updated_at
       FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`
    ),
    [orderRow.id]
  );

  const order = await getOrderPublicSummary(orderRow.id);
  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      currency: order.currency,
    },
    payment: mapPaymentRow(payment.rows?.[0]),
  };
}

/**
 * Customer submits / updates manual Mobile Money payment details.
 * Admin approval remains Phase 18.
 */
export async function submitManualPayment({
  orderNumber,
  phone,
  accessToken,
  method,
  reference,
  customerNote,
  evidenceUrl,
}) {
  // Hard reject secrets that must never be stored
  const forbiddenKeys = ['pin', 'otp', 'password', 'passcode', 'momoPin', 'secret'];
  for (const key of forbiddenKeys) {
    if (arguments[0]?.[key]) {
      throw new HttpError(400, 'Never submit PINs, OTPs, or passwords.', {
        code: 'FORBIDDEN_FIELD',
      });
    }
  }

  const orderRow = await loadOrderAccessRow(orderNumber);
  await assertOrderPaymentAccess(orderRow, { phone, accessToken });

  if (['cancelled', 'refunded'].includes(orderRow.status)) {
    throw new HttpError(409, 'This order can no longer accept payment updates.', {
      code: 'ORDER_CLOSED',
    });
  }

  const db = await getDatabase();
  const driver = getDbDriver();
  const paymentResult = await db.query(
    toDriverSql(
      driver,
      `SELECT id, method, status, amount, currency, reference, evidence_url, customer_note
       FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`
    ),
    [orderRow.id]
  );
  const payment = paymentResult.rows?.[0];
  if (!payment) {
    throw new HttpError(404, 'Payment record not found for this order', { code: 'NOT_FOUND' });
  }

  if (payment.status === 'paid') {
    throw new HttpError(409, 'This payment is already confirmed.', { code: 'ALREADY_PAID' });
  }

  if (!SUBMITTABLE_STATUSES.has(payment.status) && payment.method === 'cod') {
    throw new HttpError(400, 'Cash on Delivery does not require online payment submission.', {
      code: 'COD_NO_SUBMIT',
    });
  }

  const nextMethod = method || payment.method;
  if (!MANUAL_METHODS.has(nextMethod)) {
    throw new HttpError(400, 'Only MTN MoMo or Orange Money can be submitted here.', {
      code: 'INVALID_METHOD',
    });
  }

  if (payment.method === 'cod' && MANUAL_METHODS.has(nextMethod)) {
    // Allow converting COD → MoMo if customer chooses to pay early
  } else if (payment.method !== nextMethod && !MANUAL_METHODS.has(payment.method)) {
    throw new HttpError(400, 'Payment method cannot be changed for this order.', {
      code: 'METHOD_LOCKED',
    });
  }

  const ref = String(reference || '').trim();
  if (!ref) {
    throw new HttpError(400, 'Payment reference is required', { code: 'VALIDATION_ERROR' });
  }
  if (ref.length > 120) {
    throw new HttpError(400, 'Payment reference is too long', { code: 'VALIDATION_ERROR' });
  }

  const note = String(customerNote || '')
    .trim()
    .slice(0, 500);
  let evidence = String(evidenceUrl || '').trim();
  if (evidence) {
    if (evidence.length > 500) {
      throw new HttpError(400, 'Evidence URL is too long', { code: 'VALIDATION_ERROR' });
    }
    // Allow http(s) URLs only — no data: or javascript:
    if (!/^https?:\/\//i.test(evidence)) {
      throw new HttpError(400, 'Evidence must be an http(s) URL', { code: 'VALIDATION_ERROR' });
    }
  } else {
    evidence = null;
  }

  const evidenceEnabled = process.env.PAYMENT_EVIDENCE_ENABLED !== 'false';
  if (!evidenceEnabled) evidence = payment.evidence_url || null;

  await db.query(
    toDriverSql(
      driver,
      `UPDATE payments
       SET method = ?, provider = ?, status = 'pending_verification',
           reference = ?, evidence_url = ?, customer_note = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ),
    [nextMethod, nextMethod, ref, evidence, note || null, payment.id]
  );

  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO payment_attempts (id, payment_id, status, provider_response)
       VALUES (?, ?, 'submitted', ?)`
    ),
    [
      uuid(),
      payment.id,
      encodeJson(driver, {
        channel: 'manual',
        method: nextMethod,
        reference: ref,
        hasEvidence: Boolean(evidence),
        submittedAt: new Date().toISOString(),
      }),
    ]
  );

  if (orderRow.status === 'confirmed' && nextMethod !== 'cod') {
    await db.query(
      toDriverSql(driver, `UPDATE orders SET status = 'awaiting_payment' WHERE id = ?`),
      [orderRow.id]
    );
    await db.query(
      toDriverSql(
        driver,
        `INSERT INTO order_status_history (id, order_id, from_status, to_status, note)
         VALUES (?, ?, ?, 'awaiting_payment', 'Customer submitted Mobile Money payment details')`
      ),
      [uuid(), orderRow.id, orderRow.status]
    );
  }

  await safeNotify(() =>
    notifyBusinessEvent('payment.submitted', {
      userId: orderRow.user_id || null,
      orderId: orderRow.id,
      orderNumber: orderRow.order_number,
      reference: ref,
      email: orderRow.guest_email || null,
      guestEmail: orderRow.guest_email || null,
    })
  );

  return getPaymentByOrderNumber(orderRow.order_number, { phone, accessToken });
}

/** @deprecated stub kept for callers — use submitManualPayment */
export async function initiatePayment(input) {
  return submitManualPayment(input);
}
