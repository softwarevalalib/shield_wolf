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
import { getMediaProviderName } from './mediaService.js';

function uuid() {
  return crypto.randomUUID();
}

function encodeJson(driver, value) {
  // Always stringify — pg treats JS arrays as PG arrays, not JSONB.
  return jsonValue(driver, value);
}

function mapTestimonial(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    body: row.body,
    rating: row.rating == null ? null : Number(row.rating),
    featured: Boolean(row.featured),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMedia(row) {
  return {
    id: row.id,
    provider: row.provider,
    publicId: row.public_id,
    url: row.url,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    altText: row.alt_text,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

export async function listTestimonials(filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 50));
  const offset = (page - 1) * pageSize;

  const where = ['deleted_at IS NULL'];
  const params = [];
  if (filters.active === true || filters.active === 'true') {
    where.push('active = ?');
    params.push(boolValue(driver, true));
  } else if (filters.active === false || filters.active === 'false') {
    where.push('active = ?');
    params.push(boolValue(driver, false));
  }
  if (filters.q) {
    const term = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push('(LOWER(customer_name) LIKE ? OR LOWER(body) LIKE ?)');
    params.push(term, term);
  }

  const whereSql = where.join(' AND ');
  const countResult = await db.query(
    toDriverSql(driver, `SELECT COUNT(*) AS count FROM testimonials WHERE ${whereSql}`),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, customer_name, body, rating, featured, active, sort_order, created_at, updated_at
       FROM testimonials
       WHERE ${whereSql}
       ORDER BY sort_order ASC, created_at DESC
       LIMIT ? OFFSET ?`
    ),
    [...params, pageSize, offset]
  );

  return {
    items: (result.rows || []).map(mapTestimonial),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getTestimonial(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, customer_name, body, rating, featured, active, sort_order, created_at, updated_at
       FROM testimonials WHERE id = ? AND deleted_at IS NULL LIMIT 1`
    ),
    [id]
  );
  const row = result.rows?.[0];
  if (!row) throw new HttpError(404, 'Testimonial not found', { code: 'NOT_FOUND' });
  return mapTestimonial(row);
}

export async function createTestimonial(input, { actorId } = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const id = uuid();
  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO testimonials
         (id, customer_name, body, rating, featured, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ),
    [
      id,
      input.customerName.trim(),
      input.body.trim(),
      input.rating ?? null,
      boolValue(driver, Boolean(input.featured)),
      boolValue(driver, input.active !== false),
      Number(input.sortOrder || 0),
    ]
  );
  const created = await getTestimonial(id);
  await writeAudit(db, driver, {
    actorId,
    action: 'testimonial.create',
    resourceType: 'testimonials',
    resourceId: id,
    oldValue: null,
    newValue: created,
  });
  return created;
}

export async function updateTestimonial(id, input, { actorId } = {}) {
  const existing = await getTestimonial(id);
  const db = await getDatabase();
  const driver = getDbDriver();

  const customerName =
    input.customerName !== undefined ? input.customerName.trim() : existing.customerName;
  const body = input.body !== undefined ? input.body.trim() : existing.body;
  const rating = input.rating !== undefined ? input.rating : existing.rating;
  const featured = input.featured !== undefined ? Boolean(input.featured) : existing.featured;
  const active = input.active !== undefined ? Boolean(input.active) : existing.active;
  const sortOrder = input.sortOrder !== undefined ? Number(input.sortOrder) : existing.sortOrder;

  await db.query(
    toDriverSql(
      driver,
      `UPDATE testimonials
       SET customer_name = ?, body = ?, rating = ?, featured = ?, active = ?, sort_order = ?,
           updated_at = ${nowExpression(driver)}
       WHERE id = ? AND deleted_at IS NULL`
    ),
    [
      customerName,
      body,
      rating,
      boolValue(driver, featured),
      boolValue(driver, active),
      sortOrder,
      id,
    ]
  );

  const updated = await getTestimonial(id);
  await writeAudit(db, driver, {
    actorId,
    action: 'testimonial.update',
    resourceType: 'testimonials',
    resourceId: id,
    oldValue: existing,
    newValue: updated,
  });
  return updated;
}

export async function deleteTestimonial(id, { actorId } = {}) {
  const existing = await getTestimonial(id);
  const db = await getDatabase();
  const driver = getDbDriver();
  await db.query(
    toDriverSql(
      driver,
      `UPDATE testimonials
       SET deleted_at = ${nowExpression(driver)}, active = ?, updated_at = ${nowExpression(driver)}
       WHERE id = ?`
    ),
    [boolValue(driver, false), id]
  );
  await writeAudit(db, driver, {
    actorId,
    action: 'testimonial.delete',
    resourceType: 'testimonials',
    resourceId: id,
    oldValue: existing,
    newValue: null,
  });
  return { deleted: true, id };
}

export async function listMedia(filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 40));
  const offset = (page - 1) * pageSize;

  const where = ['deleted_at IS NULL'];
  const params = [];
  if (filters.q) {
    const term = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push(
      "(LOWER(url) LIKE ? OR LOWER(COALESCE(alt_text,'')) LIKE ? OR LOWER(COALESCE(public_id,'')) LIKE ?)"
    );
    params.push(term, term, term);
  }

  const whereSql = where.join(' AND ');
  const countResult = await db.query(
    toDriverSql(driver, `SELECT COUNT(*) AS count FROM media WHERE ${whereSql}`),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, provider, public_id, url, mime_type, size_bytes, width, height, alt_text,
              uploaded_by, created_at, updated_at
       FROM media
       WHERE ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ),
    [...params, pageSize, offset]
  );

  return {
    items: (result.rows || []).map(mapMedia),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    provider: getMediaProviderName(),
  };
}

export async function registerMedia(input, { actorId } = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const id = uuid();
  const provider = input.provider || getMediaProviderName();

  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO media
         (id, provider, public_id, url, mime_type, size_bytes, width, height, alt_text, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    [
      id,
      provider,
      input.publicId || null,
      input.url.trim(),
      input.mimeType || null,
      input.sizeBytes ?? null,
      input.width ?? null,
      input.height ?? null,
      input.altText || null,
      actorId || null,
    ]
  );

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, provider, public_id, url, mime_type, size_bytes, width, height, alt_text,
              uploaded_by, created_at, updated_at
       FROM media WHERE id = ? LIMIT 1`
    ),
    [id]
  );
  const created = mapMedia(result.rows[0]);
  await writeAudit(db, driver, {
    actorId,
    action: 'media.register',
    resourceType: 'media',
    resourceId: id,
    oldValue: null,
    newValue: created,
  });
  return created;
}

export async function deleteMedia(id, { actorId } = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, provider, public_id, url, mime_type, size_bytes, width, height, alt_text,
              uploaded_by, created_at, updated_at
       FROM media WHERE id = ? AND deleted_at IS NULL LIMIT 1`
    ),
    [id]
  );
  const row = result.rows?.[0];
  if (!row) throw new HttpError(404, 'Media not found', { code: 'NOT_FOUND' });
  const existing = mapMedia(row);

  await db.query(
    toDriverSql(
      driver,
      `UPDATE media SET deleted_at = ${nowExpression(driver)}, updated_at = ${nowExpression(driver)} WHERE id = ?`
    ),
    [id]
  );
  await writeAudit(db, driver, {
    actorId,
    action: 'media.delete',
    resourceType: 'media',
    resourceId: id,
    oldValue: existing,
    newValue: null,
  });
  return { deleted: true, id };
}
