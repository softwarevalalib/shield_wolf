import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const healthHandlerUrl = pathToFileURL(path.resolve(__dirname, '../../api/health/index.js')).href;

async function withHealthServer(run) {
  const mod = await import(healthHandlerUrl);
  const handler = mod.default;
  const server = createServer((req, res) => {
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (body) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };
    handler(req, res).catch((error) => {
      res.statusCode = 500;
      res.end(JSON.stringify({ success: false, message: error.message }));
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await run(port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe('GET /api/health', () => {
  it('returns ok payload with phase metadata', async () => {
    await withHealthServer(async (port) => {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      expect(response.status).toBeLessThan(600);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.service).toBe('shield-wolf-api');
      expect(typeof body.data.phase).toBe('number');
      expect(body.data.phase).toBeGreaterThanOrEqual(30);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });
  });
});
