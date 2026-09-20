import crypto from 'node:crypto';
import { getDatabase, getDbDriver } from '../../database/connection.js';
import {
  boolValue,
  isPostgres,
  jsonValue,
  nowExpression,
  toDriverSql,
} from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';
import { DELIVERY_STATUSES } from '../validators/adminDelivery.js';
import { eventTypeForOrderStatus, notifyBusinessEvent, safeNotify } from './notificationService.js';

function uuid() {
  return crypto.randomUUID();
}

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) * 100) / 100;
}

function boolParam(driver, value) {
  return boolValue(driver, Boolean(value));
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

export const DELIVERY_STATUS_TRANSITIONS = {
  pending: ['scheduled', 'assigned', 'cancelled'],
  scheduled: ['assigned', 'cancelled'],
  assigned: ['picked_up', 'out_for_delivery', 'cancelled'],
  picked_up: ['out_for_delivery', 'attempted', 'cancelled'],
  out_for_delivery: ['attempted', 'delivered', 'failed', 'returned', 'cancelled'],
  attempted: ['out_for_delivery', 'delivered', 'failed', 'returned', 'cancelled'],
  delivered: [],
  failed: ['out_for_delivery', 'returned', 'cancelled'],
  returned: ['cancelled'],
  cancelled: [],
};

const ELIGIBLE_ORDER_STATUSES = [
  'paid',
  'processing',
  'packed',
  'ready_for_dispatch',
  'out_for_delivery',
];

async function nextDeliveryNumber(db, driver) {
  const year = new Date().getFullYear();
  const like = `DL-${year}-%`;
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT delivery_number FROM deliveries
       WHERE delivery_number LIKE ?
       ORDER BY delivery_number DESC LIMIT 1`
    ),
    [like]
  );
  const latest = result.rows?.[0]?.delivery_number;
  let seq = 1;
  if (latest) {
    const n = Number(String(latest).split('-').pop());
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `DL-${year}-${String(seq).padStart(6, '0')}`;
}

function mapDelivery(row) {
  return {
    id: row.id,
    deliveryNumber: row.delivery_number,
    orderId: row.order_id,
    orderNumber: row.order_number || null,
    orderStatus: row.order_status || null,
    deliveryZoneId: row.delivery_zone_id,
    zoneName: row.zone_name || null,
    driverId: row.driver_id,
    driverName: row.driver_name || null,
    driverPhone: row.driver_phone || null,
    vehicleId: row.vehicle_id,
    vehicleLabel: row.vehicle_label || null,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    county: row.county,
    city: row.city,
    community: row.community,
    streetLandmark: row.street_landmark,
    deliveryInstructions: row.delivery_instructions,
    deliveryFee: row.delivery_fee == null ? null : money(row.delivery_fee),
    status: row.status,
    dispatchAt: row.dispatch_at,
    expectedAt: row.expected_at,
    deliveredAt: row.delivered_at,
    adminNotes: row.admin_notes,
    driverNotes: row.driver_notes,
    failureReason: row.failure_reason,
    proofOfDeliveryUrl: row.proof_of_delivery_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    allowedTransitions: DELIVERY_STATUS_TRANSITIONS[row.status] || [],
  };
}

const DELIVERY_SELECT = `
  d.*, o.order_number, o.status AS order_status,
  z.name AS zone_name,
  dr.full_name AS driver_name, dr.phone AS driver_phone,
  v.label AS vehicle_label
`;

const DELIVERY_JOINS = `
  FROM deliveries d
  JOIN orders o ON o.id = d.order_id
  LEFT JOIN delivery_zones z ON z.id = d.delivery_zone_id
  LEFT JOIN drivers dr ON dr.id = d.driver_id
  LEFT JOIN vehicles v ON v.id = d.vehicle_id
`;

export async function getDeliveryDashboard() {
  const db = await getDatabase();
  const driver = getDbDriver();

  const counts = await db.query(
    toDriverSql(
      driver,
      `SELECT status, COUNT(*) AS count
       FROM deliveries
       WHERE deleted_at IS NULL
       GROUP BY status`
    )
  );
  const byStatus = Object.fromEntries(DELIVERY_STATUSES.map((s) => [s, 0]));
  for (const row of counts.rows || []) {
    byStatus[row.status] = Number(row.count || 0);
  }

  let deliveredTodayCount = 0;
  if (driver === 'postgres') {
    const pg = await db.query(
      `SELECT COUNT(*) AS count FROM deliveries
       WHERE deleted_at IS NULL AND status = 'delivered'
         AND delivered_at::date = CURRENT_DATE`
    );
    deliveredTodayCount = Number(pg.rows?.[0]?.count || 0);
  } else {
    const deliveredToday = await db.query(
      `SELECT COUNT(*) AS count FROM deliveries
       WHERE deleted_at IS NULL AND status = 'delivered'
         AND delivered_at IS NOT NULL
         AND date(delivered_at) = date('now')`
    );
    deliveredTodayCount = Number(deliveredToday.rows?.[0]?.count || 0);
  }

  const awaitingDispatch = byStatus.pending + byStatus.scheduled;
  const delayed = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS count FROM deliveries
       WHERE deleted_at IS NULL
         AND status IN ('assigned', 'picked_up', 'out_for_delivery', 'attempted')
         AND expected_at IS NOT NULL
         AND expected_at < ${nowExpression(driver)}`
    )
  );

  const recent = await db.query(
    toDriverSql(
      driver,
      `SELECT ${DELIVERY_SELECT}
       ${DELIVERY_JOINS}
       WHERE d.deleted_at IS NULL
       ORDER BY d.updated_at DESC
       LIMIT 8`
    )
  );

  const eligibleOrders = await listEligibleOrdersForDelivery({ limit: 20 });

  return {
    summary: {
      awaitingDispatch,
      assigned: byStatus.assigned,
      outForDelivery: byStatus.out_for_delivery,
      deliveredToday: deliveredTodayCount,
      failed: byStatus.failed,
      delayed: Number(delayed.rows?.[0]?.count || 0),
      cancelled: byStatus.cancelled,
      byStatus,
    },
    recentDeliveries: (recent.rows || []).map(mapDelivery),
    eligibleOrders,
  };
}

