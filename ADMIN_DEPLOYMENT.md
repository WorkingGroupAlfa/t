# Online Admin Setup

The editor at `/admin.html` uses Vercel API routes and commits changes back to GitHub.

Add these environment variables in the Vercel project:

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | Password people use to unlock the website editor |
| `GITHUB_TOKEN` | GitHub fine-grained token with contents read/write access to this repo |
| `GITHUB_REPO` | `WorkingGroupAlfa/t` |
| `GITHUB_BRANCH` | `main` |

After saving content or uploading an image, the API commits to GitHub. If the Vercel project is connected to GitHub, Vercel will publish the updated site after the normal deployment finishes.

For the GitHub token, grant only the minimum access needed:

- Repository: `WorkingGroupAlfa/t`
- Permission: Contents, read and write

Do not commit real passwords or tokens to the repository.
