import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
  assert.equal((await request(server, '/assets/site.js')).headers['Content-Type'], 'text/javascript; charset=utf-8');
  assert.equal((await request(server, '/request-assessment/received')).status, 404);
  assert.equal((await request(server, '/readyz')).status, 200);
  assert.equal((await request(server, '/version')).body, 'development\n');
  const revision = 'a'.repeat(40);
  const released = await request(website({ revision }), '/version');
  assert.equal(released.body, `${revision}\n`);
  assert.equal(released.headers['Cache-Control'], 'no-store');
  assert.equal((await request(server, '/unavailable')).status, 404);
  assert.equal((await request(server, '/', { method: 'HEAD' })).body, undefined);
  assert.equal((await request(server, '/', { method: 'DELETE' })).status, 405);
});

test('pages load versioned self-hosted assets and keep scripts and styles out of the markup', async () => {
  const server = website({ leadDirectory: 'unused-by-get' });
  const pages = await Promise.all([...pagePaths, '/missing'].map(path => request(server, path)));
  for (const { body } of pages) {
    assert.doesNotMatch(body, /\sstyle=|<style|<script(?![^>]*\ssrc=)|\son[a-z]+=|javascript:|undefined/i);
    assert.match(body, /<script src="\/assets\/theme\.js\?v=[0-9a-f]{12}"><\/script>\n<link rel="stylesheet" href="\/assets\/site\.css\?v=[0-9a-f]{12}">\n<script src="\/assets\/site\.js\?v=[0-9a-f]{12}" defer><\/script>/);
  }
  for (const file of ['site.css', 'theme.js', 'site.js']) {
    const content = await readFile(new URL(`../applications/website/public/${file}`, import.meta.url));
    const path = `/assets/${file}?v=${createHash('sha256').update(content).digest('hex').slice(0, 12)}`;
    assert.ok(pages[0].body.includes(`"${path}"`), file);
    const asset = await request(server, path);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers['Cache-Control'], 'public, max-age=3600');
    assert.equal(asset.body, content.toString());
  }
});

test('the main navigation is reachable on every screen size without scripts', async () => {
  const server = website({ leadDirectory: 'unused-by-get' });
  for (const path of pagePaths) {
    const { body } = await request(server, path);
    const desktop = body.match(/<nav class="site-nav" aria-label="Main navigation">([\s\S]*?)<\/nav>/)?.[1];
    const menu = body.match(/<details class="menu"><summary aria-label="Menu">[\s\S]*?<nav aria-label="Menu">([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(desktop, path);
    assert.equal(menu, desktop, path);
    for (const href of ['/services', '/methodology', '/about', '/contact']) assert.ok(desktop.includes(`href="${href}"`), path);
  }
  const { body } = await request(server, '/services/devsecops');
  assert.match(body, /aria-label="Main navigation"><a href="\/services" aria-current="page">Services<\/a>/);
  assert.match(body, /<a href="\/services">Security services<\/a><\/li><li><a href="\/services\?group=harden">Harden systems<\/a>/);
});

test('calls to action on the inquiry page keep a started inquiry instead of reloading it', async () => {
  for (const server of [website({ leadDirectory: 'unused-by-get' }), website()]) {
    const { body } = await request(server, '/request-assessment');
    assert.match(body, /<section class="shell section form-layout" id="inquiry">/);
    const targets = [...body.matchAll(/href="([^"]+)"[^>]*>Request an assessment<\/a>/g)].map(match => match[1]);
    assert.equal(targets.length, 3);
    assert.deepEqual(new Set(targets), new Set(['#inquiry']));
  }
  const { body } = await request(website(), '/about');
  assert.match(body, /class="button button-small header-cta" href="\/request-assessment">Request an assessment<\/a>/);
});

test('service cards expose one link each with a decorative icon and action label', async () => {
  const { body } = await request(website(), '/');
  const cards = body.match(/<article class="card">[\s\S]*?<\/article>/g);
  assert.equal(cards.length, services.length);
  for (const card of cards) {
    assert.equal(card.match(/<a /g).length, 1);
    assert.match(card, /<h3><a class="card-link" href="\/services\/[a-z-]+">/);
    assert.match(card, /<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><(path|circle) /);
    assert.match(card, /<span class="card-action" aria-hidden="true">View service<\/span>/);
  }
});

test('the not-found page is neither indexed nor canonicalized', async () => {
  const { status, body } = await request(website(), '/missing');
  assert.equal(status, 404);
  assert.match(body, /name="robots" content="noindex,follow"/);
  assert.doesNotMatch(body, /rel="canonical"|og:url/);
  assert.match(body, /href="\/">Return to the home page<\/a>/);
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

test('visitors can follow the server-rendered journey and receive the saved inquiry reference', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'raksent-journey-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const server = website({ leadDirectory: directory });

  const home = await request(server, '/');
  const catalogPath = home.body.match(/href="([^"]+)">Explore services<\/a>/)?.[1];
  assert.equal(catalogPath, '/services');

  const catalog = await request(server, catalogPath);
  const filterPath = catalog.body.match(/href="([^"]+)">Harden systems<\/a>/)?.[1];
  assert.equal(filterPath, '/services?group=harden');
  const filtered = await request(server, filterPath);
  const servicePath = filtered.body.match(/href="([^"]+)">Cloud Security<\/a>/)?.[1];
  assert.equal(servicePath, '/services/cloud-security');

  const service = await request(server, servicePath);
  const intro = service.body.match(/<section class="page-intro">[\s\S]+?<\/section>/)?.[0];
  const assessmentPath = intro?.match(/href="([^"]+)">Request an assessment<\/a>/)?.[1];
  assert.equal(assessmentPath, '/request-assessment?service=cloud-security');
  assert.match(service.body, /What we cover[\s\S]+What you receive[\s\S]+After you request an assessment/);

  const assessment = await request(server, assessmentPath);
  assert.match(assessment.body, /value="cloud-security" selected/);
  assert.match(assessment.body, /<select id="service" name="service" required>/);
  assert.match(assessment.body, /All fields are required/);
  assert.match(assessment.body, /omit credentials, customer data and technical evidence/);

  const inquiry = new URLSearchParams(validBody);
  inquiry.set('service', 'devsecops');
  inquiry.set('message', 'short');
  const post = () => request(server, '/request-assessment', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/x-www-form-urlencoded' },
    body: inquiry.toString(),
  });

  const invalid = await post();
  assert.equal(invalid.status, 400);
  assert.match(invalid.body, /href="#message"/);
  assert.match(invalid.body, /value="devsecops" selected/);
  assert.match(invalid.body, />short<\/textarea>/);
  assert.deepEqual(await readdir(directory), []);

  inquiry.set('message', 'Review our synthetic CI workflows.');
  const accepted = await post();
  assert.equal(accepted.status, 303);
  const confirmation = await request(server, accepted.headers.Location);
  const reference = confirmation.body.match(/<code>([a-f0-9-]+)<\/code>/)?.[1];
  assert.ok(reference);
  assert.equal(confirmation.status, 200);
  assert.match(confirmation.body, /Inquiry reference/);
  assert.match(confirmation.body, /name="robots" content="noindex,follow"/);
  assert.match(confirmation.body, new RegExp(`rel="canonical" href="${origin}/request-assessment"`));
  const [record] = await readdir(directory);
  assert.equal(record, `${reference}.json`);
  const saved = JSON.parse(await readFile(join(directory, record), 'utf8'));
  assert.equal(saved.id, reference);
  assert.equal(saved.service, 'devsecops');
});