export async function listEligibleOrdersForDelivery({ limit = 50 } = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const placeholders = ELIGIBLE_ORDER_STATUSES.map(() => '?').join(', ');
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT o.id, o.order_number, o.status, o.total, o.currency, o.delivery_fee,
              o.guest_phone, o.customer_snapshot, o.delivery_snapshot, o.created_at
       FROM orders o
       WHERE o.deleted_at IS NULL
         AND o.status IN (${placeholders})
         AND NOT EXISTS (
           SELECT 1 FROM deliveries d
           WHERE d.order_id = o.id AND d.deleted_at IS NULL
             AND d.status NOT IN ('cancelled', 'returned')
         )
       ORDER BY o.created_at ASC
       LIMIT ?`
    ),
    [...ELIGIBLE_ORDER_STATUSES, limit]
  );

  return (result.rows || []).map((row) => {
    const customer = parseMaybe(row.customer_snapshot) || {};
    const delivery = parseMaybe(row.delivery_snapshot) || {};
    return {
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      total: money(row.total),
      currency: row.currency,
      deliveryFee: money(row.delivery_fee),
      customerName:
        [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
        customer.name ||
        'Customer',
      phone: row.guest_phone || customer.phone || null,
      community: delivery.community || null,
      zoneName: delivery.zoneName || delivery.zone || null,
      createdAt: row.created_at,
    };
  });
}

export async function listAdminDeliveries(filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const where = ['d.deleted_at IS NULL'];
  const params = [];

  if (filters.status && filters.status !== 'all') {
    where.push('d.status = ?');
    params.push(filters.status);
  }
  if (filters.q) {
    const term = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push(
      `(LOWER(d.delivery_number) LIKE ? OR LOWER(o.order_number) LIKE ? OR LOWER(COALESCE(d.customer_name,'')) LIKE ? OR LOWER(COALESCE(d.customer_phone,'')) LIKE ?)`
    );
    params.push(term, term, term, term);
  }

  const whereSql = where.join(' AND ');
  const countResult = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS count
       FROM deliveries d
       JOIN orders o ON o.id = d.order_id
       WHERE ${whereSql}`
    ),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const list = await db.query(
    toDriverSql(
      driver,
      `SELECT ${DELIVERY_SELECT}
       ${DELIVERY_JOINS}
       WHERE ${whereSql}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`
    ),
    [...params, pageSize, offset]
  );

  return {
    deliveries: (list.rows || []).map(mapDelivery),
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function listDispatchBoard() {
  const db = await getDatabase();
  const driver = getDbDriver();
  const orderBy =
    driver === 'sqlite'
      ? 'd.expected_at IS NULL, d.expected_at ASC, d.created_at ASC'
      : 'd.expected_at ASC NULLS LAST, d.created_at ASC';

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT ${DELIVERY_SELECT}
       ${DELIVERY_JOINS}
       WHERE d.deleted_at IS NULL
         AND d.status IN ('pending','scheduled','assigned','picked_up','out_for_delivery','attempted')
       ORDER BY ${orderBy}`
    )
  );

  const columns = {};
  for (const status of [
    'pending',
    'scheduled',
    'assigned',
    'picked_up',
    'out_for_delivery',
    'attempted',
  ]) {
    columns[status] = [];
  }
  for (const row of result.rows || []) {
    const mapped = mapDelivery(row);
    if (columns[mapped.status]) columns[mapped.status].push(mapped);
  }
  return { columns };
}

export async function getAdminDelivery(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT ${DELIVERY_SELECT}
       ${DELIVERY_JOINS}
       WHERE d.id = ? AND d.deleted_at IS NULL
       LIMIT 1`
    ),
    [id]
  );
  const row = result.rows?.[0];
  if (!row) throw new HttpError(404, 'Delivery not found', { code: 'NOT_FOUND' });

  const history = await db.query(
    toDriverSql(
      driver,
      `SELECT h.*, u.email AS changed_by_email
       FROM delivery_status_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.delivery_id = ?
       ORDER BY h.created_at ASC`
    ),
    [id]
  );

  return {
    delivery: mapDelivery(row),
    statusHistory: (history.rows || []).map((h) => ({
      id: h.id,
      fromStatus: h.from_status,
      toStatus: h.to_status,
      note: h.note,
      changedByEmail: h.changed_by_email || null,
      at: h.created_at,
    })),
  };
}

