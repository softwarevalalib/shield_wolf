/**
 * Dialect helpers for Postgres (Neon) vs SQLite.
 * Migrations are applied per environment — never bidirectional sync.
 */

export function isPostgres(driver) {
  return driver === 'postgres';
}

export function quoteIdent(driver, name) {
  return isPostgres(driver) ? `"${name}"` : `"${name}"`;
}

/** Primary key column definition (portable TEXT UUIDs). */
export function idColumn(driver) {
  return isPostgres(driver)
    ? 'id UUID PRIMARY KEY DEFAULT gen_random_uuid()'
    : 'id TEXT PRIMARY KEY';
}

export function timestampColumn(driver, name, { required = true, defaultNow = false } = {}) {
  const type = isPostgres(driver) ? 'TIMESTAMPTZ' : 'TEXT';
  const nullability = required ? 'NOT NULL' : '';
  const def = defaultNow
    ? isPostgres(driver)
      ? 'DEFAULT NOW()'
      : "DEFAULT (datetime('now'))"
    : '';
  return [name, type, nullability, def].filter(Boolean).join(' ');
}

export function booleanColumn(driver, name, defaultValue = false) {
  if (isPostgres(driver)) {
    return `${name} BOOLEAN NOT NULL DEFAULT ${defaultValue ? 'TRUE' : 'FALSE'}`;
  }
  return `${name} INTEGER NOT NULL DEFAULT ${defaultValue ? 1 : 0}`;
}

export function moneyColumn(driver, name, { required = false } = {}) {
  const type = isPostgres(driver) ? 'NUMERIC(14, 2)' : 'NUMERIC';
  return `${name} ${type}${required ? ' NOT NULL' : ''}`;
}

export function jsonColumn(driver, name, { required = false } = {}) {
  const type = isPostgres(driver) ? 'JSONB' : 'TEXT';
  return `${name} ${type}${required ? ' NOT NULL' : ''}`;
}

export function textColumn(name, { required = false, unique = false } = {}) {
  return `${name} TEXT${required ? ' NOT NULL' : ''}${unique ? ' UNIQUE' : ''}`;
}

export function integerColumn(name, { required = false, defaultValue } = {}) {
  const def = defaultValue === undefined ? '' : ` DEFAULT ${defaultValue}`;
  return `${name} INTEGER${required ? ' NOT NULL' : ''}${def}`;
}

/**
 * Convert `?` placeholders to `$1,$2,...` for Postgres.
 * SQLite keeps `?`.
 */
export function toDriverSql(driver, sql) {
  if (!isPostgres(driver)) return sql;
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

export function boolValue(driver, value) {
  if (isPostgres(driver)) return Boolean(value);
  return value ? 1 : 0;
}

export function nowExpression(driver) {
  return isPostgres(driver) ? 'NOW()' : "datetime('now')";
}

export function jsonValue(_driver, value) {
  // Always JSON.stringify. node-pg converts JS arrays to Postgres array
  // literals ({a,b}), which are invalid for JSONB columns.
  return JSON.stringify(value === undefined ? null : value);
}
