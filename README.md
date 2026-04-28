# DevCanDoIt

Public portfolio and consulting site for Devin Otto.

## Stack

- Next.js App Router
- React + TypeScript
- Railway hosting
- Cloudflare DNS
- Gmail-backed contact form

## Local setup

1. Install dependencies with `npm install`
2. Run `npm run setup:env`
3. Start the dev server with `npm run dev`
4. Run `npm run lint` and `npm run build` before deploying

Optional:

- Add `GMAIL_USER` and `GMAIL_APP_PASSWORD` locally if you want contact form email delivery.
- Add `FIREBASE_SERVICE_ACCOUNT_JSON` if you want the public TeleMIDI session create/join APIs to work locally.
- Add `TELEMIDI_FIREBASE_WEB_CONFIG_JSON` if you want `/telemidi-connect` to auto-load Firebase config instead of falling back to manual setup.
- Keep secrets in `.env.local`; the generated file is not committed.

## Live site

- [devcandoit.com](https://devcandoit.com)

## Notes

- Sensitive configuration stays in environment variables.
- Public-facing content and presentation will continue to evolve.