export async function createDeliveryFromOrder(input, { actorId = null } = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();

  const orderResult = await db.query(
    toDriverSql(driver, `SELECT * FROM orders WHERE id = ? AND deleted_at IS NULL LIMIT 1`),
    [input.orderId]
  );
  const order = orderResult.rows?.[0];
  if (!order) throw new HttpError(404, 'Order not found', { code: 'NOT_FOUND' });
  if (!ELIGIBLE_ORDER_STATUSES.includes(order.status)) {
    throw new HttpError(409, `Order status ${order.status} is not eligible for dispatch`, {
      code: 'ORDER_NOT_ELIGIBLE',
    });
  }

  const existing = await db.query(
    toDriverSql(
      driver,
      `SELECT id FROM deliveries
       WHERE order_id = ? AND deleted_at IS NULL AND status NOT IN ('cancelled','returned')
       LIMIT 1`
    ),
    [order.id]
  );
  if (existing.rows?.length) {
    throw new HttpError(409, 'An active delivery already exists for this order', {
      code: 'DELIVERY_EXISTS',
    });
  }

  const customer = parseMaybe(order.customer_snapshot) || {};
  const deliverySnap = parseMaybe(order.delivery_snapshot) || {};
  const deliveryNumber = await nextDeliveryNumber(db, driver);
  const id = uuid();

  let status = 'pending';
  if (input.driverId) status = 'assigned';

  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO deliveries (
         id, delivery_number, order_id, delivery_zone_id, driver_id, vehicle_id,
         customer_name, customer_phone, county, city, community, street_landmark,
         delivery_instructions, delivery_fee, status, expected_at, admin_notes, dispatch_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    [
      id,
      deliveryNumber,
      order.id,
      input.deliveryZoneId || deliverySnap.zoneId || null,
      input.driverId || null,
      input.vehicleId || null,
      [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
        customer.name ||
        'Customer',
      order.guest_phone || customer.phone || null,
      deliverySnap.county || null,
      deliverySnap.city || null,
      deliverySnap.community || null,
      deliverySnap.streetLandmark || deliverySnap.address || null,
      deliverySnap.instructions || order.notes || null,
      order.delivery_fee,
      status,
      input.expectedAt || null,
      input.adminNotes || null,
      status === 'assigned' ? new Date().toISOString() : null,
    ]
  );

  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO delivery_status_history (id, delivery_id, from_status, to_status, note, changed_by)
       VALUES (?, ?, NULL, ?, ?, ?)`
    ),
    [uuid(), id, status, 'Delivery created from order', actorId]
  );

  if (order.status === 'paid' || order.status === 'processing' || order.status === 'packed') {
    await db.query(
      toDriverSql(
        driver,
        `UPDATE orders SET status = 'ready_for_dispatch', updated_at = ${nowExpression(driver)} WHERE id = ?`
      ),
      [order.id]
    );
    await db.query(
      toDriverSql(
        driver,
        `INSERT INTO order_status_history (id, order_id, from_status, to_status, note, changed_by)
         VALUES (?, ?, ?, 'ready_for_dispatch', 'Delivery record created', ?)`
      ),
      [uuid(), order.id, order.status, actorId]
    );
  }

  return getAdminDelivery(id);
}

export async function updateAdminDelivery(id, input, { actorId = null } = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const current = await getAdminDelivery(id);
  const delivery = current.delivery;

  const nextStatus = input.status || delivery.status;
  if (input.status && input.status !== delivery.status) {
    const allowed = DELIVERY_STATUS_TRANSITIONS[delivery.status] || [];
    if (!allowed.includes(input.status)) {
      throw new HttpError(409, `Cannot move delivery from ${delivery.status} to ${input.status}`, {
        code: 'INVALID_TRANSITION',
        details: { from: delivery.status, to: input.status, allowed },
      });
    }
  }

  if (input.status === 'failed' && !(input.failureReason || delivery.failureReason)) {
    throw new HttpError(400, 'Failure reason is required when marking failed', {
      code: 'VALIDATION_ERROR',
    });
  }

  const driverId = input.driverId !== undefined ? input.driverId || null : delivery.driverId;
  const vehicleId = input.vehicleId !== undefined ? input.vehicleId || null : delivery.vehicleId;

  let status = nextStatus;
  if (driverId && status === 'pending') status = 'assigned';

  const deliveredAt =
    status === 'delivered'
      ? delivery.deliveredAt || new Date().toISOString()
      : delivery.deliveredAt;
  const dispatchAt =
    ['assigned', 'picked_up', 'out_for_delivery'].includes(status) && !delivery.dispatchAt
      ? new Date().toISOString()
      : input.dispatchAt !== undefined
        ? input.dispatchAt
        : delivery.dispatchAt;

  await db.query(
    toDriverSql(
      driver,
      `UPDATE deliveries SET
         status = ?, driver_id = ?, vehicle_id = ?, delivery_zone_id = ?,
         expected_at = ?, dispatch_at = ?, delivered_at = ?,
         admin_notes = ?, driver_notes = ?, failure_reason = ?, proof_of_delivery_url = ?,
         updated_at = ${nowExpression(driver)}
       WHERE id = ?`
    ),
    [
      status,
      driverId,
      vehicleId,
      input.deliveryZoneId !== undefined ? input.deliveryZoneId || null : delivery.deliveryZoneId,
      input.expectedAt !== undefined ? input.expectedAt : delivery.expectedAt,
      dispatchAt,
      deliveredAt,
      input.adminNotes !== undefined ? input.adminNotes : delivery.adminNotes,
      input.driverNotes !== undefined ? input.driverNotes : delivery.driverNotes,
      input.failureReason !== undefined ? input.failureReason : delivery.failureReason,
      input.proofOfDeliveryUrl !== undefined
        ? input.proofOfDeliveryUrl
        : delivery.proofOfDeliveryUrl,
      id,
    ]
  );

  if (status !== delivery.status) {
    await db.query(
      toDriverSql(
        driver,
        `INSERT INTO delivery_status_history (id, delivery_id, from_status, to_status, note, changed_by)
         VALUES (?, ?, ?, ?, ?, ?)`
      ),
      [uuid(), id, delivery.status, status, input.note || null, actorId]
    );

    // Sync order status for key delivery milestones
    if (status === 'out_for_delivery') {
      await db.query(
        toDriverSql(
          driver,
          `UPDATE orders SET status = 'out_for_delivery', updated_at = ${nowExpression(driver)}
           WHERE id = ? AND status NOT IN ('delivered','cancelled','refunded')`
        ),
        [delivery.orderId]
      );
      await db.query(
        toDriverSql(
          driver,
          `INSERT INTO order_status_history (id, order_id, from_status, to_status, note, changed_by)
           VALUES (?, ?, ?, 'out_for_delivery', 'Synced from delivery', ?)`
        ),
        [uuid(), delivery.orderId, delivery.orderStatus, actorId]
      );
    }
    if (status === 'delivered') {
      await db.query(
        toDriverSql(
          driver,
          `UPDATE orders SET status = 'delivered', updated_at = ${nowExpression(driver)}
           WHERE id = ? AND status NOT IN ('cancelled','refunded')`
        ),
        [delivery.orderId]
      );
      await db.query(
        toDriverSql(
          driver,
          `INSERT INTO order_status_history (id, order_id, from_status, to_status, note, changed_by)
           VALUES (?, ?, ?, 'delivered', 'Delivery completed', ?)`
        ),
        [uuid(), delivery.orderId, delivery.orderStatus, actorId]
      );
    }

    const milestoneEvent =
      status === 'out_for_delivery' || status === 'delivered'
        ? eventTypeForOrderStatus(status)
        : null;
    if (milestoneEvent) {
      const orderRow = await db.query(
        toDriverSql(
          driver,
          `SELECT id, order_number, user_id, guest_email FROM orders WHERE id = ? LIMIT 1`
        ),
        [delivery.orderId]
      );
      const order = orderRow.rows?.[0];
      if (order) {
        await safeNotify(() =>
          notifyBusinessEvent(milestoneEvent, {
            userId: order.user_id || null,
            orderId: order.id,
            orderNumber: order.order_number,
            email: order.guest_email || null,
            guestEmail: order.guest_email || null,
          })
        );
      }
    }
  }

  if (driverId) {
    await db.query(
      toDriverSql(
        driver,
        `UPDATE drivers SET status = CASE
           WHEN ? IN ('delivered','cancelled','returned','failed') THEN 'active'
           ELSE 'on_delivery' END,
           updated_at = ${nowExpression(driver)}
         WHERE id = ?`
      ),
      [status, driverId]
    );
  }

  return getAdminDelivery(id);
}

// —— Drivers ——
export async function listDrivers() {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT d.*,
              (SELECT COUNT(*) FROM deliveries x
               WHERE x.driver_id = d.id AND x.deleted_at IS NULL
                 AND x.status IN ('assigned','picked_up','out_for_delivery','attempted')) AS active_deliveries
       FROM drivers d
       WHERE d.deleted_at IS NULL
       ORDER BY d.full_name ASC`
    )
  );
  return {
    drivers: (result.rows || []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      status: row.status,
      activeDeliveries: Number(row.active_deliveries || 0),
      createdAt: row.created_at,
    })),
  };
}

