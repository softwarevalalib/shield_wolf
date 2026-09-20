import { getDatabase, getDbDriver } from '../../database/connection.js';
import { nowExpression, toDriverSql } from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';
import { getOrderPublicSummary } from './checkoutService.js';
import { getSettingByKey } from './storefrontService.js';

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

export async function getBusinessProfile() {
  const setting = await getSettingByKey('business_settings', 'general');
  const business = setting?.value || {};
  return {
    name: business.business_name || 'Shield Wolf',
    phones: Array.isArray(business.phones) ? business.phones : [],
    emails: Array.isArray(business.emails) ? business.emails : [],
    whatsapp: business.whatsapp || null,
    address: business.address || null,
    currency: business.currency || 'LRD',
  };
}

/**
 * Canonical snapshot stored on invoices/receipts at generation time.
 */
export function buildDocumentSnapshot(order, extras = {}) {
  const customer = order.customer || {};
  return {
    orderNumber: order.orderNumber,
    orderStatus: order.status,
    currency: order.currency,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    deliveryFee: order.deliveryFee,
    taxAmount: order.taxAmount,
    total: order.total,
    customer: {
      name:
        [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.name || null,
      firstName: customer.firstName || null,
      lastName: customer.lastName || null,
      phone: order.phone || customer.phone || null,
      email: order.email || customer.email || null,
    },
    delivery: order.delivery || null,
    items: (order.items || []).map((item) => ({
      name: item.name,
      size: item.size || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    paymentStatus: order.payment?.status || extras.paymentStatus || null,
    paymentMethod: extras.paymentMethod || order.payment?.method || null,
    paymentReference: extras.paymentReference || order.payment?.reference || null,
    generatedAt: extras.generatedAt || new Date().toISOString(),
    generatedBy: extras.generatedBy || null,
  };
}

function mapInvoiceRow(row) {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    orderId: row.order_id,
    orderNumber: row.order_number || null,
    orderStatus: row.order_status || null,
    userId: row.user_id,
    status: row.status,
    amountDue: money(row.amount_due),
    amountPaid: money(row.amount_paid),
    currency: row.currency || 'LRD',
    issuedAt: row.issued_at,
    pdfUrl: row.pdf_url,
    snapshot: parseMaybe(row.snapshot),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name || null,
  };
}

function mapReceiptRow(row) {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    orderId: row.order_id,
    orderNumber: row.order_number || null,
    orderStatus: row.order_status || null,
    paymentId: row.payment_id,
    invoiceId: row.invoice_id,
    invoiceNumber: row.invoice_number || null,
    amountPaid: money(row.amount_paid),
    currency: row.currency || 'LRD',
    paidAt: row.paid_at,
    pdfUrl: row.pdf_url,
    snapshot: parseMaybe(row.snapshot),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name || null,
    paymentMethod: row.payment_method || null,
    paymentReference: row.payment_reference || null,
  };
}

async function enrichDocument(document, { type }) {
  const business = await getBusinessProfile();
  let snapshot = { ...(document.snapshot || {}) };

  const needsHydrate =
    !snapshot.items?.length ||
    snapshot.subtotal == null ||
    snapshot.total == null ||
    !snapshot.customer;

  if (needsHydrate && document.orderId) {
    try {
      const order = await getOrderPublicSummary(document.orderId);
      const fresh = buildDocumentSnapshot(order, {
        paymentMethod: document.paymentMethod || snapshot.paymentMethod,
        paymentReference: document.paymentReference || snapshot.paymentReference,
        paymentStatus: order.payment?.status || snapshot.paymentStatus,
        generatedAt: snapshot.generatedAt,
        generatedBy: snapshot.generatedBy,
      });
      snapshot = {
        ...fresh,
        ...snapshot,
        items: snapshot.items?.length ? snapshot.items : fresh.items,
        customer: { ...fresh.customer, ...(snapshot.customer || {}) },
        delivery: snapshot.delivery || fresh.delivery,
        subtotal: snapshot.subtotal ?? fresh.subtotal,
        discountAmount: snapshot.discountAmount ?? fresh.discountAmount,
        deliveryFee: snapshot.deliveryFee ?? fresh.deliveryFee,
        taxAmount: snapshot.taxAmount ?? fresh.taxAmount,
        total: snapshot.total ?? fresh.total,
        orderNumber: snapshot.orderNumber || fresh.orderNumber,
        orderStatus: snapshot.orderStatus || fresh.orderStatus,
        currency: snapshot.currency || fresh.currency,
      };
    } catch {
      // keep stored snapshot
    }
  }

  return {
    ...document,
    type,
    business,
    snapshot,
  };
}

function customerNameSelect() {
  return `COALESCE(o.guest_phone, o.guest_email) AS customer_name`;
}

export async function listAdminInvoices(filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const where = ['1=1'];
  const params = [];
  if (filters.status && filters.status !== 'all') {
    where.push('i.status = ?');
    params.push(filters.status);
  }
  if (filters.q) {
    const term = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push(
      `(LOWER(i.invoice_number) LIKE ? OR LOWER(o.order_number) LIKE ? OR LOWER(COALESCE(o.guest_phone,'')) LIKE ?)`
    );
    params.push(term, term, term);
  }

  const whereSql = where.join(' AND ');
  const countResult = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS count
       FROM invoices i
       JOIN orders o ON o.id = i.order_id
       WHERE ${whereSql}`
    ),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const list = await db.query(
    toDriverSql(
      driver,
      `SELECT i.*, o.order_number, o.status AS order_status, ${customerNameSelect()}
       FROM invoices i
       JOIN orders o ON o.id = i.order_id
       WHERE ${whereSql}
       ORDER BY i.issued_at DESC, i.created_at DESC
       LIMIT ? OFFSET ?`
    ),
    [...params, pageSize, offset]
  );

  return {
    invoices: (list.rows || []).map(mapInvoiceRow),
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getAdminInvoice(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT i.*, o.order_number, o.status AS order_status, ${customerNameSelect()}
       FROM invoices i
       JOIN orders o ON o.id = i.order_id
       WHERE i.id = ? OR i.invoice_number = ?
       LIMIT 1`
    ),
    [id, id]
  );
  const row = result.rows?.[0];
  if (!row) throw new HttpError(404, 'Invoice not found', { code: 'NOT_FOUND' });

  const invoice = await enrichDocument(mapInvoiceRow(row), { type: 'invoice' });

  const receipts = await db.query(
    toDriverSql(
      driver,
      `SELECT id, receipt_number, amount_paid, currency, paid_at
       FROM receipts WHERE invoice_id = ? ORDER BY paid_at DESC`
    ),
    [invoice.id]
  );

  return {
    invoice,
    linkedReceipts: (receipts.rows || []).map((r) => ({
      id: r.id,
      receiptNumber: r.receipt_number,
      amountPaid: money(r.amount_paid),
      currency: r.currency,
      paidAt: r.paid_at,
    })),
  };
}

