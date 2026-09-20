import crypto from 'node:crypto';
import { getDatabase, getDbDriver } from '../../database/connection.js';
import { isPostgres, jsonValue, toDriverSql } from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';
import { quoteCart } from './cartService.js';
import { getUserFromAccessToken } from './authService.js';
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

function wrapTx(db, tx, driver) {
  if (driver === 'postgres' && tx?.query) {
    return { query: (text, params = []) => tx.query(text, params) };
  }
  if (driver === 'sqlite' && tx?.prepare) {
    return {
      async query(text, params = []) {
        const trimmed = text.trim().toLowerCase();
        const statement = tx.prepare(text);
        if (trimmed.startsWith('select') || trimmed.startsWith('pragma')) {
          const rows = statement.all(...params);
          return { rows, rowCount: rows.length };
        }
        const info = statement.run(...params);
        return { rows: [], rowCount: info.changes, lastInsertRowid: info.lastInsertRowid };
      },
    };
  }
  return db;
}

export async function listActiveDeliveryZones() {
  const db = await getDatabase();
  const driver = getDbDriver();
  await ensureDefaultDeliveryZones(db, driver);

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, name, county, communities, delivery_fee, minimum_free_delivery_amount,
              estimated_time, active
       FROM delivery_zones
       WHERE active = ? AND deleted_at IS NULL
       ORDER BY name ASC`
    ),
    [driver === 'postgres' ? true : 1]
  );

  return (result.rows || []).map((row) => ({
    id: row.id,
    name: row.name,
    county: row.county,
    communities:
      typeof row.communities === 'string'
        ? JSON.parse(row.communities || '[]')
        : row.communities || [],
    deliveryFee: money(row.delivery_fee),
    minimumFreeDeliveryAmount:
      row.minimum_free_delivery_amount == null ? null : money(row.minimum_free_delivery_amount),
    estimatedTime: row.estimated_time,
  }));
}

async function ensureDefaultDeliveryZones(db, driver) {
  const count = await db.query(toDriverSql(driver, `SELECT COUNT(*) AS count FROM delivery_zones`));
  if (Number(count.rows?.[0]?.count || 0) > 0) return;

  const defaults = [
    {
      name: 'Gardnersville',
      county: 'Montserrado',
      communities: ['Gardnersville', 'Japanese Freeway'],
      fee: 150,
      freeAt: 2000,
      eta: 'Same day / next day',
    },
    {
      name: 'Paynesville',
      county: 'Montserrado',
      communities: ['Paynesville', 'Red Light'],
      fee: 200,
      freeAt: 2500,
      eta: '1–2 days',
    },
    {
      name: 'Central Monrovia',
      county: 'Montserrado',
      communities: ['Sinkor', 'Congo Town', 'Central Monrovia'],
      fee: 250,
      freeAt: 3000,
      eta: '1–2 days',
    },
  ];

  for (const zone of defaults) {
    await db.query(
      toDriverSql(
        driver,
        `INSERT INTO delivery_zones
          (id, name, county, communities, delivery_fee, minimum_free_delivery_amount, estimated_time, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        uuid(),
        zone.name,
        zone.county,
        encodeJson(driver, zone.communities),
        zone.fee,
        zone.freeAt,
        zone.eta,
        driver === 'postgres' ? true : 1,
      ]
    );
  }
}

export async function calculateDeliveryFee(zoneId, subtotal) {
  const zones = await listActiveDeliveryZones();
  const zone = zones.find((item) => item.id === zoneId);
  if (!zone) {
    throw new HttpError(400, 'Invalid delivery zone', { code: 'INVALID_DELIVERY_ZONE' });
  }

  let fee = zone.deliveryFee;
  if (
    zone.minimumFreeDeliveryAmount != null &&
    Number(subtotal) >= Number(zone.minimumFreeDeliveryAmount)
  ) {
    fee = 0;
  }

  return { zone, deliveryFee: money(fee) };
}

