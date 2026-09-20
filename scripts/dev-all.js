import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, label) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
      process.exit(code);
    }
  });

  return child;
}

const api = run('node', ['scripts/dev-api.js'], 'api');
const web = run('npx', ['vite'], 'web');

function shutdown() {
  api.kill('SIGTERM');
  web.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
