/**
 * Local QA gate: lint + unit tests + production env shape check (non-strict when unset).
 * For live smoke against a deployed URL, use: npm run qa:smoke -- --base=URL
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(label, command, args) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`Failed: ${label}`);
    process.exit(result.status || 1);
  }
}

run('lint', 'npm', ['run', 'lint']);
run('unit/api tests', 'npm', ['run', 'test']);
run('production build', 'npm', ['run', 'build']);

console.log('\nQA gate passed (lint + test + build).');
console.log('Next: set Vercel env vars, deploy, then run:');
console.log('  npm run qa:smoke -- --base=https://YOUR_DEPLOYMENT.vercel.app');
