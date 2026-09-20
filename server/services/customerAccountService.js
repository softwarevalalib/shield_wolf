import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDatabase, getDbDriver } from '../../database/connection.js';
import { toDriverSql } from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';
import { serverEnv } from '../config/env.js';
import { buildPublicUser } from './authService.js';
import { listOrdersForUser, getOrderForUser } from './orderService.js';

function uuid() {
  return crypto.randomUUID();
}

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) * 100) / 100;
}

function mapAddress(row) {
  if (!row) return null;
  return {
    id: row.id,
    label: row.label,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    county: row.county,
    city: row.city,
    community: row.community,
    streetLandmark: row.street_landmark,
    deliveryInstructions: row.delivery_instructions,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ACTIVE_DELIVERY_STATUSES = ['ready_for_dispatch', 'out_for_delivery', 'processing', 'packed'];

/**
 * Customer account dashboard overview.
 */
export async function getCustomerOverview(user) {
  if (!user?.id) {
    throw new HttpError(401, 'Authentication required', { code: 'UNAUTHENTICATED' });
  }

  const db = await getDatabase();
  const driver = getDbDriver();

  const where = `WHERE deleted_at IS NULL AND (user_id = ?${
    user.email ? ' OR LOWER(guest_email) = LOWER(?)' : ''
  })`;
  const params = user.email ? [user.id, user.email] : [user.id];

  const countResult = await db.query(
    toDriverSql(driver, `SELECT COUNT(*) AS count FROM orders ${where}`),
    params
  );
  const totalOrders = Number(countResult.rows?.[0]?.count || 0);

  const recentResult = await db.query(
    toDriverSql(
      driver,
      `SELECT id, order_number, status, currency, total, created_at
       FROM orders
       ${where}
       ORDER BY created_at DESC
       LIMIT 1`
    ),
    params
  );
  const recentRow = recentResult.rows?.[0] || null;

  const activeResult = await db.query(
    toDriverSql(
      driver,
      `SELECT id, order_number, status, currency, total, delivery_snapshot, created_at
       FROM orders
       ${where}
         AND status IN (${ACTIVE_DELIVERY_STATUSES.map(() => '?').join(', ')})
       ORDER BY created_at DESC
       LIMIT 1`
    ),
    [...params, ...ACTIVE_DELIVERY_STATUSES]
  );
  const activeRow = activeResult.rows?.[0] || null;

  const addressResult = await db.query(
    toDriverSql(
      driver,
      `SELECT id, label, first_name, last_name, phone, county, city, community,
              street_landmark, delivery_instructions, is_default, created_at, updated_at
       FROM addresses
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY is_default DESC, updated_at DESC
       LIMIT 1`
    ),
    [user.id]
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
    welcomeName:
      user.customerProfile?.firstName || user.adminProfile?.displayName || user.email || 'there',
    stats: {
      totalOrders,
      savedAddresses: await countAddresses(user.id),
    },
    recentOrder: recentRow
      ? {
          id: recentRow.id,
          orderNumber: recentRow.order_number,
          status: recentRow.status,
          currency: recentRow.currency,
          total: money(recentRow.total),
          createdAt: recentRow.created_at,
        }
      : null,
    currentDelivery: activeRow
      ? {
          orderNumber: activeRow.order_number,
          status: activeRow.status,
          total: money(activeRow.total),
          currency: activeRow.currency,
          delivery: parseMaybe(activeRow.delivery_snapshot),
          createdAt: activeRow.created_at,
        }
      : null,
    defaultAddress: mapAddress(addressResult.rows?.[0]),
  };
}

async function countAddresses(userId) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS count FROM addresses WHERE user_id = ? AND deleted_at IS NULL`
    ),
    [userId]
  );
  return Number(result.rows?.[0]?.count || 0);
}

export async function updateCustomerProfile(user, input) {
  if (!user?.id) {
    throw new HttpError(401, 'Authentication required', { code: 'UNAUTHENTICATED' });
  }

  const db = await getDatabase();
  const driver = getDbDriver();
  const firstName = String(input.firstName || '').trim();
  const lastName = String(input.lastName || '').trim();
  const whatsapp = String(input.whatsapp || '').trim() || null;
  const phone = String(input.phone || '').trim() || null;

  if (!firstName || !lastName) {
    throw new HttpError(400, 'First and last name are required', { code: 'VALIDATION_ERROR' });
  }

  await db.query(toDriverSql(driver, `UPDATE users SET phone = ? WHERE id = ?`), [phone, user.id]);

  const existing = await db.query(
    toDriverSql(driver, `SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1`),
    [user.id]
  );

  if (existing.rows?.[0]) {
    await db.query(
      toDriverSql(
        driver,
        `UPDATE customer_profiles
         SET first_name = ?, last_name = ?, whatsapp = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`
      ),
      [firstName, lastName, whatsapp, user.id]
    );
  } else {
    await db.query(
      toDriverSql(
        driver,
        `INSERT INTO customer_profiles (id, user_id, first_name, last_name, whatsapp)
         VALUES (?, ?, ?, ?, ?)`
      ),
      [uuid(), user.id, firstName, lastName, whatsapp]
    );
  }

  const userRow = await db.query(
    toDriverSql(
      driver,
      `SELECT id, email, phone, user_type, status FROM users WHERE id = ? LIMIT 1`
    ),
    [user.id]
  );
  return buildPublicUser(userRow.rows[0]);
}

export async function changeCustomerPassword(user, { currentPassword, newPassword }) {
  if (!user?.id) {
    throw new HttpError(401, 'Authentication required', { code: 'UNAUTHENTICATED' });
  }
  if (!currentPassword || !newPassword) {
    throw new HttpError(400, 'Current and new password are required', {
      code: 'VALIDATION_ERROR',
    });
  }
  if (String(newPassword).length < 8) {
    throw new HttpError(400, 'New password must be at least 8 characters', {
      code: 'VALIDATION_ERROR',
    });
  }

  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(driver, `SELECT id, password_hash FROM users WHERE id = ? LIMIT 1`),
    [user.id]
  );
  const row = result.rows?.[0];
  if (!row) {
    throw new HttpError(404, 'User not found', { code: 'NOT_FOUND' });
  }

  const ok = await bcrypt.compare(String(currentPassword), row.password_hash);
  if (!ok) {
    throw new HttpError(400, 'Current password is incorrect', { code: 'INVALID_PASSWORD' });
  }

  const hash = await bcrypt.hash(String(newPassword), serverEnv.bcryptSaltRounds);
  await db.query(toDriverSql(driver, `UPDATE users SET password_hash = ? WHERE id = ?`), [
    hash,
    user.id,
  ]);

  return { changed: true };
}

export async function listCustomerAddresses(user) {
  if (!user?.id) {
    throw new HttpError(401, 'Authentication required', { code: 'UNAUTHENTICATED' });
  }
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, label, first_name, last_name, phone, county, city, community,
              street_landmark, delivery_instructions, is_default, created_at, updated_at
       FROM addresses
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY is_default DESC, updated_at DESC`
    ),
    [user.id]
  );
  return (result.rows || []).map(mapAddress);
}

