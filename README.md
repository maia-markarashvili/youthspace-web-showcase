# youthspace.ge

Website and back office for **"სივრცე" (Sivrce)**, a youth development centre in Gldani,
Tbilisi. It is a real, running product: the public site, the purchase and booking flows,
card payments, the customer accounts and the admin panel are all live at
[youthspace.ge](https://youthspace.ge).

The interface is entirely in Georgian - so are the code comments and the seed content.
Commit messages and these documents are in English.

> **About this repository.** This is a public showcase copy of the private production
> repository behind youthspace.ge. The code, schema, migrations and documentation are the
> real ones. Personal content - participants' photos and texts, news items, the course
> archive and uploaded documents - and the database-backup workflow are left out, and the
> site's photos are replaced with placeholders.

## Author

Designed, specified and built by **Maia Markarashvili** - product owner, business analyst
and developer of the project, working with AI-assisted development.
[LinkedIn](https://www.linkedin.com/in/maia-markarashvili/) · [GitHub](https://github.com/maia-markarashvili)

## What the site does

- **Clubs** - a monthly membership in one of the four clubs, bought online.
- **Courses** - paid courses (optionally in monthly instalments), free events with
  registration, and an archive of past ones.
- **Drop-in** - a single entry or a four-entry pass, booked onto a date and a time slot.
- **Events** - the hall is rented as a whole for an event; the price is a slot price plus
  a people-tier add-on.
- **Customer accounts** - one account holds several profiles (a parent and their
  children); purchases, bookings and cancellations live there.
- **Reception desk** - QR ticket admission and visit tracking for the staff.
- **Admin panel** - every price, text, club, course, calendar day and order is editable;
  nothing user-visible is hardcoded.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Language | TypeScript, React 19 |
| Styling | Tailwind CSS v4 (`@theme` tokens in `src/app/globals.css`) |
| Database | PostgreSQL (Neon) through Drizzle ORM; PGlite for local development |
| Auth | `jose` (JWT sessions) + bcrypt; two separate systems for admins and customers |
| Payments | Flitt (cards); bank transfer confirmed by the admin |
| Messaging | Resend HTTP API (email), ubill.dev (SMS) |
| Hosting | Railway behind Cloudflare |

There is no test framework in the project: changes are verified with `tsc`, `eslint`, a
production build and scripted smoke tests against a local PGlite database.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

With `DATABASE_URL` unset the app falls back to an embedded **PGlite** database in
`./.pglite/data`, so it runs with no external services at all. Every integration follows
the same rule: **without credentials it is a no-op**, and the site keeps working.

To create and fill that local database:

```bash
npm run db:migrate
npm run db:seed
```

PGlite allows **one process at a time** - stop the dev server before running
`db:migrate`, `db:seed` or `db:studio`. Seed inserts use `onConflictDoNothing`, so editing
the seed does not update existing rows; to apply seed changes, delete `.pglite` and run
migrate + seed again.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build (works without `DATABASE_URL`) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run db:generate` | Generate a migration from the schema (drizzle-kit) |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Idempotent seed |
| `npm run db:studio` | Drizzle Studio |
| `npm run icons:generate` | Regenerate the favicon set from the brand mark |

Migrations in `drizzle/` are generated files - never hand-edited, and `db:push` is never
used against the production database.

## Environment

`.env.example` documents every variable. Only `DATABASE_URL` (in production) and
`SESSION_SECRET` are required; everything else switches a feature on when it is filled in:

| Group | Variables |
| --- | --- |
| Core | `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL` |
| Admin seed | `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` |
| Payments | `FLITT_MERCHANT_ID`, `FLITT_SECRET_KEY`, `FLITT_MODE`, `FLITT_ENFORCE_IP` |
| SMS | `UBILL_API_KEY`, `UBILL_BRAND_ID` |
| Email | `RESEND_API_KEY` (the `SMTP_*` variables are deprecated) |
| Sign-in with Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Analytics | `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN` |
| Storage / ops | `UPLOAD_DIR`, `NEON_KEEPALIVE` |

Secrets live only in the hosting provider's variables - never in the repository.

## Deployment

Railway builds from `main` on every push and serves the app behind Cloudflare; the
database is Neon (pooled endpoint, `postgres.js` with `prepare: false` for PgBouncer).
Uploaded files live on a Railway volume (`UPLOAD_DIR`), with permanent documents
versioned in `seed-uploads/` as a fallback (empty in this public copy). A nightly scheduled
job takes an encrypted `pg_dump` of the database (not included in this public copy).

Migrations are **not** run automatically on deploy; they are applied deliberately.

## Where to look next

[ARCHITECTURE.md](ARCHITECTURE.md) explains the layering, the domain rules (pricing,
availability, bookings, cancellation), the two authentication systems, the payment flow
and the conventions that are easy to trip over.
