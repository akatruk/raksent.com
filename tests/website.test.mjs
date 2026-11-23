import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { website } from '../applications/website/server.mjs';
import { pagePaths } from '../applications/website/pages.mjs';

const origin = 'https://raksent.com';
const validBody = new URLSearchParams({
  name: 'Test User', organization: 'Example Organization', email: 'test@example.com',
  service: 'cloud-security', message: 'Review our test cloud environment.',
}).toString();

function request(server, url, { method = 'GET', body, headers = {} } = {}) {
  const req = Readable.from(body ? [Buffer.from(body)] : []);
  Object.assign(req, { url, method, headers, socket: { remoteAddress: '127.0.0.1' } });
  return new Promise(resolve => {
    const fields = {};
    const res = {
      setHeader(name, value) { fields[name] = value; },
      writeHead(status, responseHeaders) {
        this.status = status;
        Object.assign(fields, responseHeaders);
        this.headersSent = true;
      },
      end(content) { resolve({ status: this.status, headers: fields, body: content?.toString() }); },
    };
    server.emit('request', req, res);
  });
}

test('public routes, health, discoverability and browser headers', async () => {
  const server = website();
  for (const path of pagePaths) {
    const result = await request(server, path);
    assert.equal(result.status, 200, path);
    assert.match(result.body, /<h1>/, path);
    assert.match(result.headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  }
  const sitemap = await request(server, '/sitemap.xml');
  for (const path of pagePaths) assert.ok(sitemap.body.includes(`<loc>${origin}${path}</loc>`));
  assert.equal((await request(server, '/assets/site.css')).status, 200);
  assert.equal((await request(server, '/readyz')).status, 200);
  assert.equal((await request(server, '/unavailable')).status, 404);
  assert.equal((await request(server, '/', { method: 'HEAD' })).body, undefined);
  assert.equal((await request(server, '/', { method: 'DELETE' })).status, 405);
});

test('inquiries are validated and the accepted record is saved privately', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'raksent-inquiries-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const server = website({ leadDirectory: directory });
  const headers = { origin, 'content-type': 'application/x-www-form-urlencoded' };
  const post = (body, overrides = {}) => request(server, '/request-assessment', {
    method: 'POST', body, headers: { ...headers, ...overrides },
  });

  assert.equal((await post(validBody, { origin: 'https://other.example' })).status, 403);
  assert.equal((await post(validBody, { 'content-type': 'application/json' })).status, 415);
  assert.equal((await post(`${validBody}&email=another%40example.com`)).status, 400);
  assert.equal((await post(`${validBody}&website=trap`)).status, 400);
  assert.equal((await post(`name=${'x'.repeat(16_385)}`)).status, 413);
  assert.deepEqual(await readdir(directory), []);

  const received = await post(validBody);
  assert.equal(received.status, 303);
  assert.equal(received.headers.Location, '/request-assessment/received');
  const [file] = await readdir(directory);
  const path = join(directory, file);
  const record = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(record.email, 'test@example.com');
  assert.equal(record.service, 'cloud-security');
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  for (let i = 0; i < 4; i++) await post('invalid');
  assert.equal((await post(validBody)).status, 429);
});
