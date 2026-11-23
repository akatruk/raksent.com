import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { validateInquiry, website } from '../applications/website/server.mjs';
import { pagePaths } from '../applications/website/pages.mjs';
import { serviceGroups, services } from '../applications/website/services.mjs';

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
  assert.equal((await request(server, '/assets/perimeter.jpg')).headers['Content-Type'], 'image/jpeg');
  assert.equal((await request(server, '/assets/mark.svg')).headers['Content-Type'], 'image/svg+xml');
  assert.equal((await request(server, '/request-assessment/received')).status, 404);
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
  assert.equal((await post(`name=${'x'.repeat(40_961)}`)).status, 413);
  assert.deepEqual(await readdir(directory), []);

  const received = await post(validBody);
  assert.equal(received.status, 303);
  assert.match(received.headers.Location, /^\/request-assessment\/received\?reference=[0-9a-f-]{36}$/);
  const [file] = await readdir(directory);
  const path = join(directory, file);
  const record = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(record.email, 'test@example.com');
  assert.equal(record.service, 'cloud-security');
  assert.equal(record.name, validateInquiry(validBody).name);
  assert.equal(new URL(received.headers.Location, origin).searchParams.get('reference'), record.id);
  const receipt = await request(website({ leadDirectory: directory }), received.headers.Location);
  assert.equal(receipt.status, 200);
  assert.equal(receipt.headers['X-Robots-Tag'], 'noindex');
  assert.equal(receipt.headers['Cache-Control'], 'no-store');
  assert.match(receipt.body, /Inquiry received/);
  assert.ok(receipt.body.includes(record.id));
  assert.ok(!receipt.body.includes(record.email));
  assert.equal((await request(server, '/request-assessment/received?reference=bf8d2d17-3eb3-4ecc-ab92-680bad1c40f7')).status, 404);
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  for (let i = 0; i < 4; i++) await post('invalid');
  assert.equal((await post(validBody)).status, 429);
});

test('catalog filtering and service detail links carry the selected service into the form', async () => {
  const server = website({ leadDirectory: 'unused-by-get' });
  for (const group of serviceGroups) {
    const result = await request(server, `/services?group=${group.slug}`);
    assert.equal(result.status, 200);
    assert.match(result.body, new RegExp(`group=${group.slug}" aria-current="page"`));
    for (const service of services) {
      assert.equal(result.body.includes(`href="/services/${service.slug}"`), service.group === group.slug);
    }
  }
  for (const service of services) {
    const result = await request(server, `/services/${service.slug}`);
    const formPath = `/request-assessment?service=${service.slug}`;
    assert.ok(result.body.includes(`href="${formPath}"`));
    const form = await request(server, formPath);
    assert.ok(form.body.includes(`value="${service.slug}" selected`));
  }
  assert.match((await request(server, '/services?group=unknown')).body, /href="\/services" aria-current="page">All services/);
  assert.match((await request(server, '/request-assessment?service=other')).body, /value="other" selected/);
});

test('invalid submissions show field errors and preserve only escaped values', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'raksent-errors-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const server = website({ leadDirectory: directory });
  const body = new URLSearchParams(validBody);
  body.set('email', 'invalid-address');
  body.set('organization', 'A "<quoted>" organization');
  body.set('message', 'short');
  const result = await request(server, '/request-assessment', {
    method: 'POST', body: body.toString(),
    headers: { origin, 'content-type': 'application/x-www-form-urlencoded' },
  });
  assert.equal(result.status, 400);
  assert.match(result.body, /aria-invalid="true" aria-describedby="email-error"/);
  assert.match(result.body, /aria-invalid="true" aria-describedby="message-error"/);
  assert.ok(result.body.includes('A &quot;&lt;quoted&gt;&quot; organization'));
  assert.ok(!result.body.includes('<quoted>'));
  assert.ok(result.body.includes('value="cloud-security" selected'));
  assert.deepEqual(await readdir(directory), []);
});
