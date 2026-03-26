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
- Video asset root: `VIDEO_ASSET_ROOT`
- Railway config files: `railway.web.json` and `railway.worker.json`

See [docs/production-hosting.md](./docs/production-hosting.md) for the deploy checklist and environment variables.

## Local setup

1. Run `npm run setup:env`
2. Add your Gmail app password to `GMAIL_APP_PASSWORD` if you want contact form email delivery
3. Install dependencies with `npm install`
4. Start the dev server with `npm run dev`

The setup script seeds `.env.local` with generated admin/session/encryption values so you do not need to hardcode secrets in the repo. You can pass `--username`, `--password`, or `--force` to control the generated login if you want to override the defaults.

## Production checklist

- Set `NEXT_PUBLIC_SITE_URL` to the live domain
- Set `NEXT_PUBLIC_PUBLIC_SITE_ONLY=true` on the public web service so the umbrella site stays website-only
  - In production, the app defaults to public-site-only if this flag is missing.
- Set `LEAD_DATABASE_URL` and `LEAD_DATABASE_AUTH_TOKEN`
- Set `LEAD_ENCRYPTION_KEY`
- Set `VIDEO_ASSET_ROOT` to the Railway volume or host path that contains the raw video files
- Set `ADMIN_USERNAME`, `ADMIN_SESSION_SECRET`, `ADMIN_PASSWORD_SALT`, and `ADMIN_PASSWORD_HASH`
- Set Gmail SMTP credentials if you want contact email delivery

## Contact form email flow

Form submissions are sent to `CONTACT_INBOX` through Gmail SMTP and use the subject prefix in `CONTACT_TAG` so you can filter them later.

Recommended Gmail filter:

- `subject:(DEV_CANDO_IT_LEAD)`

## Content updates

Most site copy lives in [src/lib/site.ts](/Users/devinotto/Desktop/CODE/DevCanDoIT/src/lib/site.ts).