export async function createDriver(input) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const id = uuid();
  await db.query(
    toDriverSql(driver, `INSERT INTO drivers (id, full_name, phone, status) VALUES (?, ?, ?, ?)`),
    [id, input.fullName, input.phone, input.status || 'active']
  );
  const list = await listDrivers();
  return list.drivers.find((d) => d.id === id);
}

export async function updateDriver(id, input) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const existing = await db.query(
    toDriverSql(driver, `SELECT id FROM drivers WHERE id = ? AND deleted_at IS NULL LIMIT 1`),
    [id]
  );
  if (!existing.rows?.length) throw new HttpError(404, 'Driver not found', { code: 'NOT_FOUND' });

  await db.query(
    toDriverSql(
      driver,
      `UPDATE drivers SET full_name = ?, phone = ?, status = ?, updated_at = ${nowExpression(driver)}
       WHERE id = ?`
    ),
    [input.fullName, input.phone, input.status || 'active', id]
  );
  const list = await listDrivers();
  return list.drivers.find((d) => d.id === id);
}

export async function softDeleteDriver(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  await db.query(
    toDriverSql(
      driver,
      `UPDATE drivers SET deleted_at = ${nowExpression(driver)}, status = 'inactive',
         updated_at = ${nowExpression(driver)} WHERE id = ?`
    ),
    [id]
  );
  return { id, deleted: true };
}

