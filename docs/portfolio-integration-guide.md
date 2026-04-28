# DevCanDoIt Portfolio Integration Guide

This document explains how the public DevCanDoIt site is structured, how private project repos connect into it, and what any future repo needs to expose to be "connection ready" for portfolio integration.

The goal is simple:
- keep the public portfolio clean, secure, and resume-ready
- keep private source repos private
- allow new projects to plug into the portfolio without rewriting the public site each time

## 1) System Overview

DevCanDoIt is the public-facing portfolio and consulting site.

It acts as:
- the public home for the brand
- the resume-style showcase for selected work
- the contact and consulting entry point
- a protected delivery surface for private project builds when needed

The public repo is **not** the source of truth for every project.

Instead, the general pattern is:
- private project repos own source code, packaging, and private assets
- the public DevCanDoIt repo owns the portfolio shell, presentation, and integration layer
- only compiled output, uploaded assets, or safe metadata move into the public repo

## 2) Repo Split

### Public repo

Path:
- `<public-repo-root>/DevCanDoIT`

Responsibilities:
- public site pages
- portfolio listings
- consulting pages
- resume/contact experience
- protected app delivery routes
- public-safe integration plumbing

### Private project repos

Examples:
- `<private-repo-root>/Venus`
- future private product repos

Responsibilities:
- source code
- private features
- desktop packaging if applicable
- build output generation
- internal asset preparation

Rule:
- do not move private source into the public repo
- do not store credentials or private media in public git

## 3) Why This Architecture Exists

This split gives three benefits:

- the portfolio stays polished and easy to review
- private projects can evolve without exposing source
- public integration can happen through a stable contract instead of one-off manual wiring

This matters for a resume-facing repo because the public site should feel intentional, not like an internal deployment notebook.

## 4) What Belongs Where

### Public DevCanDoIT repo should contain

- the portfolio shell
- public project cards and pages
- contact and resume content
- protected delivery routes for private builds
- sanitized environment examples
- high-level hosting notes

### Private project repos should contain

- source code
- build scripts
- packaging tooling
- private images or media
- desktop app logic
- private sync or export tooling

### Generated output should contain

- compiled web bundles
- static assets that are safe to serve
- uploaded images or media that are intentionally published through the app

Rule:
- generated output is build artifact, not source
- do not hand-edit compiled output unless debugging a very specific issue

## 5) Connection-Ready Project Contract

Any repo that wants to plug into DevCanDoIT should be able to provide the following:

- a stable slug
- a public title
- a short project summary
- a category or theme
- a build command
- an output directory for compiled web assets
- an asset strategy
- an environment variable list
- a route/base-path contract
- a sync command or export step
- a clear private/public visibility decision

If a project is private, the public site should only expose the protected delivery surface, not the source repo or internal tooling.

## 6) Recommended Project Manifest

Each project repo should ideally include a small metadata file that the portfolio can read or mirror.

Example:

```json
{
  "slug": "project-slug",
  "title": "Project Title",
  "summary": "Short public summary.",
  "category": "AI / Workflow / Media",
  "visibility": "private",
  "basePath": "/project-slug",
  "buildOutput": "dist/web",
  "publicOutput": "public/project-slug",
  "syncCommand": "npm run sync:portfolio",
  "requiredEnv": [
    "NEXT_PUBLIC_SITE_URL",
    "AUTH_STATE_DATABASE_URL",
    "AUTH_STATE_DATABASE_AUTH_TOKEN",
    "PROJECT_INTERNAL_URL",
    "PROJECT_PROXY_SHARED_SECRET"
  ],
  "assetMode": "filesystem"
}
```

This file does not need to be copied verbatim, but the concept matters:
- give the public repo a predictable interface
- keep the public site from having to guess project structure
- keep private values out of git

## 7) Integration Flow

The standard flow is:

1. build the project in the private repo
2. generate only the compiled web output or the asset bundle that needs to be served
3. sync that output into the public repo or into an approved storage layer
4. wire the public site to serve it through a protected route
5. add the project to the public portfolio only if it is intended to be visible
6. verify the public/private split before deploying

This is the model used for the current private embedded app pattern as well:
- private source stays private
- compiled web output is synced into the public repo
- the public repo serves the compiled app through a protected route

## 8) Public Portfolio Rules

The public site should:

- show only work that is intended to be public
- keep hidden tools hidden
- avoid advertising private routes or private deployment internals
- keep public docs clean and high level
- avoid turning the README into an ops runbook

If a project is private, the public site should treat it as a protected integration surface, not as a featured case study unless explicitly approved.

## 9) Security and Privacy Rules

Do not:

- commit secrets
- commit raw private photos or source media
- commit `.env` files or tokens
- hardcode credentials in source
- use internal hostnames for public redirects
- expose private routes in public navigation
- leave generated build output unignored in linting if it is not source

Do:

- keep secrets in environment variables
- keep private operational notes in a private onboarding doc
- use generic error responses on public mutation endpoints
- keep redirects based on the public site URL
- treat build artifacts as generated
- keep public docs short and presentable

## 10) DevCanDoIT-Specific Integration Notes

The current public site includes:

- the portfolio and consulting shell
- public contact and resume pages
- private support routes for gated experiences
- protected delivery for compiled private app content when needed

The main integration rule is:
- the public repo should stay safe and presentable
- private projects should integrate through compiled output, storage-backed assets, or protected routes

If the project is private, it should not appear in the public portfolio cards, public homepage callouts, or public marketing copy.

### Private path-proxy apps

For private tools that run as their own service, prefer the current path-proxy model:

- DevCanDoIt verifies the existing DB-backed admin session from `auth-state` / `admin-auth`.
- The public route proxies to a private internal service URL.
- The proxy sends a per-service shared secret such as `X-DevCanDoIt-Proxy-Key`.
- The upstream private app validates that shared secret on every non-health request.
- The private app owns its source, runtime, scheduler, database, and private assets.

Do not design new private integrations around standalone `PROJECT_GATE_PASSWORD` or `PROJECT_GATE_SESSION_SECRET` values. Those names describe an older gate pattern and are not the current DevCanDoIt admin-auth contract.

The `/tradingalerts` integration follows this pattern: private Trading Predictions repo, private Railway service, DevCanDoIt admin-auth gate at `/tradingalerts/*`, upstream proxy-secret validation, no sitemap entry, and no public portfolio listing.

## 11) What To Check Before Merging Any New Project

- no secrets in git
- no private media in git
- no localhost-only URLs in public redirects
- no private route leakage in README or docs
- build output works from a clean clone
- public docs remain concise and professional
- lint and production build both pass

## 12) Short Mental Model

- private repo = source of truth
- public repo = presentation and delivery layer
- compiled output = what gets synced
- secrets = env only
- private assets = storage, not git
- public docs = resume-ready, not operational

If something is unclear, default to the rule that keeps the public site cleaner and the private repo more private.