async function nextOrderNumber(client, driver) {
  const year = new Date().getFullYear();
  const prefix = `SW-${year}-`;
  const result = await client.query(
    toDriverSql(
      driver,
      `SELECT order_number FROM orders
       WHERE order_number LIKE ?
       ORDER BY order_number DESC
       LIMIT 1`
    ),
    [`${prefix}%`]
  );
  const latest = result.rows?.[0]?.order_number;
  let seq = 1;
  if (latest) {
    const part = latest.split('-').pop();
    const parsed = Number(part);
    if (Number.isFinite(parsed)) seq = parsed + 1;
  }
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

export async function createCheckoutOrder({
  items,
  customer,
  delivery,
  paymentMethod,
  idempotencyKey,
  accessToken,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'Cart is empty', { code: 'EMPTY_CART' });
  }

  const quote = await quoteCart(items);
  const availableLines = (quote.lines || []).filter(
    (line) => line.available && line.lineTotal != null
  );
  if (!availableLines.length) {
    throw new HttpError(400, 'No available items to checkout', { code: 'NO_AVAILABLE_ITEMS' });
  }

  const { zone, deliveryFee } = await calculateDeliveryFee(delivery.zoneId, quote.summary.subtotal);
  const discountAmount = money(quote.summary.discountAmount || 0);
  const taxAmount = money(quote.summary.taxAmount || 0);
  const subtotal = money(quote.summary.subtotal || 0);
  const total = money(subtotal - discountAmount + deliveryFee + taxAmount);

  let user = null;
  if (accessToken) {
    try {
      user = await getUserFromAccessToken(accessToken);
    } catch {
      user = null;
    }
  }

  const db = await getDatabase();
  const driver = getDbDriver();

  if (idempotencyKey) {
    const existing = await db.query(
      toDriverSql(driver, `SELECT id FROM orders WHERE idempotency_key = ? LIMIT 1`),
      [idempotencyKey]
    );
    if (existing.rows?.[0]) {
      return getOrderPublicSummary(existing.rows[0].id);
    }
  }

  const orderId = uuid();
  const paymentId = uuid();
  const customerSnapshot = {
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    whatsapp: customer.whatsapp || null,
    email: customer.email,
  };
  const deliverySnapshot = {
    zoneId: zone.id,
    zoneName: zone.name,
    county: delivery.county || zone.county,
    city: delivery.city,
    community: delivery.community,
    streetLandmark: delivery.streetLandmark,
    deliveryInstructions: delivery.deliveryInstructions || null,
    deliveryFee,
    estimatedTime: zone.estimatedTime,
  };

  const isCod = paymentMethod === 'cod';
  const orderStatus = isCod ? 'confirmed' : 'awaiting_payment';
  const paymentStatus = isCod ? 'pending' : 'pending_verification';

  await db.withTransaction(async (tx) => {
    const client = wrapTx(db, tx, driver);
    const orderNumber = await nextOrderNumber(client, driver);

    for (const line of availableLines) {
      if (line.variantId) {
        const variant = await client.query(
          toDriverSql(
            driver,
            `SELECT stock_quantity FROM product_variants WHERE id = ? AND product_id = ? LIMIT 1`
          ),
          [line.variantId, line.productId]
        );
        const stock = Number(variant.rows?.[0]?.stock_quantity ?? 0);
        if (stock < line.quantity) {
          throw new HttpError(409, `Insufficient stock for ${line.name}`, {
            code: 'INSUFFICIENT_STOCK',
          });
        }
        const before = stock;
        const after = stock - line.quantity;
        await client.query(
          toDriverSql(
            driver,
            `UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?`
          ),
          [line.quantity, line.variantId]
        );
        await client.query(
          toDriverSql(
            driver,
            `UPDATE products SET stock_quantity = CASE
               WHEN stock_quantity >= ? THEN stock_quantity - ? ELSE 0 END
             WHERE id = ?`
          ),
          [line.quantity, line.quantity, line.productId]
        );
        await client.query(
          toDriverSql(
            driver,
            `INSERT INTO inventory_movements
              (id, product_id, variant_id, movement_type, quantity_delta, quantity_before, quantity_after, reason, reference_type, reference_id)
             VALUES (?, ?, ?, 'sale', ?, ?, ?, 'Checkout sale', 'order', ?)`
          ),
          [uuid(), line.productId, line.variantId, -line.quantity, before, after, orderId]
        );
      } else {
        const product = await client.query(
          toDriverSql(driver, `SELECT stock_quantity FROM products WHERE id = ? LIMIT 1`),
          [line.productId]
        );
        const stock = Number(product.rows?.[0]?.stock_quantity ?? 0);
        if (stock < line.quantity) {
          throw new HttpError(409, `Insufficient stock for ${line.name}`, {
            code: 'INSUFFICIENT_STOCK',
          });
        }
        const before = stock;
        const after = stock - line.quantity;
        await client.query(
          toDriverSql(
            driver,
            `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`
          ),
          [line.quantity, line.productId]
        );
        await client.query(
          toDriverSql(
            driver,
            `INSERT INTO inventory_movements
              (id, product_id, variant_id, movement_type, quantity_delta, quantity_before, quantity_after, reason, reference_type, reference_id)
             VALUES (?, ?, NULL, 'sale', ?, ?, ?, 'Checkout sale', 'order', ?)`
          ),
          [uuid(), line.productId, -line.quantity, before, after, orderId]
        );
      }
    }

    await client.query(
      toDriverSql(
        driver,
        `INSERT INTO orders (
          id, order_number, user_id, customer_profile_id, guest_email, guest_phone,
          status, currency, subtotal, discount_amount, delivery_fee, tax_amount, total,
          delivery_snapshot, customer_snapshot, notes, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        orderId,
        orderNumber,
        user?.id || null,
        user?.customerProfile?.id || null,
        customer.email,
        customer.phone,
        orderStatus,
        quote.currency || 'LRD',
        subtotal,
        discountAmount,
        deliveryFee,
        taxAmount,
        total,
        encodeJson(driver, deliverySnapshot),
        encodeJson(driver, customerSnapshot),
        delivery.deliveryInstructions || null,
        idempotencyKey || null,
      ]
    );

    for (const line of availableLines) {
      const snapshot = {
        name: line.name,
        slug: line.slug,
        size: line.size,
        imageUrl: line.imageUrl,
        unitPrice: line.unitPrice,
        currency: line.currency,
        variantId: line.variantId,
      };
      await client.query(
        toDriverSql(
          driver,
          `INSERT INTO order_items
            (id, order_id, product_id, variant_id, product_snapshot, quantity, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ),
        [
          uuid(),
          orderId,
          line.productId,
          line.variantId,
          encodeJson(driver, snapshot),
          line.quantity,
          line.unitPrice,
          line.lineTotal,
        ]
      );
    }

    await client.query(
      toDriverSql(
        driver,
        `INSERT INTO order_status_history (id, order_id, from_status, to_status, note)
         VALUES (?, ?, NULL, ?, 'Order placed at checkout')`
      ),
      [uuid(), orderId, orderStatus]
    );

    await client.query(
      toDriverSql(
        driver,
        `INSERT INTO payments
          (id, order_id, method, provider, status, amount, currency, reference, customer_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ),
      [
        paymentId,
        orderId,
        paymentMethod,
        paymentMethod === 'cod' ? 'cash' : paymentMethod,
        paymentStatus,
        total,
        quote.currency || 'LRD',
        customer.paymentReference || null,
        customer.paymentNote || null,
      ]
    );
  });

  const summary = await getOrderPublicSummary(orderId);
  await safeNotify(() =>
    notifyBusinessEvent('order.placed', {
      userId: user?.id || null,
      orderId: summary.id,
      orderNumber: summary.orderNumber,
      total: summary.total,
      currency: summary.currency,
      email: summary.email || customer?.email || null,
      guestEmail: summary.email || null,
    })
  );
  return summary;
}

export async function getOrderPublicSummary(orderIdOrNumber) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, order_number, status, currency, subtotal, discount_amount, delivery_fee,
              tax_amount, total, customer_snapshot, delivery_snapshot, guest_email, guest_phone,
              created_at
       FROM orders
       WHERE (id = ? OR order_number = ?) AND deleted_at IS NULL
       LIMIT 1`
    ),
    [orderIdOrNumber, orderIdOrNumber]
  );
  const order = result.rows?.[0];
  if (!order) {
    throw new HttpError(404, 'Order not found', { code: 'NOT_FOUND' });
  }

  const items = await db.query(
    toDriverSql(
      driver,
      `SELECT id, product_id, variant_id, quantity, unit_price, line_total, product_snapshot
       FROM order_items WHERE order_id = ?`
    ),
    [order.id]
  );

  const payment = await db.query(
    toDriverSql(
      driver,
      `SELECT method, status, amount, currency, id, reference, evidence_url, customer_note
       FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`
    ),
    [order.id]
  );

  const parseMaybe = (value) => {
    if (value == null) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    currency: order.currency,
    subtotal: money(order.subtotal),
    discountAmount: money(order.discount_amount),
    deliveryFee: money(order.delivery_fee),
    taxAmount: money(order.tax_amount),
    total: money(order.total),
    customer: parseMaybe(order.customer_snapshot),
    delivery: parseMaybe(order.delivery_snapshot),
    email: order.guest_email,
    phone: order.guest_phone,
    createdAt: order.created_at,
    items: (items.rows || []).map((row) => {
      const snapshot = parseMaybe(row.product_snapshot) || {};
      return {
        productId: row.product_id || snapshot.productId || null,
        variantId: row.variant_id || snapshot.variantId || null,
        slug: snapshot.slug || null,
        name: snapshot.name,
        size: snapshot.size,
        imageUrl: snapshot.imageUrl || null,
        quantity: row.quantity,
        unitPrice: money(row.unit_price),
        lineTotal: money(row.line_total),
      };
    }),
    payment: payment.rows?.[0]
      ? {
          id: payment.rows[0].id,
          method: payment.rows[0].method,
          status: payment.rows[0].status,
          amount: money(payment.rows[0].amount),
          currency: payment.rows[0].currency,
          reference: payment.rows[0].reference,
          evidenceUrl: payment.rows[0].evidence_url,
          customerNote: payment.rows[0].customer_note,
        }
      : null,
  };
}
