import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDatabase, getDbDriver } from '../../database/connection.js';
import { toDriverSql, nowExpression } from '../../database/dialect.js';
import { serverEnv } from '../config/env.js';
import { HttpError } from '../utils/errors.js';
import { signAccessToken, signPasswordResetToken, verifyPasswordResetToken } from '../utils/jwt.js';
import { dispatchNotification } from './notificationService.js';

function uuid() {
  return crypto.randomUUID();
}

function normalizePhone(phone) {
  if (!phone) return null;
  const trimmed = String(phone).trim();
  return trimmed || null;
}

async function getUserRolesAndPermissions(db, driver, userId) {
  const rolesResult = await db.query(
    toDriverSql(
      driver,
      `SELECT r.slug
       FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ?`
    ),
    [userId]
  );
  const roles = (rolesResult.rows || []).map((row) => row.slug);

  let permissions = [];
  if (roles.length) {
    const permResult = await db.query(
      toDriverSql(
        driver,
        `SELECT DISTINCT p.slug
         FROM user_roles ur
         INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
         INNER JOIN permissions p ON p.id = rp.permission_id
         WHERE ur.user_id = ?`
      ),
      [userId]
    );
    permissions = (permResult.rows || []).map((row) => row.slug);
  }

  return { roles, permissions };
}

async function getCustomerProfile(db, driver, userId) {
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, first_name, last_name, whatsapp
       FROM customer_profiles
       WHERE user_id = ?
       LIMIT 1`
    ),
    [userId]
  );
  const row = result.rows?.[0];
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    whatsapp: row.whatsapp,
  };
}

async function getAdminProfile(db, driver, userId) {
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, display_name, job_title
       FROM admin_profiles
       WHERE user_id = ?
       LIMIT 1`
    ),
    [userId]
  );
  const row = result.rows?.[0];
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    jobTitle: row.job_title,
  };
}

export async function buildPublicUser(userRow) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const { roles, permissions } = await getUserRolesAndPermissions(db, driver, userRow.id);
  const customerProfile = await getCustomerProfile(db, driver, userRow.id);
  const adminProfile = await getAdminProfile(db, driver, userRow.id);

  const isAdmin = ['admin', 'staff'].includes(userRow.user_type) || roles.includes('super_admin');

  return {
    id: userRow.id,
    email: userRow.email,
    phone: userRow.phone,
    userType: userRow.user_type,
    status: userRow.status,
    isAdmin,
    roles,
    permissions,
    customerProfile,
    adminProfile,
  };
}

export async function registerCustomer(input) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const email = input.email;
  const phone = normalizePhone(input.phone);

  const existing = await db.query(
    toDriverSql(
      driver,
      `SELECT id FROM users
       WHERE (email = ? OR (? IS NOT NULL AND phone = ?))
         AND deleted_at IS NULL
       LIMIT 1`
    ),
    [email, phone, phone]
  );
  if (existing.rows?.length) {
    throw new HttpError(409, 'An account with this email or phone already exists', {
      code: 'ACCOUNT_EXISTS',
    });
  }

  const passwordHash = await bcrypt.hash(input.password, serverEnv.bcryptSaltRounds);
  const userId = uuid();
  const profileId = uuid();

  await db.withTransaction(async (tx) => {
    const client = wrapTx(db, tx, driver);
    await client.query(
      toDriverSql(
        driver,
        `INSERT INTO users (id, email, phone, password_hash, user_type, status)
         VALUES (?, ?, ?, ?, 'customer', 'active')`
      ),
      [userId, email, phone, passwordHash]
    );
    await client.query(
      toDriverSql(
        driver,
        `INSERT INTO customer_profiles (id, user_id, first_name, last_name, whatsapp)
         VALUES (?, ?, ?, ?, ?)`
      ),
      [profileId, userId, input.firstName, input.lastName, normalizePhone(input.whatsapp) || phone]
    );
  });

  const user = await findUserById(userId);
  const publicUser = await buildPublicUser(user);
  const token = signAccessToken(
    { sub: user.id, userType: user.user_type, purpose: 'access' },
    { admin: false }
  );

  return { user: publicUser, token };
}

