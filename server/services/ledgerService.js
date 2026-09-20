import crypto from 'node:crypto';
import { getDatabase, getDbDriver } from '../../database/connection.js';
import { nowExpression, toDriverSql } from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';

function uuid() {
  return crypto.randomUUID();
}

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) * 100) / 100;
}

export const TRANSACTION_TYPES = [
  'sale',
  'payment',
  'refund',
  'expense',
  'delivery_income',
  'adjustment',
];

async function nextTransactionNumber(db, driver) {
  const year = new Date().getFullYear();
  const like = `TX-${year}-%`;
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT transaction_number FROM transactions
       WHERE transaction_number LIKE ?
       ORDER BY transaction_number DESC LIMIT 1`
    ),
    [like]
  );
  const latest = result.rows?.[0]?.transaction_number;
  let seq = 1;
  if (latest) {
    const n = Number(String(latest).split('-').pop());
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `TX-${year}-${String(seq).padStart(6, '0')}`;
}

function mapTransaction(row) {
  return {
    id: row.id,
    transactionNumber: row.transaction_number,
    occurredAt: row.occurred_at,
    orderId: row.order_id,
    orderNumber: row.order_number || null,
    userId: row.user_id,
    paymentMethod: row.payment_method,
    amount: money(row.amount),
    currency: row.currency || 'LRD',
    type: row.type,
    status: row.status,
    reference: row.reference,
    createdBy: row.created_by,
    createdByEmail: row.created_by_email || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Insert a ledger row. Skips when reference already exists for the same type (idempotent).
 */
export async function recordTransaction(
  {
    type,
    amount,
    currency = 'LRD',
    orderId = null,
    userId = null,
    paymentMethod = null,
    reference = null,
    status = 'posted',
    occurredAt = null,
    createdBy = null,
  },
  { db: externalDb = null, driver: externalDriver = null } = {}
) {
  if (!TRANSACTION_TYPES.includes(type)) {
    throw new HttpError(400, `Invalid transaction type: ${type}`, { code: 'VALIDATION_ERROR' });
  }

  const db = externalDb || (await getDatabase());
  const driver = externalDriver || getDbDriver();

  if (reference) {
    const existing = await db.query(
      toDriverSql(driver, `SELECT id FROM transactions WHERE reference = ? AND type = ? LIMIT 1`),
      [reference, type]
    );
    if (existing.rows?.length) {
      return { id: existing.rows[0].id, skipped: true };
    }
  }

  const id = uuid();
  const number = await nextTransactionNumber(db, driver);
  const when = occurredAt || new Date().toISOString();

  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO transactions (
         id, transaction_number, occurred_at, order_id, user_id, payment_method,
         amount, currency, type, status, reference, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    [
      id,
      number,
      when,
      orderId,
      userId,
      paymentMethod,
      money(amount),
      currency || 'LRD',
      type,
      status,
      reference,
      createdBy,
    ]
  );

  return { id, transactionNumber: number, skipped: false };
}

export async function listTransactions(filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const where = ['1=1'];
  const params = [];

  if (filters.type && filters.type !== 'all') {
    where.push('t.type = ?');
    params.push(filters.type);
  }
  if (filters.status && filters.status !== 'all') {
    where.push('t.status = ?');
    params.push(filters.status);
  }
  if (filters.q) {
    const term = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push(
      `(LOWER(t.transaction_number) LIKE ? OR LOWER(COALESCE(t.reference,'')) LIKE ? OR LOWER(COALESCE(o.order_number,'')) LIKE ?)`
    );
    params.push(term, term, term);
  }
  if (filters.from) {
    where.push('t.occurred_at >= ?');
    params.push(new Date(filters.from).toISOString());
  }
  if (filters.to) {
    const end = new Date(filters.to);
    end.setHours(23, 59, 59, 999);
    where.push('t.occurred_at <= ?');
    params.push(end.toISOString());
  }

  const whereSql = where.join(' AND ');
  const countResult = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS count
       FROM transactions t
       LEFT JOIN orders o ON o.id = t.order_id
       WHERE ${whereSql}`
    ),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const list = await db.query(
    toDriverSql(
      driver,
      `SELECT t.*, o.order_number, u.email AS created_by_email
       FROM transactions t
       LEFT JOIN orders o ON o.id = t.order_id
       LEFT JOIN users u ON u.id = t.created_by
       WHERE ${whereSql}
       ORDER BY t.occurred_at DESC, t.created_at DESC
       LIMIT ? OFFSET ?`
    ),
    [...params, pageSize, offset]
  );

  return {
    transactions: (list.rows || []).map(mapTransaction),
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getTransaction(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT t.*, o.order_number, u.email AS created_by_email
       FROM transactions t
       LEFT JOIN orders o ON o.id = t.order_id
       LEFT JOIN users u ON u.id = t.created_by
       WHERE t.id = ? OR t.transaction_number = ?
       LIMIT 1`
    ),
    [id, id]
  );
  const row = result.rows?.[0];
  if (!row) throw new HttpError(404, 'Transaction not found', { code: 'NOT_FOUND' });
  return { transaction: mapTransaction(row) };
}

export async function voidTransaction(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const current = await getTransaction(id);
  if (current.transaction.status === 'void') return current;

  await db.query(
    toDriverSql(
      driver,
      `UPDATE transactions SET status = 'void', updated_at = ${nowExpression(driver)} WHERE id = ?`
    ),
    [current.transaction.id]
  );
  return getTransaction(current.transaction.id);
}

/**
 * Post payment + sale (+ delivery income) ledger rows after payment approval.
 */
export async function postPaymentLedger(
  { order, payment, actorId },
  { db = null, driver = null } = {}
) {
  const opts = { db, driver };
  const currency = payment.currency || order.currency || 'LRD';
  const paymentRef = `payment:${payment.id}`;

  await recordTransaction(
    {
      type: 'payment',
      amount: payment.amount,
      currency,
      orderId: order.id,
      userId: order.userId || null,
      paymentMethod: payment.method,
      reference: paymentRef,
      occurredAt: new Date().toISOString(),
      createdBy: actorId,
    },
    opts
  );

  await recordTransaction(
    {
      type: 'sale',
      amount: order.total,
      currency,
      orderId: order.id,
      userId: order.userId || null,
      paymentMethod: payment.method,
      reference: `sale:${payment.id}`,
      occurredAt: new Date().toISOString(),
      createdBy: actorId,
    },
    opts
  );

  if (Number(order.deliveryFee) > 0) {
    await recordTransaction(
      {
        type: 'delivery_income',
        amount: order.deliveryFee,
        currency,
        orderId: order.id,
        paymentMethod: payment.method,
        reference: `delivery:${payment.id}`,
        occurredAt: new Date().toISOString(),
        createdBy: actorId,
      },
      opts
    );
  }
}

export async function postRefundLedger(
  { order, payment, actorId, amount = null },
  { db = null, driver = null } = {}
) {
  return recordTransaction(
    {
      type: 'refund',
      amount: amount != null ? amount : payment.amount,
      currency: payment.currency || order?.currency || 'LRD',
      orderId: order?.id || payment.orderId || null,
      paymentMethod: payment.method,
      reference: `refund:${payment.id}`,
      occurredAt: new Date().toISOString(),
      createdBy: actorId,
    },
    { db, driver }
  );
}
