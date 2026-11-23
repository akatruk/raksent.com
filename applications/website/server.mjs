import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { access, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pagePaths, renderForm, renderNotFound, renderPage, services } from './pages.mjs';

const publicOrigin = 'https://raksent.com';
const serviceNames = new Set([...services.map(({slug}) => slug), 'other']);
const assetSpecs = [
  ['/assets/site.css', 'site.css', 'text/css; charset=utf-8'],
  ['/assets/theme.js', 'theme.js', 'text/javascript; charset=utf-8'],
];
const assets = new Map(await Promise.all(assetSpecs.map(async ([path, file, type]) => [
  path, [type, await readFile(new URL(`./public/${file}`, import.meta.url))],
])));
const headers = {
  'Content-Security-Policy': "default-src 'none'; style-src 'self'; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function send(req, res, status, body, type = 'text/html; charset=utf-8') {
  res.writeHead(status, {
    ...headers,
    'Content-Type': type,
    'Cache-Control': status === 200 && req.url.startsWith('/assets/') ? 'public, max-age=3600' : 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

export function validateInquiry(body) {
  const data = new URLSearchParams(body);
  if (data.get('website')) return null;
  const limits = { name: 120, email: 254, organization: 160, service: 100, message: 3000 };
  const result = {};
  for (const [key, max] of Object.entries(limits)) {
    if (data.getAll(key).length !== 1) return null;
    const value = data.get(key).trim();
    if (!value || value.length > max || value.includes('\u0000')) return null;
    result[key] = value;
  }
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result.email)) return null;
  if (result.message.length < 15 || !serviceNames.has(result.service)) return null;
  return result;
}

async function readBody(req, limit) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) {
      req.resume();
      return null;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function website({ origin = publicOrigin, leadDirectory, trustProxy = false } = {}) {
  let windowStarted = 0;
  let totalPosts = 0;
  let storing = false;
  const perAddress = new Map();

  function allowPost(req) {
    if (Date.now() - windowStarted >= 60_000) {
      windowStarted = Date.now();
      totalPosts = 0;
      perAddress.clear();
    }
    if (totalPosts >= 40) return false;
    const forwarded = req.headers['x-forwarded-for'];
    const address = trustProxy && typeof forwarded === 'string' && isIP(forwarded)
      ? forwarded : req.socket.remoteAddress || 'local';
    const count = perAddress.get(address) || 0;
    if (count >= 8) return false;
    perAddress.set(address, count + 1);
    totalPosts++;
    return true;
  }

  async function serve(req, res) {
    const url = new URL(req.url, origin);
    const path = url.pathname;
    if (req.method === 'POST' && path === '/request-assessment') {
      const reply = (code, error) => send(req, res, code, renderForm({ error, enabled: !!leadDirectory }));
      if (!leadDirectory) return reply(503, 'Inquiries are temporarily unavailable.');
      if (req.headers.origin !== origin) return reply(403, 'Open the assessment page and submit the form again.');
      if (req.headers['content-type']?.split(';')[0] !== 'application/x-www-form-urlencoded') {
        return reply(415, 'Use the assessment form to send an inquiry.');
      }
      if (!allowPost(req)) {
        res.setHeader('Retry-After', '60');
        return reply(429, 'Too many submissions. Please try again in one minute.');
      }
      const body = await readBody(req, 16_384);
      if (body === null) return reply(413, 'The submitted form is too large.');
      const inquiry = validateInquiry(body);
      if (!inquiry) return reply(400, 'Check the required fields and use a valid work email.');
      if (storing) return reply(503, 'Please retry in a moment.');
      storing = true;
      try {
        if ((await readdir(leadDirectory)).length >= 1000) {
          return reply(503, 'Inquiries are temporarily unavailable.');
        }
        const id = randomUUID();
        const temporary = join(leadDirectory, `.${id}.tmp`);
        const destination = join(leadDirectory, `${id}.json`);
        try {
          await writeFile(temporary, JSON.stringify({ id, receivedAt: new Date().toISOString(), ...inquiry }), { mode: 0o600, flag: 'wx', flush: true });
          await rename(temporary, destination);
        } catch (error) {
          await rm(temporary, { force: true }).catch(() => {});
          throw error;
        }
        res.writeHead(303, { ...headers, 'Cache-Control': 'no-store', Location: '/request-assessment/received' });
        return res.end();
      } finally {
        storing = false;
      }
    }

    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', path === '/request-assessment' ? 'GET, HEAD, POST' : 'GET, HEAD');
      return send(req, res, 405, 'Method not allowed', 'text/plain; charset=utf-8');
    }
    if (path === '/healthz' || path === '/readyz') {
      if (path === '/readyz' && leadDirectory) {
        const ready = await access(leadDirectory, constants.W_OK).then(() => true, () => false);
        if (!ready) return send(req, res, 503, 'unavailable\n', 'text/plain; charset=utf-8');
      }
      return send(req, res, 200, 'ok\n', 'text/plain; charset=utf-8');
    }
    if (assets.has(path)) {
      const [type, body] = assets.get(path);
      return send(req, res, 200, body, type);
    }
    if (path === '/robots.txt') {
      return send(req, res, 200, `User-agent: *\nDisallow: /request-assessment/received\nSitemap: ${publicOrigin}/sitemap.xml\n`, 'text/plain; charset=utf-8');
    }
    if (path === '/sitemap.xml') {
      return send(req, res, 200, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pagePaths.map(item => `<url><loc>${publicOrigin}${item}</loc></url>`).join('')}</urlset>`, 'application/xml; charset=utf-8');
    }
    if (path === '/request-assessment') {
      return send(req, res, 200, renderForm({ selected: url.searchParams.get('service'), enabled: !!leadDirectory }));
    }
    if (path === '/request-assessment/received') {
      res.setHeader('X-Robots-Tag', 'noindex');
      return send(req, res, 200, renderForm({ status: 'Your inquiry has been received.' }));
    }
    const page = renderPage(path);
    return send(req, res, page ? 200 : 404, page || renderNotFound());
  }

  return createServer({ requestTimeout: 12_000, headersTimeout: 8000, maxHeaderSize: 8192 }, (req, res) => {
    serve(req, res).catch(error => {
      console.error('Website request failed', { code: error.code || 'INTERNAL' });
      if (res.headersSent) {
        res.destroy();
        return;
      }
      send(req, res, 500, 'The request could not be completed.', 'text/plain; charset=utf-8');
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const origin = new URL(process.env.PUBLIC_ORIGIN || publicOrigin).origin;
  const leadDirectory = process.env.LEAD_DIR;
  if (leadDirectory) await access(leadDirectory, constants.W_OK);
  const port = Number(process.env.PORT || 8080);
  website({ origin, leadDirectory, trustProxy: process.env.TRUST_PROXY === '1' }).listen(port, process.env.HOST || '127.0.0.1');
}