export async function loginUser(identifier, password) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const value = String(identifier).trim().toLowerCase();
  const phoneCandidate = String(identifier).trim();

  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT * FROM users
       WHERE deleted_at IS NULL
         AND (LOWER(email) = ? OR phone = ?)
       LIMIT 1`
    ),
    [value, phoneCandidate]
  );
  const user = result.rows?.[0];
  if (!user) {
    throw new HttpError(401, 'Invalid email/phone or password', { code: 'INVALID_CREDENTIALS' });
  }

  if (user.status === 'suspended' || user.status === 'inactive') {
    throw new HttpError(403, 'This account is not active', { code: 'ACCOUNT_INACTIVE' });
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    throw new HttpError(401, 'Invalid email/phone or password', { code: 'INVALID_CREDENTIALS' });
  }

  await db.query(
    toDriverSql(driver, `UPDATE users SET last_login_at = ${nowExpression(driver)} WHERE id = ?`),
    [user.id]
  );

  const publicUser = await buildPublicUser(user);
  const isAdminSession = publicUser.isAdmin || ['admin', 'staff'].includes(user.user_type);
  const token = signAccessToken(
    { sub: user.id, userType: user.user_type, purpose: 'access' },
    { admin: isAdminSession }
  );

  return { user: publicUser, token };
}

/**
 * Staff-only login — rejects customer accounts without admin roles.
 */
export async function loginAdmin(identifier, password) {
  const result = await loginUser(identifier, password);
  const { isStaffUser } = await import('../utils/rbac.js');
  if (!isStaffUser(result.user)) {
    throw new HttpError(403, 'Staff access required. Use the customer sign-in page.', {
      code: 'NOT_STAFF',
    });
  }

  const token = signAccessToken(
    { sub: result.user.id, userType: result.user.userType, purpose: 'access', scope: 'admin' },
    { admin: true }
  );

  return { user: result.user, token, scope: 'admin' };
}

export async function getUserFromAccessToken(token) {
  const { verifyAccessToken } = await import('../utils/jwt.js');
  const payload = verifyAccessToken(token);
  const user = await findUserById(payload.sub);
  if (!user || user.deleted_at) {
    throw new HttpError(401, 'User not found', { code: 'UNAUTHENTICATED' });
  }
  if (user.status === 'suspended' || user.status === 'inactive') {
    throw new HttpError(403, 'This account is not active', { code: 'ACCOUNT_INACTIVE' });
  }
  return buildPublicUser(user);
}

export async function requestPasswordReset(email) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(
      driver,
      `SELECT id, email FROM users
       WHERE LOWER(email) = ? AND deleted_at IS NULL
       LIMIT 1`
    ),
    [email]
  );
  const user = result.rows?.[0];

  // Always succeed to avoid account enumeration.
  if (!user) {
    return { sent: true };
  }

  const token = signPasswordResetToken(user.id);
  const tokenHash = hashToken(token);
  const id = uuid();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`
    ),
    [id, user.id, tokenHash, expiresAt]
  );

  const resetUrl = `${serverEnv.appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  await dispatchNotification(
    'auth.password_reset',
    {
      email: user.email,
      resetUrl,
      // Never include raw token in durable logs beyond console provider in dev.
    },
    ['email']
  );

  if (serverEnv.emailProvider === 'console' || !serverEnv.isProd) {
    console.info('[auth] Password reset link:', resetUrl);
  }

  return { sent: true };
}

export async function resetPassword(token, password) {
  const payload = verifyPasswordResetToken(token);
  const tokenHash = hashToken(token);
  const db = await getDatabase();
  const driver = getDbDriver();

  const tokenResult = await db.query(
    toDriverSql(
      driver,
      `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = ? AND user_id = ?
       LIMIT 1`
    ),
    [tokenHash, payload.sub]
  );
  const row = tokenResult.rows?.[0];
  if (!row || row.used_at) {
    throw new HttpError(400, 'Invalid or expired reset token', { code: 'INVALID_RESET_TOKEN' });
  }

  const expiresAt = new Date(row.expires_at);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    throw new HttpError(400, 'Invalid or expired reset token', { code: 'INVALID_RESET_TOKEN' });
  }

  const passwordHash = await bcrypt.hash(password, serverEnv.bcryptSaltRounds);

  await db.withTransaction(async (tx) => {
    const client = wrapTx(db, tx, driver);
    await client.query(toDriverSql(driver, `UPDATE users SET password_hash = ? WHERE id = ?`), [
      passwordHash,
      payload.sub,
    ]);
    await client.query(
      toDriverSql(
        driver,
        `UPDATE password_reset_tokens SET used_at = ${nowExpression(driver)} WHERE id = ?`
      ),
      [row.id]
    );
  });

  return { reset: true };
}

export async function findUserById(id) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(toDriverSql(driver, `SELECT * FROM users WHERE id = ? LIMIT 1`), [
    id,
  ]);
  return result.rows?.[0] || null;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function wrapTx(db, tx, driver) {
  if (driver === 'postgres' && tx?.query) {
    return {
      query: (text, params = []) => tx.query(text, params),
    };
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
