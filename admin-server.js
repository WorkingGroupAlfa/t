/* United Lifestyle Resort CMS server.
   One Node process serves the website, protected admin API, and persistent media.
   On Render, set DATA_DIR=/var/data and attach a Persistent Disk at /var/data. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = path.resolve(process.env.DATA_DIR || ROOT);
const CONTENT_SEED_FILE = path.join(ROOT, 'content.json');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const BUNDLED_UPLOADS_DIR = path.join(ROOT, 'uploads');
const PERSISTENT_UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const BACKUP_DIR = path.join(DATA_DIR, 'backups', 'content');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.CMS_PASSWORD || '';
const MAX_REQUEST_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_FAILURES = 10;
const authFailures = new Map();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const uploadMimeExtensions = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp']
]);
const listedMediaExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const publicFiles = new Set(['index.html', 'admin.html', 'app.js', 'content.json', 'media-manifest.json']);

function commonHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'same-origin'
  };
}

function send(res, status, body, type, headers = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body)
    ? body
    : JSON.stringify(body, null, 2);
  res.writeHead(status, {
    ...commonHeaders(),
    'Content-Type': type || (typeof body === 'object' && !Buffer.isBuffer(body) ? mime['.json'] : 'text/plain; charset=utf-8'),
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(payload);
}

function sendFile(req, res, file, cacheControl) {
  fs.stat(file, (statError, stat) => {
    if (statError || !stat.isFile()) return send(res, 404, 'Not found');
    const headers = {
      ...commonHeaders(),
      'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': cacheControl
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(file);
    stream.on('error', () => {
      if (!res.headersSent) send(res, 500, 'Could not read file');
      else res.destroy();
    });
    stream.pipe(res);
  });
}

function requestPath(req) {
  return new URL(req.url, 'http://localhost').pathname;
}

function safeJoin(root, requestPathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPathname);
  } catch (_) {
    return null;
  }
  const clean = decoded.replace(/^\/+/, '');
  const resolved = path.resolve(root, clean);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

function readBody(req, limitBytes = MAX_REQUEST_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    req.on('data', chunk => {
      if (settled) return;
      size += chunk.length;
      if (size > limitBytes) {
        settled = true;
        const error = new Error('Request body is too large.');
        error.statusCode = 413;
        reject(error);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', err => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function atomicWrite(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tempFile = `${file}.${process.pid}.${crypto.randomBytes(5).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(tempFile, data, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tempFile, file);
  } finally {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
}

function initializeStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(PERSISTENT_UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  if (!fs.existsSync(CONTENT_FILE)) {
    const seed = fs.existsSync(CONTENT_SEED_FILE)
      ? fs.readFileSync(CONTENT_SEED_FILE, 'utf8')
      : '{}\n';
    JSON.parse(seed);
    atomicWrite(CONTENT_FILE, seed.endsWith('\n') ? seed : `${seed}\n`);
    console.log(`Initialized CMS content at ${CONTENT_FILE}`);
  }
}

function ensureBackup() {
  if (!fs.existsSync(CONTENT_FILE)) return;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.copyFileSync(CONTENT_FILE, path.join(BACKUP_DIR, `content-${timestamp()}.json`));
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(name => /^content-.+\.json$/.test(name))
    .sort()
    .reverse();
  backups.slice(50).forEach(name => fs.unlinkSync(path.join(BACKUP_DIR, name)));
}

function scanMediaDirectory(directory, found) {
  if (!fs.existsSync(directory)) return;
  fs.readdirSync(directory).forEach(name => {
    if (!listedMediaExtensions.has(path.extname(name).toLowerCase())) return;
    const full = path.join(directory, name);
    const stat = fs.statSync(full);
    if (!stat.isFile()) return;
    found.set(name, {
      name,
      path: `uploads/${name}`,
      bytes: stat.size,
      modified: stat.mtime.toISOString()
    });
  });
}

function listMedia() {
  const found = new Map();
  scanMediaDirectory(BUNDLED_UPLOADS_DIR, found);
  if (PERSISTENT_UPLOADS_DIR !== BUNDLED_UPLOADS_DIR) {
    scanMediaDirectory(PERSISTENT_UPLOADS_DIR, found);
  }
  return Array.from(found.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function sanitizeFileName(name, extension) {
  const originalExtension = path.extname(name || '');
  const base = path.basename(name || 'image', originalExtension)
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'image';
  return `${base}-${crypto.randomBytes(5).toString('hex')}${extension}`;
}

function passwordMatches(provided) {
  if (!ADMIN_PASSWORD || !provided) return false;
  const expectedBytes = Buffer.from(ADMIN_PASSWORD);
  const providedBytes = Buffer.from(String(provided));
  return expectedBytes.length === providedBytes.length &&
    crypto.timingSafeEqual(expectedBytes, providedBytes);
}

function isAuthorized(req) {
  const header = req.headers['x-admin-password'];
  const authorization = req.headers.authorization || '';
  const provided = (Array.isArray(header) ? header[0] : header) ||
    (authorization.startsWith('Bearer ') ? authorization.slice(7) : '');
  return passwordMatches(provided);
}

function clientAddress(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return String(value || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

function authRecord(address) {
  const now = Date.now();
  for (const [key, value] of authFailures) {
    if (value.resetAt <= now) authFailures.delete(key);
  }
  return authFailures.get(address);
}

function requireAdmin(req, res) {
  if (!ADMIN_PASSWORD) {
    send(res, 503, { error: 'ADMIN_PASSWORD is not configured on the server.' });
    return false;
  }
  const address = clientAddress(req);
  const existing = authRecord(address);
  if (existing && existing.count >= AUTH_MAX_FAILURES) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - Date.now()) / 1000));
    return send(res, 429, { error: 'Too many password attempts. Please try again later.' }, null, {
      'Retry-After': retryAfter
    });
  }
  if (isAuthorized(req)) {
    authFailures.delete(address);
    return true;
  }
  const next = existing && existing.resetAt > Date.now()
    ? { count: existing.count + 1, resetAt: existing.resetAt }
    : { count: 1, resetAt: Date.now() + AUTH_WINDOW_MS };
  authFailures.set(address, next);
  send(res, 401, { error: 'Please enter the editor password.' });
  return false;
}

function parseUploadedImage(dataUrl) {
  const match = /^data:([^;]+);base64,([a-z0-9+/=\r\n]+)$/i.exec(dataUrl || '');
  if (!match) throw badRequest('Please choose a valid PNG, JPEG, or WebP image.');
  const contentType = match[1].toLowerCase();
  const extension = uploadMimeExtensions.get(contentType);
  if (!extension) throw badRequest('Only PNG, JPEG, and WebP uploads are allowed.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length) throw badRequest('The selected image is empty.');
  if (bytes.length > MAX_UPLOAD_BYTES) {
    const error = new Error('The image is too large. Maximum size is 12 MB.');
    error.statusCode = 413;
    throw error;
  }
  return { bytes, extension };
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function handleApi(req, res) {
  const pathname = requestPath(req);
  try {
    if (req.method === 'GET' && (pathname === '/healthz' || pathname === '/api/health')) {
      return send(res, 200, { ok: true });
    }

    if (req.method === 'GET' && pathname === '/api/content') {
      const text = fs.readFileSync(CONTENT_FILE, 'utf8');
      JSON.parse(text);
      return send(res, 200, text, mime['.json']);
    }

    if (req.method === 'POST' && pathname === '/api/content') {
      if (!requireAdmin(req, res)) return;
      const parsed = JSON.parse(await readBody(req));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return send(res, 400, { error: 'Website content must be a JSON object.' });
      }
      ensureBackup();
      atomicWrite(CONTENT_FILE, `${JSON.stringify(parsed, null, 2)}\n`);
      return send(res, 200, { ok: true, saved: true, version: Date.now() });
    }

    if (req.method === 'GET' && pathname === '/api/media') {
      if (!requireAdmin(req, res)) return;
      return send(res, 200, { media: listMedia() });
    }

    if (req.method === 'POST' && pathname === '/api/upload') {
      if (!requireAdmin(req, res)) return;
      const body = JSON.parse(await readBody(req));
      const image = parseUploadedImage(body.dataUrl);
      const fileName = sanitizeFileName(body.fileName, image.extension);
      const full = path.join(PERSISTENT_UPLOADS_DIR, fileName);
      fs.mkdirSync(PERSISTENT_UPLOADS_DIR, { recursive: true });
      fs.writeFileSync(full, image.bytes, { mode: 0o600, flag: 'wx' });
      return send(res, 200, {
        ok: true,
        path: `uploads/${fileName}`,
        media: listMedia()
      });
    }

    if (req.method === 'POST' && pathname === '/api/backup') {
      if (!requireAdmin(req, res)) return;
      ensureBackup();
      return send(res, 200, { ok: true });
    }

    if (pathname.startsWith('/api/')) {
      return send(res, 404, { error: 'API route not found.' });
    }
    return false;
  } catch (err) {
    const status = err.statusCode || (err instanceof SyntaxError ? 400 : 500);
    return send(res, status, { error: err.message || String(err) });
  }
}

function serveUpload(req, res, pathname) {
  const relativePath = pathname.slice('/uploads/'.length);
  if (!relativePath) return send(res, 404, 'Not found');
  const persistentFile = safeJoin(PERSISTENT_UPLOADS_DIR, relativePath);
  if (!persistentFile) return send(res, 403, 'Forbidden');
  if (fs.existsSync(persistentFile)) {
    return sendFile(req, res, persistentFile, 'public, max-age=31536000, immutable');
  }
  const bundledFile = safeJoin(BUNDLED_UPLOADS_DIR, relativePath);
  if (!bundledFile) return send(res, 403, 'Forbidden');
  return sendFile(req, res, bundledFile, 'public, max-age=86400');
}

function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return send(res, 405, 'Method not allowed');
  }
  const pathname = requestPath(req);
  if (pathname.startsWith('/uploads/')) return serveUpload(req, res, pathname);
  const publicName = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  if (!publicFiles.has(publicName)) return send(res, 404, 'Not found');
  const file = publicName === 'content.json'
    ? CONTENT_FILE
    : safeJoin(ROOT, publicName);
  if (!file) return send(res, 403, 'Forbidden');
  const cacheControl = /\.(png|jpe?g|webp|svg|ico)$/i.test(publicName)
    ? 'public, max-age=86400'
    : 'no-cache';
  return sendFile(req, res, file, cacheControl);
}

initializeStorage();

const server = http.createServer(async (req, res) => {
  const pathname = requestPath(req);
  if (pathname === '/healthz' || pathname.startsWith('/api/')) {
    const handled = await handleApi(req, res);
    if (handled !== false) return;
  }
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`CMS server listening on http://${HOST}:${PORT}`);
  console.log(`Content storage: ${CONTENT_FILE}`);
  if (!ADMIN_PASSWORD) {
    console.warn('ADMIN_PASSWORD is not set. The editor is read-only until it is configured.');
  }
});

function shutdown(signal) {
  console.log(`Received ${signal}; closing HTTP server.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
