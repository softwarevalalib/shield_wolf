import crypto from 'node:crypto';
import { getDatabase, getDbDriver } from '../../database/connection.js';
import { isPostgres, jsonValue, nowExpression, toDriverSql } from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';
import { getOrderPublicSummary } from './checkoutService.js';
import { buildDocumentSnapshot } from './documentService.js';
import { postPaymentLedger, postRefundLedger } from './ledgerService.js';
import { notifyBusinessEvent, safeNotify } from './notificationService.js';

function uuid() {
  return crypto.randomUUID();
}

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) * 100) / 100;
}

function encodeJson(driver, value) {
  // Always stringify — pg treats JS arrays as PG arrays, not JSONB.
  return jsonValue(driver, value);
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

async function writeAudit(
  db,
  driver,
  { actorId, action, resourceType, resourceId, oldValue, newValue }
) {
  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO audit_logs (id, actor_id, action, resource_type, resource_id, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ),
    [
      uuid(),
      actorId || null,
      action,
      resourceType,
      resourceId,
      encodeJson(driver, oldValue),
      encodeJson(driver, newValue),
    ]
  );
}

async function nextDocumentNumber(db, driver, table, column, prefix) {
  const year = new Date().getFullYear();
  const like = `${prefix}-${year}-%`;
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT ${column} AS number FROM ${table}
       WHERE ${column} LIKE ?
       ORDER BY ${column} DESC
       LIMIT 1`
    ),
    [like]
  );
  const latest = result.rows?.[0]?.number;
  let seq = 1;
  if (latest) {
    const parts = String(latest).split('-');
    const n = Number(parts[parts.length - 1]);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}-${year}-${String(seq).padStart(6, '0')}`;
}

function mapPayment(row) {
  const customer = parseMaybe(row.customer_snapshot) || {};
  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    orderStatus: row.order_status,
    method: row.method,
    provider: row.provider,
    status: row.status,
    amount: money(row.amount),
    currency: row.currency || 'LRD',
    reference: row.reference,
    evidenceUrl: row.evidence_url,
    customerNote: row.customer_note,
    adminNote: row.admin_note,
    verifiedBy: row.verified_by,
    verifiedByEmail: row.verified_by_email || null,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName:
      [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
      customer.name ||
      row.guest_email ||
      'Guest',
    phone: row.guest_phone || customer.phone || null,
    email: row.guest_email || customer.email || null,
  };
}

/**
 * Admin payment queue / list.
 */
export async function listAdminPayments(filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const where = ['1=1'];
  const params = [];

  if (filters.status && filters.status !== 'all') {
    where.push('p.status = ?');
    params.push(filters.status);
  }

  if (filters.method && filters.method !== 'all') {
    where.push('p.method = ?');
    params.push(filters.method);
  }

  if (filters.q) {
    const term = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push(
      `(LOWER(o.order_number) LIKE ? OR LOWER(COALESCE(p.reference, '')) LIKE ? OR LOWER(COALESCE(o.guest_phone, '')) LIKE ? OR LOWER(COALESCE(o.guest_email, '')) LIKE ?)`
    );
    params.push(term, term, term, term);
  }

  const whereSql = where.join(' AND ');

  const countResult = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS count
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       WHERE ${whereSql}`
    ),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const list = await db.query(
    toDriverSql(
      driver,
      `SELECT p.*, o.order_number, o.status AS order_status, o.guest_email, o.guest_phone,
              o.customer_snapshot, u.email AS verified_by_email
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       LEFT JOIN users u ON u.id = p.verified_by
       WHERE ${whereSql}
       ORDER BY
         CASE p.status
           WHEN 'pending_verification' THEN 0
           WHEN 'pending' THEN 1
           WHEN 'rejected' THEN 2
           ELSE 3
         END,
         p.updated_at DESC
       LIMIT ? OFFSET ?`
    ),
    [...params, pageSize, offset]
  );

  const counts = await db.query(
    toDriverSql(driver, `SELECT status, COUNT(*) AS count FROM payments GROUP BY status`)
  );
  const statusCounts = {};
  for (const row of counts.rows || []) {
    statusCounts[row.status] = Number(row.count || 0);
  }

  return {
    payments: (list.rows || []).map(mapPayment),
    statusCounts,
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getAdminPayment(id) {
  const db = await getDatabase();
  const driver = getDbDriver();

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT p.*, o.order_number, o.status AS order_status, o.guest_email, o.guest_phone,
              o.customer_snapshot, u.email AS verified_by_email
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       LEFT JOIN users u ON u.id = p.verified_by
       WHERE p.id = ?
       LIMIT 1`
    ),
    [id]
  );
  const row = result.rows?.[0];
  if (!row) {
    throw new HttpError(404, 'Payment not found', { code: 'NOT_FOUND' });
  }

  const attempts = await db.query(
    toDriverSql(
      driver,
      `SELECT id, status, provider_response, created_at
       FROM payment_attempts
       WHERE payment_id = ?
       ORDER BY created_at DESC`
    ),
    [id]
  );

  const order = await getOrderPublicSummary(row.order_id);

  const docs = await db.query(
    toDriverSql(
      driver,
      `SELECT
         (SELECT id FROM invoices WHERE order_id = ? ORDER BY created_at DESC LIMIT 1) AS invoice_id,
         (SELECT invoice_number FROM invoices WHERE order_id = ? ORDER BY created_at DESC LIMIT 1) AS invoice_number,
         (SELECT id FROM receipts WHERE payment_id = ? ORDER BY created_at DESC LIMIT 1) AS receipt_id,
         (SELECT receipt_number FROM receipts WHERE payment_id = ? ORDER BY created_at DESC LIMIT 1) AS receipt_number`
    ),
    [row.order_id, row.order_id, id, id]
  );

  return {
    payment: mapPayment(row),
    order,
    invoiceId: docs.rows?.[0]?.invoice_id || null,
    invoiceNumber: docs.rows?.[0]?.invoice_number || null,
    receiptId: docs.rows?.[0]?.receipt_id || null,
    receiptNumber: docs.rows?.[0]?.receipt_number || null,
    attempts: (attempts.rows || []).map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      response: parseMaybe(attempt.provider_response),
      createdAt: attempt.created_at,
    })),
  };
}

