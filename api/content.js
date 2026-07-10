const { json, readJsonBody, readRepoFile, requireAuth, requireGet, requirePost, writeRepoFile } = require('../cms-github');

module.exports = async function handler(req, res) {
  try {
    if (!requireAuth(req, res)) return;

    if (req.method === 'GET') {
      if (!requireGet(req, res)) return;
      const file = await readRepoFile('content.json');
      json(res, 200, JSON.parse(file.content || '{}'));
      return;
    }

    if (!requirePost(req, res)) return;
    const nextContent = await readJsonBody(req);
    await writeRepoFile(
      'content.json',
      `${JSON.stringify(nextContent, null, 2)}\n`,
      'Update website content from admin'
    );
    json(res, 200, { ok: true, saved: true });
  } catch (err) {
    json(res, 500, { error: err.message || String(err) });
  }
};
