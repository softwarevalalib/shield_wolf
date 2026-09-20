import crypto from 'node:crypto';
import { getDatabase, getDbDriver } from '../../database/connection.js';
import { nowExpression, toDriverSql } from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';
import { recordTransaction } from './ledgerService.js';

function uuid() {
  return crypto.randomUUID();
}

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) * 100) / 100;
}

function mapExpense(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name || null,
    description: row.description,
    amount: money(row.amount),
    currency: row.currency || 'LRD',
    expenseDate: row.expense_date,
    paymentMethod: row.payment_method,
    reference: row.reference,
    receiptUrl: row.receipt_url,
    enteredBy: row.entered_by,
    enteredByEmail: row.entered_by_email || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listExpenseCategories() {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, name, slug, description, active
       FROM expense_categories
       ORDER BY name ASC`
    )
  );
  return {
    categories: (result.rows || []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      active: Boolean(row.active),
    })),
  };
}

export async function listExpenses(filters = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const where = ['e.deleted_at IS NULL'];
  const params = [];

  if (filters.categoryId && filters.categoryId !== 'all') {
    where.push('e.category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.q) {
    const term = `%${String(filters.q).trim().toLowerCase()}%`;
    where.push(
      `(LOWER(e.description) LIKE ? OR LOWER(COALESCE(e.reference,'')) LIKE ? OR LOWER(c.name) LIKE ?)`
    );
    params.push(term, term, term);
  }
  if (filters.from) {
    where.push('e.expense_date >= ?');
    params.push(new Date(filters.from).toISOString());
  }
  if (filters.to) {
    const end = new Date(filters.to);
    end.setHours(23, 59, 59, 999);
    where.push('e.expense_date <= ?');
    params.push(end.toISOString());
  }

  const whereSql = where.join(' AND ');
  const countResult = await db.query(
    toDriverSql(
      driver,
      `SELECT COUNT(*) AS count
       FROM expenses e
       JOIN expense_categories c ON c.id = e.category_id
       WHERE ${whereSql}`
    ),
    params
  );
  const total = Number(countResult.rows?.[0]?.count || 0);

  const list = await db.query(
    toDriverSql(
      driver,
      `SELECT e.*, c.name AS category_name, u.email AS entered_by_email
       FROM expenses e
       JOIN expense_categories c ON c.id = e.category_id
       LEFT JOIN users u ON u.id = e.entered_by
       WHERE ${whereSql}
       ORDER BY e.expense_date DESC, e.created_at DESC
       LIMIT ? OFFSET ?`
    ),
    [...params, pageSize, offset]
  );

  const sumResult = await db.query(
    toDriverSql(
      driver,
      `SELECT COALESCE(SUM(e.amount), 0) AS total
       FROM expenses e
       JOIN expense_categories c ON c.id = e.category_id
       WHERE ${whereSql}`
    ),
    params
  );

  return {
    expenses: (list.rows || []).map(mapExpense),
    totals: { amount: money(sumResult.rows?.[0]?.total) },
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getExpense(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT e.*, c.name AS category_name, u.email AS entered_by_email
       FROM expenses e
       JOIN expense_categories c ON c.id = e.category_id
       LEFT JOIN users u ON u.id = e.entered_by
       WHERE e.id = ? AND e.deleted_at IS NULL
       LIMIT 1`
    ),
    [id]
  );
  const row = result.rows?.[0];
  if (!row) throw new HttpError(404, 'Expense not found', { code: 'NOT_FOUND' });
  return { expense: mapExpense(row) };
}

async function assertCategory(db, driver, categoryId) {
  const result = await db.query(
    toDriverSql(driver, `SELECT id FROM expense_categories WHERE id = ? LIMIT 1`),
    [categoryId]
  );
  if (!result.rows?.length) {
    throw new HttpError(400, 'Invalid expense category', { code: 'VALIDATION_ERROR' });
  }
}

export async function createExpense(input, { actorId = null } = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  await assertCategory(db, driver, input.categoryId);

  const id = uuid();
  const expenseDate = input.expenseDate
    ? new Date(input.expenseDate).toISOString()
    : new Date().toISOString();

  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO expenses (
         id, category_id, description, amount, currency, expense_date,
         payment_method, reference, receipt_url, entered_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    [
      id,
      input.categoryId,
      input.description.trim(),
      money(input.amount),
      input.currency || 'LRD',
      expenseDate,
      input.paymentMethod || null,
      input.reference || null,
      input.receiptUrl || null,
      actorId,
    ]
  );

  await recordTransaction({
    type: 'expense',
    amount: money(input.amount),
    currency: input.currency || 'LRD',
    paymentMethod: input.paymentMethod || null,
    reference: `expense:${id}`,
    occurredAt: expenseDate,
    createdBy: actorId,
  });

  return getExpense(id);
}

export async function updateExpense(id, input, { actorId = null } = {}) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const current = await getExpense(id);
  await assertCategory(db, driver, input.categoryId);

  const expenseDate = input.expenseDate
    ? new Date(input.expenseDate).toISOString()
    : current.expense.expenseDate;

  await db.query(
    toDriverSql(
      driver,
      `UPDATE expenses SET
         category_id = ?, description = ?, amount = ?, currency = ?, expense_date = ?,
         payment_method = ?, reference = ?, receipt_url = ?,
         updated_at = ${nowExpression(driver)}
       WHERE id = ?`
    ),
    [
      input.categoryId,
      input.description.trim(),
      money(input.amount),
      input.currency || 'LRD',
      expenseDate,
      input.paymentMethod || null,
      input.reference || null,
      input.receiptUrl || null,
      id,
    ]
  );

  // Keep ledger in sync: void old + post new (idempotent reference uses expense id + revision)
  await db.query(
    toDriverSql(
      driver,
      `UPDATE transactions SET status = 'void', updated_at = ${nowExpression(driver)}
       WHERE reference LIKE ? AND type = 'expense' AND status != 'void'`
    ),
    [`expense:${id}%`]
  );

  await recordTransaction({
    type: 'expense',
    amount: money(input.amount),
    currency: input.currency || 'LRD',
    paymentMethod: input.paymentMethod || null,
    reference: `expense:${id}:${Date.now()}`,
    occurredAt: expenseDate,
    createdBy: actorId,
  });

  return getExpense(id);
}

export async function softDeleteExpense(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  await getExpense(id);

  await db.query(
    toDriverSql(
      driver,
      `UPDATE expenses SET deleted_at = ${nowExpression(driver)}, updated_at = ${nowExpression(driver)}
       WHERE id = ?`
    ),
    [id]
  );

  await db.query(
    toDriverSql(
      driver,
      `UPDATE transactions SET status = 'void', updated_at = ${nowExpression(driver)}
       WHERE reference LIKE ? AND type = 'expense' AND status != 'void'`
    ),
    [`expense:${id}%`]
  );

  return { id, deleted: true };
}
