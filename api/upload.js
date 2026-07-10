const { json, listRepoMedia, parseDataUrl, readJsonBody, requireAuth, requirePost, sanitizeFileName, writeRepoFile } = require('../cms-github');

module.exports = async function handler(req, res) {
  try {
    if (!requireAuth(req, res)) return;
    if (!requirePost(req, res)) return;

    const body = await readJsonBody(req);
    const fileName = sanitizeFileName(body.fileName);
    const bytes = parseDataUrl(body.dataUrl);
    const filePath = `uploads/${fileName}`;

    await writeRepoFile(filePath, bytes, `Upload website image ${fileName}`);
    json(res, 200, { ok: true, path: filePath, media: await listRepoMedia() });
  } catch (err) {
    json(res, 500, { error: err.message || String(err) });
  }
};