export async function voidAdminInvoice(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const current = await getAdminInvoice(id);
  if (current.invoice.status === 'void') return current;

  await db.query(
    toDriverSql(
      driver,
      `UPDATE invoices SET status = 'void', updated_at = ${nowExpression(driver)} WHERE id = ?`
    ),
    [current.invoice.id]
  );

  return getAdminInvoice(current.invoice.id);
}

export async function listAdminReceipts(filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const where = ['1=1'];
  const params = [];
  if (filters.q) {
    const term = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push(
      `(LOWER(r.receipt_number) LIKE ? OR LOWER(o.order_number) LIKE ? OR LOWER(COALESCE(i.invoice_number,'')) LIKE ?)`
    );
    params.push(term, term, term);
  }

  const whereSql = where.join(' AND ');
  const countResult = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS count
       FROM receipts r
       JOIN orders o ON o.id = r.order_id
       LEFT JOIN invoices i ON i.id = r.invoice_id
       WHERE ${whereSql}`
    ),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const list = await db.query(
    toDriverSql(
      driver,
      `SELECT r.*, o.order_number, o.status AS order_status,
              i.invoice_number, p.method AS payment_method, p.reference AS payment_reference,
              ${customerNameSelect()}
       FROM receipts r
       JOIN orders o ON o.id = r.order_id
       LEFT JOIN invoices i ON i.id = r.invoice_id
       LEFT JOIN payments p ON p.id = r.payment_id
       WHERE ${whereSql}
       ORDER BY r.paid_at DESC, r.created_at DESC
       LIMIT ? OFFSET ?`
    ),
    [...params, pageSize, offset]
  );

  return {
    receipts: (list.rows || []).map(mapReceiptRow),
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getAdminReceipt(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT r.*, o.order_number, o.status AS order_status,
              i.invoice_number, p.method AS payment_method, p.reference AS payment_reference,
              ${customerNameSelect()}
       FROM receipts r
       JOIN orders o ON o.id = r.order_id
       LEFT JOIN invoices i ON i.id = r.invoice_id
       LEFT JOIN payments p ON p.id = r.payment_id
       WHERE r.id = ? OR r.receipt_number = ?
       LIMIT 1`
    ),
    [id, id]
  );
  const row = result.rows?.[0];
  if (!row) throw new HttpError(404, 'Receipt not found', { code: 'NOT_FOUND' });
  return {
    receipt: await enrichDocument(mapReceiptRow(row), { type: 'receipt' }),
  };
}