export async function createCustomerAddress(user, input) {
  if (!user?.id) {
    throw new HttpError(401, 'Authentication required', { code: 'UNAUTHENTICATED' });
  }

  const db = await getDatabase();
  const driver = getDbDriver();
  const id = uuid();
  const isDefault = Boolean(input.isDefault);

  if (isDefault) {
    await db.query(
      toDriverSql(
        driver,
        `UPDATE addresses SET is_default = ? WHERE user_id = ? AND deleted_at IS NULL`
      ),
      [driver === 'postgres' ? false : 0, user.id]
    );
  }

  const existingCount = await countAddresses(user.id);
  const makeDefault = isDefault || existingCount === 0;

  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO addresses (
        id, user_id, label, first_name, last_name, phone, county, city, community,
        street_landmark, delivery_instructions, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    [
      id,
      user.id,
      String(input.label || 'Home')
        .trim()
        .slice(0, 80) || 'Home',
      String(input.firstName || '').trim() || null,
      String(input.lastName || '').trim() || null,
      String(input.phone || '').trim() || null,
      String(input.county || '').trim() || null,
      String(input.city || '').trim() || null,
      String(input.community || '').trim() || null,
      String(input.streetLandmark || '').trim() || null,
      String(input.deliveryInstructions || '').trim() || null,
      driver === 'postgres' ? makeDefault : makeDefault ? 1 : 0,
    ]
  );

  const created = await db.query(
    toDriverSql(driver, `SELECT * FROM addresses WHERE id = ? LIMIT 1`),
    [id]
  );
  return mapAddress(created.rows[0]);
}