async function ensureInvoiceAndReceipt(db, driver, { order, payment, actorId }) {
  const existingInvoice = await db.query(
    toDriverSql(
      driver,
      `SELECT id, invoice_number FROM invoices WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`
    ),
    [order.id]
  );

  let invoiceId = existingInvoice.rows?.[0]?.id || null;
  let invoiceNumber = existingInvoice.rows?.[0]?.invoice_number || null;

  const snapshot = buildDocumentSnapshot(order, {
    paymentMethod: payment.method,
    paymentReference: payment.reference,
    paymentStatus: 'paid',
    generatedAt: new Date().toISOString(),
    generatedBy: actorId,
  });

  if (!invoiceId) {
    invoiceNumber = await nextDocumentNumber(db, driver, 'invoices', 'invoice_number', 'INV');
    invoiceId = uuid();
    await db.query(
      toDriverSql(
        driver,
        `INSERT INTO invoices (
           id, invoice_number, order_id, user_id, status, amount_due, amount_paid, currency, issued_at, snapshot
         ) VALUES (?, ?, ?, ?, 'issued', ?, ?, ?, ${nowExpression(driver)}, ?)`
      ),
      [
        invoiceId,
        invoiceNumber,
        order.id,
        order.userId || null,
        order.total,
        payment.amount,
        order.currency,
        encodeJson(driver, snapshot),
      ]
    );
  } else {
    await db.query(
      toDriverSql(
        driver,
        `UPDATE invoices SET amount_paid = ?, updated_at = ${nowExpression(driver)} WHERE id = ?`
      ),
      [payment.amount, invoiceId]
    );
  }

  const existingReceipt = await db.query(
    toDriverSql(driver, `SELECT id, receipt_number FROM receipts WHERE payment_id = ? LIMIT 1`),
    [payment.id]
  );

  let receiptNumber = existingReceipt.rows?.[0]?.receipt_number || null;
  if (!existingReceipt.rows?.length) {
    receiptNumber = await nextDocumentNumber(db, driver, 'receipts', 'receipt_number', 'RCP');
    await db.query(
      toDriverSql(
        driver,
        `INSERT INTO receipts (
           id, receipt_number, order_id, payment_id, invoice_id, amount_paid, currency, paid_at, snapshot
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ${nowExpression(driver)}, ?)`
      ),
      [
        uuid(),
        receiptNumber,
        order.id,
        payment.id,
        invoiceId,
        payment.amount,
        payment.currency,
        encodeJson(driver, {
          ...snapshot,
          paymentReference: payment.reference,
          paymentMethod: payment.method,
          paymentStatus: 'paid',
        }),
      ]
    );
  }

  return { invoiceId, invoiceNumber, receiptNumber };
}

