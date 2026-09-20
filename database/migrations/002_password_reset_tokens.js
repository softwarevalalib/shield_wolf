import { idColumn, isPostgres, timestampColumn } from '../dialect.js';

function fk(driver, column, table, { onDelete = 'CASCADE', required = true } = {}) {
  const nullability = required ? 'NOT NULL' : '';
  const type = isPostgres(driver) ? 'UUID' : 'TEXT';
  return `${column} ${type} ${nullability} REFERENCES ${table}(id) ON DELETE ${onDelete}`.replace(
    /\s+/g,
    ' '
  );
}

/**
 * Password reset tokens (one-time use).
 */
export async function up(db, driver) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      ${idColumn(driver)},
      ${fk(driver, 'user_id', 'users', { onDelete: 'CASCADE' })},
      token_hash TEXT NOT NULL UNIQUE,
      ${timestampColumn(driver, 'expires_at', { required: true })},
      ${timestampColumn(driver, 'used_at', { required: false })},
      ${timestampColumn(driver, 'created_at', { required: true, defaultNow: true })}
    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
      ON password_reset_tokens(user_id);
  `);
}
