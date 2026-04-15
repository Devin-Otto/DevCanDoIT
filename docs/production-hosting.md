# Production Hosting

DevCanDoIt is deployed as a public site with private support services.

## High-level setup

- Cloudflare provides DNS and CDN
- Railway hosts the public web service and background worker
- Large media can use bucket storage, with a local filesystem fallback for development

## Environment categories

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_PUBLIC_SITE_ONLY=true`
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
