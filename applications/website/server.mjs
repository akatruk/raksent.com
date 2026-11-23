import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { access, lstat, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pagePaths, publicOrigin, renderForm, renderNotFound, renderPage } from './pages.mjs';
import { services } from './services.mjs';

const serviceNames = new Set([...services.map(({ slug }) => slug), 'other']);
const inquiryFields = {
  name: { label: 'name', maximum: 120 },
  email: { label: 'work email', maximum: 254 },
  organization: { label: 'organization', maximum: 160 },
  service: { label: 'service', maximum: 100 },
  message: { label: 'assessment description', maximum: 3000 },
};
const receiptPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const assetSpecs = [
  ['/assets/site.css', 'site.css', 'text/css; charset=utf-8'],
  ['/assets/theme.js', 'theme.js', 'text/javascript; charset=utf-8'],
  ['/assets/mark.svg', 'mark.svg', 'image/svg+xml'],
  ['/assets/perimeter.jpg', 'perimeter.jpg', 'image/jpeg'],
];
const assets = new Map(await Promise.all(assetSpecs.map(async ([path, file, type]) => [
  path, [type, await readFile(new URL(`./public/${file}`, import.meta.url))],
])));
const headers = {
  'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'self'; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
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

function parseInquiry(body) {
  const data = new URLSearchParams(body);
  if (data.getAll('website').some(Boolean)) return null;

  const values = {};
  const errors = {};
  for (const [name, { label, maximum }] of Object.entries(inquiryFields)) {
    const entries = data.getAll(name);
    const value = entries[0]?.trim();
    if (!value || entries.length !== 1 || value.includes('\u0000')) {
      errors[name] = `Enter a valid ${label}.`;
    } else if (value.length > maximum) {
      values[name] = value.slice(0, maximum);
      errors[name] = `Use up to ${maximum} characters.`;
    } else {
      values[name] = value;
    }
  }
  if (!errors.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!errors.message && values.message.length < 15) {
    errors.message = 'Describe what you want to assess in at least 15 characters.';
  }
  if (!errors.service && !serviceNames.has(values.service)) {
    errors.service = 'Choose a service from the list.';
  }
  return { values, errors };
}

export function validateInquiry(body) {
  const parsed = parseInquiry(body);
  return parsed && !Object.keys(parsed.errors).length ? parsed.values : null;
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
      const reply = (code, error, form = {}) => send(req, res, code, renderForm({
        error, enabled: !!leadDirectory, ...form,
      }));
      if (!leadDirectory) return reply(503, 'Inquiries are temporarily unavailable.');
      if (req.headers.origin !== origin) return reply(403, 'Open the assessment page and submit the form again.');
      if (req.headers['content-type']?.split(';')[0] !== 'application/x-www-form-urlencoded') {
        return reply(415, 'Use the assessment form to send an inquiry.');
      }
      if (!allowPost(req)) {
        res.setHeader('Retry-After', '60');
        return reply(429, 'Too many submissions. Please try again in one minute.');
      }
      const body = await readBody(req, 40_960);
      if (body === null) return reply(413, 'The submitted form is too large.');
      const form = parseInquiry(body);
      if (!form) return reply(400, 'Reload the assessment form and try again.');
      if (Object.keys(form.errors).length) return reply(400, '', form);

      const inquiry = form.values;
      if (storing) return reply(503, 'Please retry in a moment.', { values: inquiry });
      storing = true;
      try {
        if ((await readdir(leadDirectory)).length >= 1000) {
          return reply(503, 'Inquiries are temporarily unavailable.', { values: inquiry });
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
        res.writeHead(303, {
          ...headers, 'Cache-Control': 'no-store', Location: `/request-assessment/received?reference=${id}`,
        });
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
      const service = url.searchParams.get('service');
      return send(req, res, 200, renderForm({
        values: { service: serviceNames.has(service) ? service : '' }, enabled: !!leadDirectory,
      }));
    }
    if (path === '/request-assessment/received') {
      res.setHeader('X-Robots-Tag', 'noindex');
      const reference = url.searchParams.get('reference') || '';
      const exists = leadDirectory && receiptPattern.test(reference) &&
        await lstat(join(leadDirectory, `${reference}.json`)).then(stat => stat.isFile(), () => false);
      return exists
        ? send(req, res, 200, renderForm({ receipt: reference }))
        : send(req, res, 404, renderNotFound());
    }
    const page = renderPage(path, { group: url.searchParams.get('group') });
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