export async function updateCustomerAddress(user, addressId, input) {
  if (!user?.id) {
    throw new HttpError(401, 'Authentication required', { code: 'UNAUTHENTICATED' });
  }

  const db = await getDatabase();
  const driver = getDbDriver();
  const existing = await db.query(
    toDriverSql(
      driver,
      `SELECT id FROM addresses WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1`
    ),
    [addressId, user.id]
  );
  if (!existing.rows?.[0]) {
    throw new HttpError(404, 'Address not found', { code: 'NOT_FOUND' });
  }

  if (input.isDefault) {
    await db.query(
      toDriverSql(
        driver,
        `UPDATE addresses SET is_default = ? WHERE user_id = ? AND deleted_at IS NULL`
      ),
      [driver === 'postgres' ? false : 0, user.id]
    );
  }

  await db.query(
    toDriverSql(
      driver,
      `UPDATE addresses SET
        label = ?, first_name = ?, last_name = ?, phone = ?, county = ?, city = ?,
        community = ?, street_landmark = ?, delivery_instructions = ?,
        is_default = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    ),
    [
      String(input.label || 'Home')
        .trim()
        .slice(0, 80) || 'Home',
      String(input.firstName || '').trim() || null,
      String(input.lastName || '').trim() || null,
      String(input.phone || '').trim() || null,
      String(input.county || '').trim() || null,
      String(input.city || '').trim() || null,
      String(input.community || '').trim() || null,
      String(input.streetLandmark || '').trim() || null,
      String(input.deliveryInstructions || '').trim() || null,
      driver === 'postgres' ? Boolean(input.isDefault) : input.isDefault ? 1 : 0,
      addressId,
      user.id,
    ]
  );

  const updated = await db.query(
    toDriverSql(driver, `SELECT * FROM addresses WHERE id = ? LIMIT 1`),
    [addressId]
  );
  return mapAddress(updated.rows[0]);
}

export async function deleteCustomerAddress(user, addressId) {
  if (!user?.id) {
    throw new HttpError(401, 'Authentication required', { code: 'UNAUTHENTICATED' });
  }

  const db = await getDatabase();
  const driver = getDbDriver();
  const existing = await db.query(
    toDriverSql(
      driver,
      `SELECT id, is_default FROM addresses
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1`
    ),
    [addressId, user.id]
  );
  if (!existing.rows?.[0]) {
    throw new HttpError(404, 'Address not found', { code: 'NOT_FOUND' });
  }

  await db.query(
    toDriverSql(
      driver,
      `UPDATE addresses SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`
    ),
    [addressId, user.id]
  );

  if (existing.rows[0].is_default) {
    const next = await db.query(
      toDriverSql(
        driver,
        `SELECT id FROM addresses
         WHERE user_id = ? AND deleted_at IS NULL
         ORDER BY updated_at DESC LIMIT 1`
      ),
      [user.id]
    );
    if (next.rows?.[0]) {
      await db.query(toDriverSql(driver, `UPDATE addresses SET is_default = ? WHERE id = ?`), [
        driver === 'postgres' ? true : 1,
        next.rows[0].id,
      ]);
    }
  }

  return { deleted: true };
}

export { listOrdersForUser, getOrderForUser };
