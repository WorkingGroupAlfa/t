# Render deployment

This project runs as one Node web service. The same process serves the public
website, `/admin.html`, the CMS API, and uploaded media.

## Persistent data

Render must attach a Persistent Disk at `/var/data`. The application stores:

- `/var/data/content.json`
- `/var/data/uploads/`
- `/var/data/backups/content/`

On the first start, `content.json` is copied from the repository to the empty
disk automatically. Bundled images remain in the repository; new uploads are
written to the disk. The server checks disk uploads first and bundled images
second when serving `/uploads/*`.

Do not deploy this CMS on a free Render web service. Free services cannot attach
a Persistent Disk, so content changes and uploads would be lost on restart.

## Blueprint deployment

1. Commit and push this repository.
2. In Render, choose **New > Blueprint**.
3. Connect `WorkingGroupAlfa/t`, branch `main`.
4. Render reads the root `render.yaml`.
5. Enter a strong value when Render asks for `ADMIN_PASSWORD`.
6. Review the paid Starter service and 1 GB Persistent Disk, then deploy.

After the service becomes live, verify:

- `/healthz` returns `{ "ok": true }`
- `/api/content` returns the website JSON
- `/admin.html` asks for `ADMIN_PASSWORD`
- saving creates a backup and updates `/var/data/content.json`
- uploaded PNG, JPEG, or WebP files remain after a manual restart

## Manual deployment values

If a Blueprint is not used, create a paid Node Web Service with:

- Build command: `npm install --omit=dev`
- Start command: `npm start`
- Health check path: `/healthz`
- Environment: `HOST=0.0.0.0`
- Environment: `DATA_DIR=/var/data`
- Secret: `ADMIN_PASSWORD=<strong password>`
- Persistent Disk mount path: `/var/data`
- Persistent Disk size: 1 GB

## Backups and operation

The application creates a content backup before every save and keeps the latest
50 copies. Render also snapshots Persistent Disks daily. Download a JSON backup
from the admin before major edits.

Because a Render Persistent Disk is attached to one service instance, keep this
service at one instance. This is appropriate for the current small website CMS.
