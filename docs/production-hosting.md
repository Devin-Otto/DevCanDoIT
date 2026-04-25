# Production Hosting

DevCanDoIt is deployed as a public site with private support services.

## High-level setup

- Cloudflare provides DNS and CDN
- Railway hosts the public web service and background worker
- TileOS can run as a second Railway service and be proxied into `/tileos/app`
- Large media can use bucket storage, with a local filesystem fallback for development

## Railway service config

- The public web service should use `/railway.web.json`
- The lead worker service should use `/railway.worker.json`
- The worker build command should stay `npm ci` so Railway does not run `next build` for the background worker
- The web service still needs `NEXT_PUBLIC_SITE_URL` set in production because the site build now fails fast when that value is missing

## Environment categories

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_PUBLIC_SITE_ONLY=true`
- `TILEOS_INTERNAL_URL` if `/tileos/app` proxies to the TileOS container
- `LEAD_DATABASE_URL`
- `LEAD_DATABASE_AUTH_TOKEN`
- `LEAD_ENCRYPTION_KEY`
- `ADMIN_*`
- `GMAIL_*`
- `VIDEO_ASSET_ROOT` or `VIDEO_BUCKET_*`
- `VENUS_GATE_*` if the protected Venus gate is enabled

## Operational notes

- Keep private values out of git and out of public docs.
- Keep detailed internal notes in the ignored onboarding doc.
- Run `npm run lint` and `npm run build` before every deploy.
