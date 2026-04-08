# DevCanDoIt

Marketing site and lead funnel for Devin Otto's portfolio + consulting business.

## Stack

- Next.js App Router
- React + TypeScript
- Nodemailer contact pipeline

## Official hosting stack

- Domain registrar: Cloudflare Registrar, with Porkbun as the fallback
- DNS/CDN: Cloudflare
- Public website host: Railway web service
- Background worker: Railway worker service
- Production lead database: libsql/Turso
- Lead-at-rest encryption key: `LEAD_ENCRYPTION_KEY`
- Video storage: `VIDEO_BUCKET_*` for large files, with `VIDEO_ASSET_ROOT` as the local filesystem fallback and profile-photo volume root
- Railway config files: `railway.web.json` and `railway.worker.json`

See [docs/production-hosting.md](./docs/production-hosting.md) for the deploy checklist and environment variables.

## VENUS integration

- Keep the `Venus` source in its own **private** repo.
- This public website repo should only contain the compiled Venus web build under `public/Venus/`.
- From this repo, run `npm run sync:venus` to build the private Venus repo for `/Venus` and copy the generated files into the public site.
- Commit the updated `public/Venus/` files here so Railway can deploy them.

## Local setup

1. Run `npm run setup:env`
2. Add your Gmail app password to `GMAIL_APP_PASSWORD` if you want contact form email delivery
3. Install dependencies with `npm install`
4. Start the dev server with `npm run dev`

The setup script seeds `.env.local` with generated admin/session/encryption values so you do not need to hardcode secrets in the repo. You can pass `--username`, `--password`, or `--force` to control the generated login if you want to override the defaults.

## Pre-deploy checklist

- `npm run lint` passes
- `npm run build` passes
- `NEXT_PUBLIC_SITE_URL` points at the live domain
- `NEXT_PUBLIC_PUBLIC_SITE_ONLY=true` is set on the public web service
- Public/private routes behave correctly:
  - `/.env` is not exposed
  - `/admin`, `/leads`, and `/manage` are locked down as intended
- Private env vars stay on private services only:
  - `ADMIN_*`
  - `LEAD_*`
  - bucket/video secrets
- Security headers are present on the live site:
  - `Strict-Transport-Security`
  - `Content-Security-Policy`
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
- `robots.txt` and `sitemap.xml` do not expose private routes
- Public pages redirect cleanly to HTTPS
- Upload flow works for a small file before trying large media
- Worker service is online and not crash looping
- If you use bucket mode, bucket CORS allows uploads from `manage.devcandoit.com`

## Production checklist

- Set `NEXT_PUBLIC_SITE_URL` to the live domain
- Set `NEXT_PUBLIC_PUBLIC_SITE_ONLY=true` on the public web service so the umbrella site stays website-only
  - In production, the app defaults to public-site-only if this flag is missing.
- Set `LEAD_DATABASE_URL` and `LEAD_DATABASE_AUTH_TOKEN`
- Set `LEAD_ENCRYPTION_KEY`
- Set `VIDEO_ASSET_ROOT` to the Railway volume or host path used for the local fallback/profile photo volume
- For large video files, set `VIDEO_BUCKET_NAME`, `VIDEO_BUCKET_REGION`, `VIDEO_BUCKET_ENDPOINT`, `VIDEO_BUCKET_ACCESS_KEY_ID`, and `VIDEO_BUCKET_SECRET_ACCESS_KEY`
- Optionally set `VIDEO_BUCKET_PUBLIC_BASE_URL` if you want `/api/videos/[slug]` to redirect directly to the public bucket URL
- Set `ADMIN_USERNAME`, `ADMIN_SESSION_SECRET`, `ADMIN_PASSWORD_SALT`, and `ADMIN_PASSWORD_HASH`
- Optionally set `ADMIN_COOKIE_DOMAIN=.devcandoit.com` if you want to share the admin session across subdomains like `manage.devcandoit.com`
- Set Gmail SMTP credentials if you want contact email delivery
- If you use bucket mode, configure bucket CORS to allow uploads from `manage.devcandoit.com`

## Contact form email flow

Form submissions are sent to `CONTACT_INBOX` through Gmail SMTP and use the subject prefix in `CONTACT_TAG` so you can filter them later.

Recommended Gmail filter:

- `subject:(DEV_CANDO_IT_LEAD)`

## Content updates

Most site copy lives in [src/lib/site.ts](/Users/devinotto/Desktop/CODE/DevCanDoIT/src/lib/site.ts).
