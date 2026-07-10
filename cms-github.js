const crypto = require('crypto');

const ALLOWED_MEDIA_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function requirePost(req, res) {
  if (req.method === 'POST') return true;
  res.setHeader('Allow', 'POST');
  json(res, 405, { error: 'This action is not available.' });
  return false;
}

function requireGet(req, res) {
  if (req.method === 'GET') return true;
  res.setHeader('Allow', 'GET');
  json(res, 405, { error: 'This action is not available.' });
  return false;
}

function isAuthorized(req) {
  const expected = process.env.ADMIN_PASSWORD || process.env.CMS_PASSWORD;
  if (!expected) return false;
  const header = req.headers['x-admin-password'] || '';
  const auth = req.headers.authorization || '';
  const provided = header || (auth.startsWith('Bearer ') ? auth.slice(7) : '');
  return provided === expected;
}

function requireAuth(req, res) {
  if (isAuthorized(req)) return true;
  json(res, 401, { error: 'Please enter the editor password.' });
  return false;
}

function readRawBody(req, limitBytes = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    if (req.body !== undefined) {
      if (Buffer.isBuffer(req.body)) resolve(req.body.toString('utf8'));
      else resolve(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      return;
    }
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('The upload is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  return raw ? JSON.parse(raw) : {};
}

function githubConfig() {
  const rawToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const token = rawToken.replace(/^Bearer\s+/i, '').trim();
  const repo = process.env.GITHUB_REPO || [process.env.VERCEL_GIT_REPO_OWNER, process.env.VERCEL_GIT_REPO_SLUG].filter(Boolean).join('/');
  const branch = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main';
  if (!token) throw new Error('Missing GITHUB_TOKEN environment variable.');
  if (!repo || !repo.includes('/')) throw new Error('Missing GITHUB_REPO environment variable. Use owner/repository.');
  return { token, repo, branch };
}

async function githubRequest(path, options = {}) {
  const { token } = githubConfig();
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ulr-content-admin',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = body?.message || `GitHub request failed with status ${res.status}.`;
    if (/bad credentials/i.test(message)) {
      throw new Error('GitHub token was not accepted. Check GITHUB_TOKEN in Vercel.');
    }
    throw new Error(message);
  }
  return body;
}

async function readRepoFile(filePath) {
  const { repo, branch } = githubConfig();
  const encoded = filePath.split('/').map(encodeURIComponent).join('/');
  const data = await githubRequest(`/repos/${repo}/contents/${encoded}?ref=${encodeURIComponent(branch)}`);
  return {
    sha: data.sha,
    content: Buffer.from(data.content || '', 'base64').toString('utf8'),
    encoding: data.encoding
  };
}

async function writeRepoFile(filePath, content, message) {
  const { repo, branch } = githubConfig();
  const encoded = filePath.split('/').map(encodeURIComponent).join('/');
  let sha;
  try {
    sha = (await readRepoFile(filePath)).sha;
  } catch (err) {
    if (!/Not Found/i.test(err.message)) throw err;
  }
  return githubRequest(`/repos/${repo}/contents/${encoded}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      branch,
      content: Buffer.from(content).toString('base64'),
      ...(sha ? { sha } : {})
    })
  });
}

async function listRepoMedia() {
  const { repo, branch } = githubConfig();
  const items = await githubRequest(`/repos/${repo}/contents/uploads?ref=${encodeURIComponent(branch)}`);
  return (Array.isArray(items) ? items : [])
    .filter(item => item.type === 'file' && ALLOWED_MEDIA_EXTENSIONS.has(extname(item.name)))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(item => ({
      name: item.name,
      path: `uploads/${item.name}`,
      bytes: item.size || 0,
      modified: null
    }));
}

function extname(fileName) {
  const match = /\.([^.]+)$/.exec(fileName || '');
  return match ? `.${match[1].toLowerCase()}` : '';
}

function sanitizeFileName(name) {
  const ext = extname(name);
  const base = String(name || 'image')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'image';
  const safeExt = ALLOWED_MEDIA_EXTENSIONS.has(ext) ? ext : '.png';
  return `${base}-${crypto.randomBytes(4).toString('hex')}${safeExt}`;
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl || '');
  if (!match) throw new Error('Please choose a valid image file.');
  return Buffer.from(match[2], 'base64');
}

module.exports = {
  json,
  listRepoMedia,
  parseDataUrl,
  readJsonBody,
  readRepoFile,
  requireAuth,
  requireGet,
  requirePost,
  sanitizeFileName,
  writeRepoFile
};
