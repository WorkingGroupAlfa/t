/* Local CMS server for United Lifestyle Resort Traralgon.
   Uses only Node built-ins: static files, content.json save/load, media upload. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const CONTENT_FILE = path.join(ROOT, 'content.json');
const UPLOADS_DIR = path.join(ROOT, 'uploads');
const BACKUP_DIR = path.join(ROOT, 'backups', 'content');

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

function send(res, status, body, type) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': type || (typeof body === 'object' && !Buffer.isBuffer(body) ? mime['.json'] : 'text/plain; charset=utf-8'),
    'Cache-Control': 'no-store'
  });
  res.end(payload);
}

function safeJoin(root, requestPath) {
  const clean = decodeURIComponent(requestPath.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const resolved = path.resolve(root, clean);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

function readBody(req, limitBytes = 60 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('Request body is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function ensureBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  if (fs.existsSync(CONTENT_FILE)) {
    fs.copyFileSync(CONTENT_FILE, path.join(BACKUP_DIR, `content-${timestamp()}.json`));
  }
}

function listMedia() {
  if (!fs.existsSync(UPLOADS_DIR)) return [];
  const allowed = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
  return fs.readdirSync(UPLOADS_DIR)
    .filter(name => allowed.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map(name => {
      const full = path.join(UPLOADS_DIR, name);
      const st = fs.statSync(full);
      return { name, path: `uploads/${name}`, bytes: st.size, modified: st.mtime.toISOString() };
    });
}

function sanitizeFileName(name) {
  const ext = path.extname(name || '').toLowerCase();
  const base = path.basename(name || 'image', ext)
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'image';
  const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext) ? ext : '.png';
  return `${base}-${crypto.randomBytes(4).toString('hex')}${safeExt}`;
}

async function handleApi(req, res) {
  try {
    if (req.method === 'GET' && req.url === '/api/content') {
      const text = fs.existsSync(CONTENT_FILE) ? fs.readFileSync(CONTENT_FILE, 'utf8') : '{}';
      return send(res, 200, text, mime['.json']);
    }

    if (req.method === 'POST' && req.url === '/api/content') {
      const body = await readBody(req);
      const parsed = JSON.parse(body);
      ensureBackup();
      fs.writeFileSync(CONTENT_FILE, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
      return send(res, 200, { ok: true, saved: 'content.json' });
    }

    if (req.method === 'GET' && req.url === '/api/media') {
      return send(res, 200, { media: listMedia() });
    }

    if (req.method === 'POST' && req.url === '/api/upload') {
      const body = JSON.parse(await readBody(req));
      const match = /^data:([^;]+);base64,(.+)$/i.exec(body.dataUrl || '');
      if (!match) return send(res, 400, { error: 'Expected a base64 data URL.' });
      const fileName = sanitizeFileName(body.fileName);
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      const full = path.join(UPLOADS_DIR, fileName);
      fs.writeFileSync(full, Buffer.from(match[2], 'base64'));
      return send(res, 200, { ok: true, path: `uploads/${fileName}`, media: listMedia() });
    }

    if (req.method === 'POST' && req.url === '/api/backup') {
      ensureBackup();
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: 'API route not found.' });
  } catch (err) {
    return send(res, 500, { error: err.message || String(err) });
  }
}

function serveStatic(req, res) {
  const file = safeJoin(ROOT, req.url === '/' ? '/index.html' : req.url);
  if (!file) return send(res, 403, 'Forbidden');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, data, mime[path.extname(file).toLowerCase()] || 'application/octet-stream');
  });
}

http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return handleApi(req, res);
  serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`Local admin server running: http://localhost:${PORT}/admin.html`);
  console.log(`Site preview: http://localhost:${PORT}/index.html`);
});
