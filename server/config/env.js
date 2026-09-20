/**
 * Server-side environment configuration.
 * Secrets must never be imported into frontend bundles.
 */
function requiredInProduction(name, value) {
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || '';
}

export const serverEnv = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:5173/api',
  databaseUrl: process.env.DATABASE_URL || '',
  dbDriver: (process.env.DB_DRIVER || '').toLowerCase(),
  sqlitePath: process.env.SQLITE_PATH || './database/local/shield_wolf.sqlite',
  jwtSecret: requiredInProduction('JWT_SECRET', process.env.JWT_SECRET || 'dev-only-jwt-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtAdminExpiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '8h',
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),
  corsOrigin: process.env.CORS_ORIGIN || process.env.APP_URL || 'http://localhost:5173',
  mediaProvider: process.env.MEDIA_PROVIDER || 'local',
  emailProvider: process.env.EMAIL_PROVIDER || 'console',
  paymentProvider: process.env.PAYMENT_PROVIDER || 'manual',
};