export async function listCustomerInvoices(user, filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;
  const userId = user.id;

  const countResult = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS count
       FROM invoices i
       JOIN orders o ON o.id = i.order_id
       WHERE i.status != 'draft' AND (i.user_id = ? OR o.user_id = ?)`
    ),
    [userId, userId]
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const list = await db.query(
    toDriverSql(
      driver,
      `SELECT i.*, o.order_number, o.status AS order_status
       FROM invoices i
       JOIN orders o ON o.id = i.order_id
       WHERE i.status != 'draft' AND (i.user_id = ? OR o.user_id = ?)
       ORDER BY i.issued_at DESC, i.created_at DESC
       LIMIT ? OFFSET ?`
    ),
    [userId, userId, pageSize, offset]
  );

  return {
    invoices: (list.rows || []).map(mapInvoiceRow),
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getCustomerInvoice(user, id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT i.*, o.order_number, o.status AS order_status
       FROM invoices i
       JOIN orders o ON o.id = i.order_id
       WHERE (i.id = ? OR i.invoice_number = ?)
         AND i.status != 'draft'
         AND (i.user_id = ? OR o.user_id = ?)
       LIMIT 1`
    ),
    [id, id, user.id, user.id]
  );
  const row = result.rows?.[0];
  if (!row) throw new HttpError(404, 'Invoice not found', { code: 'NOT_FOUND' });
  return {
    invoice: await enrichDocument(mapInvoiceRow(row), { type: 'invoice' }),
  };
}

export async function listCustomerReceipts(user, filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;
  const userId = user.id;

  const countResult = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS count
       FROM receipts r
       JOIN orders o ON o.id = r.order_id
       LEFT JOIN invoices i ON i.id = r.invoice_id
       WHERE o.user_id = ? OR i.user_id = ?`
    ),
    [userId, userId]
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const list = await db.query(
    toDriverSql(
      driver,
      `SELECT r.*, o.order_number, o.status AS order_status,
              i.invoice_number, p.method AS payment_method, p.reference AS payment_reference
       FROM receipts r
       JOIN orders o ON o.id = r.order_id
       LEFT JOIN invoices i ON i.id = r.invoice_id
       LEFT JOIN payments p ON p.id = r.payment_id
       WHERE o.user_id = ? OR i.user_id = ?
       ORDER BY r.paid_at DESC, r.created_at DESC
       LIMIT ? OFFSET ?`
    ),
    [userId, userId, pageSize, offset]
  );

  return {
    receipts: (list.rows || []).map(mapReceiptRow),
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getCustomerReceipt(user, id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT r.*, o.order_number, o.status AS order_status,
              i.invoice_number, p.method AS payment_method, p.reference AS payment_reference
       FROM receipts r
       JOIN orders o ON o.id = r.order_id
       LEFT JOIN invoices i ON i.id = r.invoice_id
       LEFT JOIN payments p ON p.id = r.payment_id
       WHERE (r.id = ? OR r.receipt_number = ?)
         AND (o.user_id = ? OR i.user_id = ?)
       LIMIT 1`
    ),
    [id, id, user.id, user.id]
  );
  const row = result.rows?.[0];
  if (!row) throw new HttpError(404, 'Receipt not found', { code: 'NOT_FOUND' });
  return {
    receipt: await enrichDocument(mapReceiptRow(row), { type: 'receipt' }),
  };
}
