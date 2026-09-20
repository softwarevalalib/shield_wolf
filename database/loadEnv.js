import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Load .env then .env.local for CLI database scripts.
 * Does not override already-set process env vars.
 */
export function loadEnv() {
  dotenv.config({ path: path.join(rootDir, '.env') });
  dotenv.config({ path: path.join(rootDir, '.env.local'), override: true });
}
