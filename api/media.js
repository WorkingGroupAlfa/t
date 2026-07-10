const { json, listRepoMedia, requireAuth, requireGet } = require('../cms-github');

module.exports = async function handler(req, res) {
  try {
    if (!requireAuth(req, res)) return;
    if (!requireGet(req, res)) return;
    json(res, 200, { media: await listRepoMedia() });
  } catch (err) {
    json(res, 500, { error: err.message || String(err) });
  }
};
