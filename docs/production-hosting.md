# Production Hosting Stack

## Recommended Stack

- Domain registrar: Cloudflare Registrar for `devcandoit.com`
- DNS/CDN: Cloudflare
- Public website host: Railway web service
- Private worker host: Railway worker service
- Production lead database: libsql/Turso via `LEAD_DATABASE_URL` + `LEAD_DATABASE_AUTH_TOKEN`
- Lead encryption key: `LEAD_ENCRYPTION_KEY`
- Raw video storage: `VIDEO_BUCKET_*` for bucket mode, with `VIDEO_ASSET_ROOT` as the filesystem fallback and profile-photo volume root

## Why this setup

- Cloudflare Registrar keeps the domain cheap and easy to manage.
- Railway is a clean fit for one public site plus separate private background workers.
- The current lead system already speaks libsql, so Turso keeps the production data path aligned with the app.
- The site can grow into more internal apps later by adding more Railway services instead of rebuilding the stack.
- The public web service can run in `NEXT_PUBLIC_PUBLIC_SITE_ONLY=true` mode so the umbrella site stays public-facing only.
- Large raw videos are much easier to manage in S3-compatible bucket storage than through the app server or a Railway volume.

## Service split

- Public app: `devcandoit-web`
- Lead worker: `devcandoit-lead-worker`

## Railway launch flow

1. In Railway, choose **GitHub Repository** for the repo.
2. Create the web service first and let Railway detect the Next.js app.
3. Point the web service at [`railway.web.json`](../railway.web.json).
4. Create a second service from the same repo for the worker.
5. Point the worker service at [`railway.worker.json`](../railway.worker.json).
6. Add the custom domain `devcandoit.com` to the web service.
7. Point Cloudflare DNS at the Railway-provided target and keep the proxy off until the cert is issued.

## Required environment variables

- `NEXT_PUBLIC_SITE_URL` must point at `https://devcandoit.com`
- `NEXT_PUBLIC_PUBLIC_SITE_ONLY=true` on the public website service
  - If the flag is missing in production, the app defaults to public-site-only.
- `LEAD_DATABASE_URL` must point at the hosted libsql database
- `LEAD_DATABASE_AUTH_TOKEN` is required for the remote libsql database
- `LEAD_ENCRYPTION_KEY` must be a unique secret per environment
- `VIDEO_ASSET_ROOT` should point at the mounted path or filesystem folder used for the local fallback and profile photo volume
- For big video files, set `VIDEO_BUCKET_NAME`, `VIDEO_BUCKET_REGION`, `VIDEO_BUCKET_ENDPOINT`, `VIDEO_BUCKET_ACCESS_KEY_ID`, and `VIDEO_BUCKET_SECRET_ACCESS_KEY`
- If you want the public video route to redirect straight to the bucket URL, set `VIDEO_BUCKET_PUBLIC_BASE_URL`
- `VIDEO_BUCKET_FORCE_PATH_STYLE` should usually stay `true` for Railway Buckets and other S3-compatible storage providers
- `ADMIN_USERNAME`
- `ADMIN_SESSION_SECRET`
- `ADMIN_PASSWORD_SALT`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_COOKIE_DOMAIN` is optional, but useful if you want to share the admin login across subdomains like `manage.devcandoit.com`
- `VENUS_GATE_USERNAME` and `VENUS_GATE_PASSWORD` are optional, but when both are set the `/Venus` experience is protected by a private login page
- `VENUS_GATE_SESSION_SECRET` is optional and can be separate from `ADMIN_SESSION_SECRET` if you want an independent Venus session secret
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `CONTACT_INBOX`
- `CONTACT_TAG`

Tip: generate `LEAD_ENCRYPTION_KEY` with something like `openssl rand -base64 32`, then keep the value unique per environment.
For local development, run `npm run setup:env` to generate a private `.env.local` file without hardcoding secrets into the repo.

## VENUS deployment model

- Keep the Venus source code in a separate **private** repo.
- Build Venus for the website path with `VITE_APP_BASE=/Venus/`.
- Copy the compiled output into this repo at `public/Venus/`.
- Railway deploys the public site repo only; it should not need access to the private Venus source repo.

## Deploy checklist

1. Buy the domain.
2. Add the domain to Cloudflare and keep DNS there.
3. Create the hosted libsql database and copy the URL/token.
4. Create the Railway web service and worker service from the GitHub repo.
5. Set `NEXT_PUBLIC_SITE_URL` to the live domain.
6. Set `VIDEO_ASSET_ROOT` to the Railway volume or host path used for the local fallback/profile photo volume.
7. If you are storing big videos, set the `VIDEO_BUCKET_*` variables and configure bucket CORS so uploads from `manage.devcandoit.com` are allowed.
8. Verify:
   - `/api/health`
   - `/admin/login`
   - `/api/admin/health`
   - lead scan queue + worker heartbeat

## Notes

- The public site should stay public; internal tools stay under `/admin` and `/leads`.
- The public site should also run in `NEXT_PUBLIC_PUBLIC_SITE_ONLY=true` mode so those internal routes 404 on the umbrella deployment.
- Large raw videos should stay out of git and live in bucket storage when possible; if you keep a filesystem fallback, use the Railway host path or mounted volume defined by `VIDEO_ASSET_ROOT`.
- Add new internal webapps later as separate Railway services so each one can scale and restart independently.
- The worker now ships with `tsx` in production so Railway can run it directly from the repo.