/**
 * Approve, reject, or request clarification on a payment.
 */
export async function reviewAdminPayment(id, { action, adminNote = null, actorId = null }) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const detail = await getAdminPayment(id);
  const payment = detail.payment;

  if (payment.status === 'paid' && action === 'approve') {
    return detail;
  }

  if (
    ['paid', 'refunded', 'cancelled'].includes(payment.status) &&
    !(action === 'approve' || (action === 'refund' && payment.status === 'paid'))
  ) {
    throw new HttpError(409, `Payment is already ${payment.status}`, { code: 'PAYMENT_LOCKED' });
  }

  if (action === 'approve') {
    if (!['pending_verification', 'pending', 'rejected'].includes(payment.status)) {
      throw new HttpError(409, `Cannot approve payment in status ${payment.status}`, {
        code: 'INVALID_STATUS',
      });
    }

    await db.query(
      toDriverSql(
        driver,
        `UPDATE payments
         SET status = 'paid', admin_note = ?, verified_by = ?, verified_at = ${nowExpression(driver)},
             updated_at = ${nowExpression(driver)}
         WHERE id = ?`
      ),
      [adminNote || payment.adminNote || null, actorId, id]
    );

    await db.query(
      toDriverSql(
        driver,
        `INSERT INTO payment_attempts (id, payment_id, status, provider_response)
         VALUES (?, ?, 'approved', ?)`
      ),
      [
        uuid(),
        id,
        encodeJson(driver, {
          action: 'approve',
          adminNote: adminNote || null,
          actorId,
          at: new Date().toISOString(),
        }),
      ]
    );

    // Move order to paid when appropriate
    if (['awaiting_payment', 'confirmed', 'pending'].includes(detail.order.status)) {
      await db.query(
        toDriverSql(
          driver,
          `UPDATE orders SET status = 'paid', updated_at = ${nowExpression(driver)} WHERE id = ?`
        ),
        [detail.order.id]
      );
      await db.query(
        toDriverSql(
          driver,
          `INSERT INTO order_status_history (id, order_id, from_status, to_status, note, changed_by)
           VALUES (?, ?, ?, 'paid', ?, ?)`
        ),
        [
          uuid(),
          detail.order.id,
          detail.order.status,
          adminNote || 'Payment verified by admin',
          actorId,
        ]
      );
    }

    const orderFresh = await getOrderPublicSummary(detail.order.id);
    const docs = await ensureInvoiceAndReceipt(db, driver, {
      order: { ...orderFresh, userId: null },
      payment: { ...payment, amount: payment.amount, id },
      actorId,
    });

    // Attach user_id on invoice if available
    const orderRow = await db.query(
      toDriverSql(driver, `SELECT user_id FROM orders WHERE id = ? LIMIT 1`),
      [detail.order.id]
    );
    if (orderRow.rows?.[0]?.user_id && docs.invoiceId) {
      await db.query(
        toDriverSql(driver, `UPDATE invoices SET user_id = ? WHERE id = ? AND user_id IS NULL`),
        [orderRow.rows[0].user_id, docs.invoiceId]
      );
    }

    await writeAudit(db, driver, {
      actorId,
      action: 'payment.approve',
      resourceType: 'payment',
      resourceId: id,
      oldValue: { status: payment.status },
      newValue: {
        status: 'paid',
        reference: payment.reference,
        amount: payment.amount,
        invoiceNumber: docs.invoiceNumber,
        receiptNumber: docs.receiptNumber,
      },
    });

    const userId = orderRow.rows?.[0]?.user_id || null;
    await postPaymentLedger(
      {
        order: { ...orderFresh, userId, deliveryFee: orderFresh.deliveryFee },
        payment: { ...payment, amount: payment.amount, id },
        actorId,
      },
      { db, driver }
    );

    await safeNotify(() =>
      notifyBusinessEvent('payment.approved', {
        userId,
        orderId: detail.order.id,
        orderNumber: detail.order.orderNumber || orderFresh.orderNumber,
        email: orderFresh.email || null,
        guestEmail: orderFresh.email || null,
      })
    );

    return getAdminPayment(id);
  }

  if (action === 'refund') {
    if (payment.status !== 'paid') {
      throw new HttpError(409, 'Only paid payments can be refunded', { code: 'INVALID_STATUS' });
    }

    await db.query(
      toDriverSql(
        driver,
        `UPDATE payments
         SET status = 'refunded', admin_note = ?, updated_at = ${nowExpression(driver)}
         WHERE id = ?`
      ),
      [adminNote || payment.adminNote || null, id]
    );

    await db.query(
      toDriverSql(
        driver,
        `INSERT INTO payment_attempts (id, payment_id, status, provider_response)
         VALUES (?, ?, 'refunded', ?)`
      ),
      [
        uuid(),
        id,
        encodeJson(driver, {
          action: 'refund',
          adminNote: adminNote || null,
          actorId,
          at: new Date().toISOString(),
        }),
      ]
    );

    await postRefundLedger(
      {
        order: detail.order,
        payment: { ...payment, id, orderId: detail.order.id },
        actorId,
      },
      { db, driver }
    );

    await writeAudit(db, driver, {
      actorId,
      action: 'payment.refund',
      resourceType: 'payment',
      resourceId: id,
      oldValue: { status: payment.status },
      newValue: { status: 'refunded', amount: payment.amount },
    });

    return getAdminPayment(id);
  }

  if (action === 'reject') {
    if (!['pending_verification', 'pending'].includes(payment.status)) {
      throw new HttpError(409, `Cannot reject payment in status ${payment.status}`, {
        code: 'INVALID_STATUS',
      });
    }
    if (!adminNote?.trim()) {
      throw new HttpError(400, 'A note is required when rejecting a payment', {
        code: 'VALIDATION_ERROR',
      });
    }

    await db.query(
      toDriverSql(
        driver,
        `UPDATE payments
         SET status = 'rejected', admin_note = ?, updated_at = ${nowExpression(driver)}
         WHERE id = ?`
      ),
      [adminNote.trim(), id]
    );

    await db.query(
      toDriverSql(
        driver,
        `INSERT INTO payment_attempts (id, payment_id, status, provider_response)
         VALUES (?, ?, 'rejected', ?)`
      ),
      [
        uuid(),
        id,
        encodeJson(driver, {
          action: 'reject',
          adminNote: adminNote.trim(),
          actorId,
          at: new Date().toISOString(),
        }),
      ]
    );

    await writeAudit(db, driver, {
      actorId,
      action: 'payment.reject',
      resourceType: 'payment',
      resourceId: id,
      oldValue: { status: payment.status },
      newValue: { status: 'rejected', adminNote: adminNote.trim() },
    });

    const rejectOrder = await db.query(
      toDriverSql(driver, `SELECT user_id, guest_email FROM orders WHERE id = ? LIMIT 1`),
      [detail.order.id]
    );
    await safeNotify(() =>
      notifyBusinessEvent('payment.rejected', {
        userId: rejectOrder.rows?.[0]?.user_id || null,
        orderId: detail.order.id,
        orderNumber: detail.order.orderNumber,
        email: rejectOrder.rows?.[0]?.guest_email || null,
        guestEmail: rejectOrder.rows?.[0]?.guest_email || null,
      })
    );

    return getAdminPayment(id);
  }

  if (action === 'clarify') {
    if (payment.status !== 'pending_verification') {
      throw new HttpError(409, 'Clarification can only be requested for pending verification', {
        code: 'INVALID_STATUS',
      });
    }
    if (!adminNote?.trim()) {
      throw new HttpError(400, 'Explain what clarification is needed', {
        code: 'VALIDATION_ERROR',
      });
    }

    await db.query(
      toDriverSql(
        driver,
        `UPDATE payments
         SET admin_note = ?, updated_at = ${nowExpression(driver)}
         WHERE id = ?`
      ),
      [adminNote.trim(), id]
    );

    await db.query(
      toDriverSql(
        driver,
        `INSERT INTO payment_attempts (id, payment_id, status, provider_response)
         VALUES (?, ?, 'clarification_requested', ?)`
      ),
      [
        uuid(),
        id,
        encodeJson(driver, {
          action: 'clarify',
          adminNote: adminNote.trim(),
          actorId,
          at: new Date().toISOString(),
        }),
      ]
    );

    await writeAudit(db, driver, {
      actorId,
      action: 'payment.clarify',
      resourceType: 'payment',
      resourceId: id,
      oldValue: { status: payment.status },
      newValue: { status: payment.status, adminNote: adminNote.trim() },
    });

    return getAdminPayment(id);
  }

  throw new HttpError(400, 'Unknown action', { code: 'VALIDATION_ERROR' });
}
