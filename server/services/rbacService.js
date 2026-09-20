import { getDatabase, getDbDriver } from '../../database/connection.js';
import { toDriverSql } from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';
import { isStaffUser } from '../utils/rbac.js';

/**
 * List roles with permission slugs (for admin RBAC UI).
 */
export async function listRolesWithPermissions() {
  const db = await getDatabase();
  const driver = getDbDriver();

  const roles = await db.query(
    toDriverSql(
      driver,
      `SELECT id, slug, name, description, is_system
       FROM roles
       ORDER BY name ASC`
    )
  );

  const rolePermissions = await db.query(
    toDriverSql(
      driver,
      `SELECT r.slug AS role_slug, p.slug AS permission_slug
       FROM role_permissions rp
       INNER JOIN roles r ON r.id = rp.role_id
       INNER JOIN permissions p ON p.id = rp.permission_id
       ORDER BY r.slug, p.slug`
    )
  );

  const map = new Map();
  for (const row of rolePermissions.rows || []) {
    if (!map.has(row.role_slug)) map.set(row.role_slug, []);
    map.get(row.role_slug).push(row.permission_slug);
  }

  return (roles.rows || []).map((role) => ({
    id: role.id,
    slug: role.slug,
    name: role.name,
    description: role.description,
    isSystem: Boolean(role.is_system),
    permissions: map.get(role.slug) || [],
  }));
}

export async function listPermissionsCatalog() {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(driver, `SELECT id, slug, description FROM permissions ORDER BY slug ASC`)
  );
  return (result.rows || []).map((row) => ({
    id: row.id,
    slug: row.slug,
    description: row.description,
  }));
}

export function assertStaff(user) {
  if (!isStaffUser(user)) {
    throw new HttpError(403, 'Admin access required', { code: 'FORBIDDEN' });
  }
}