// —— Vehicles ——
export async function listVehicles() {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(driver, `SELECT * FROM vehicles WHERE deleted_at IS NULL ORDER BY label ASC`)
  );
  return {
    vehicles: (result.rows || []).map((row) => ({
      id: row.id,
      label: row.label,
      plateNumber: row.plate_number,
      vehicleType: row.vehicle_type,
      active: Boolean(row.active),
      createdAt: row.created_at,
    })),
  };
}

export async function createVehicle(input) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const id = uuid();
  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO vehicles (id, label, plate_number, vehicle_type, active) VALUES (?, ?, ?, ?, ?)`
    ),
    [
      id,
      input.label,
      input.plateNumber || null,
      input.vehicleType || null,
      boolParam(driver, input.active !== false),
    ]
  );
  const list = await listVehicles();
  return list.vehicles.find((v) => v.id === id);
}

export async function updateVehicle(id, input) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const existing = await db.query(
    toDriverSql(driver, `SELECT id FROM vehicles WHERE id = ? AND deleted_at IS NULL LIMIT 1`),
    [id]
  );
  if (!existing.rows?.length) throw new HttpError(404, 'Vehicle not found', { code: 'NOT_FOUND' });

  await db.query(
    toDriverSql(
      driver,
      `UPDATE vehicles SET label = ?, plate_number = ?, vehicle_type = ?, active = ?,
         updated_at = ${nowExpression(driver)} WHERE id = ?`
    ),
    [
      input.label,
      input.plateNumber || null,
      input.vehicleType || null,
      boolParam(driver, input.active !== false),
      id,
    ]
  );
  const list = await listVehicles();
  return list.vehicles.find((v) => v.id === id);
}

export async function softDeleteVehicle(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  await db.query(
    toDriverSql(
      driver,
      `UPDATE vehicles SET deleted_at = ${nowExpression(driver)}, active = ?,
         updated_at = ${nowExpression(driver)} WHERE id = ?`
    ),
    [boolParam(driver, false), id]
  );
  return { id, deleted: true };
}

// —— Zones (admin) ——
export async function listAdminZones() {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(driver, `SELECT * FROM delivery_zones WHERE deleted_at IS NULL ORDER BY name ASC`)
  );
  return {
    zones: (result.rows || []).map((row) => ({
      id: row.id,
      name: row.name,
      county: row.county,
      communities: parseMaybe(row.communities) || [],
      deliveryFee: money(row.delivery_fee),
      minimumFreeDeliveryAmount:
        row.minimum_free_delivery_amount == null ? null : money(row.minimum_free_delivery_amount),
      estimatedTime: row.estimated_time,
      active: Boolean(row.active),
    })),
  };
}

export async function createAdminZone(input) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const id = uuid();
  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO delivery_zones
         (id, name, county, communities, delivery_fee, minimum_free_delivery_amount, estimated_time, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    [
      id,
      input.name,
      input.county || null,
      encodeJson(driver, input.communities || []),
      input.deliveryFee,
      input.minimumFreeDeliveryAmount ?? null,
      input.estimatedTime || null,
      boolParam(driver, input.active !== false),
    ]
  );
  const list = await listAdminZones();
  return list.zones.find((z) => z.id === id);
}

export async function updateAdminZone(id, input) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const existing = await db.query(
    toDriverSql(
      driver,
      `SELECT id FROM delivery_zones WHERE id = ? AND deleted_at IS NULL LIMIT 1`
    ),
    [id]
  );
  if (!existing.rows?.length) throw new HttpError(404, 'Zone not found', { code: 'NOT_FOUND' });

  await db.query(
    toDriverSql(
      driver,
      `UPDATE delivery_zones SET
         name = ?, county = ?, communities = ?, delivery_fee = ?,
         minimum_free_delivery_amount = ?, estimated_time = ?, active = ?,
         updated_at = ${nowExpression(driver)}
       WHERE id = ?`
    ),
    [
      input.name,
      input.county || null,
      encodeJson(driver, input.communities || []),
      input.deliveryFee,
      input.minimumFreeDeliveryAmount ?? null,
      input.estimatedTime || null,
      boolParam(driver, input.active !== false),
      id,
    ]
  );
  const list = await listAdminZones();
  return list.zones.find((z) => z.id === id);
}

export async function softDeleteAdminZone(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  await db.query(
    toDriverSql(
      driver,
      `UPDATE delivery_zones SET deleted_at = ${nowExpression(driver)}, active = ?,
         updated_at = ${nowExpression(driver)} WHERE id = ?`
    ),
    [boolParam(driver, false), id]
  );
  return { id, deleted: true };
}
