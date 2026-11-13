# youthspace.ge - a full booking, payments and back-office platform

**Site:** [youthspace.ge](https://youthspace.ge) · **Built by:** Maia Markarashvili ·
[LinkedIn](https://www.linkedin.com/in/maia-markarashvili/) · [GitHub](https://github.com/maia-markarashvili)

A complete web platform built for **"სივრცე" (Youth Space)**, a youth development centre
in Gldani, Tbilisi. One system covers the whole customer journey: customers find a club or
course, pay by card and get a QR ticket; staff admit them at the door; prices, schedules,
texts and orders are managed from an admin panel - without a developer.

New programmes are not being run at the moment. For me it was a hands-on project: building
a complete product myself and testing it in a real environment rather than in a demo.

Beyond the platform, as the centre's founder I initiated its non-commercial programmes:
the literary contest ["A Story That Starts with a Book"](https://youthspace.ge/stories/litkonkursi-2026-pirobebi)
(2026, ages 13-23), a debate championship, and two studies on young people and school
life ([2023](https://youthspace.ge/stories/kvleva-saskolo-cxovreba-2023),
[2026](https://youthspace.ge/stories/kvleva-momavali-molodinebi-2026)).

> **About this repository.** A public showcase copy of the private production repository.
> The code, database schema, migrations and documentation are the real ones. Personal
> content (participants' photos and texts, news, the course archive, uploaded documents)
> and the backup workflow are left out, and the photos are replaced with placeholders.

---

## My role

I took this project from an idea to a working system, end to end:

- **Business analysis** - mapped how the centre sold clubs, courses, drop-in visits and
  hall rentals, and turned it into clear rules: pricing, discounts, capacity, holds,
  cancellation deadlines, referrals.
- **Product ownership** - defined the scope, wrote the specifications, prioritised
  releases and accepted every change against the real workflow of the staff.
- **Development** - built the application with AI-assisted development (Claude Code):
  data model, payments, integrations, admin panel, deployment and operations.
- **Launch** - production hosting, live card-payment integration and encrypted nightly
  backups. The platform was paused soon after launch and remains as a working showcase.

## What was delivered

| For customers | For staff and the owner |
| --- | --- |
| Online purchase of club memberships, courses (incl. monthly instalments), drop-in entries and passes | Admin panel with 17 sections - every price, text, club, course, calendar day and order is editable |
| Date and time-slot booking with live availability | Reception screen: QR ticket scanning and visit tracking |
| Card payments (Flitt) or bank transfer | Two staff roles (owner / reception), masked personal data, full audit log |
| One account for a family - a parent and their children | Order management, cancellations, Excel exports |
| Sign-in with email, phone or Google | Editable SMS and email templates, promo and referral codes |
| SMS and email confirmations, QR tickets | GA4 and Meta Pixel / Conversions API behind a cookie-consent gate |

## Highlights worth a closer look

- **Payments that heal themselves.** A card result is confirmed three ways (signed
  callback, status check, periodic reconcile), and the handler is idempotent - a lost or
  repeated callback never double-charges or double-notifies. A payment landing on a
  cancelled order raises an alert to the owner.
- **No double bookings.** Availability is computed from bookings under a database lock;
  an unpaid order holds its seat for 10 minutes and expires on its own, no cron needed.
- **The owner is not dependent on a developer.** Nothing customer-facing is hardcoded:
  prices, texts, legal documents and message templates all live in the database.
- **Fails safe.** Every integration (SMS, email, payments, Google sign-in, analytics) is
  optional - a missing key switches the feature off instead of breaking the site.
- **Security by default.** Server-side price and ownership checks on every request,
  separate auth systems for staff and customers, bcrypt, signed QR tokens, Google OAuth
  with PKCE implemented directly, no third party ever sees a payment token.

Details: [ARCHITECTURE.md](ARCHITECTURE.md).

## Work with me

I take on projects as a freelancer and as part of a team. I can help with:

- **Booking, membership and e-commerce websites** with online payments
- **Admin panels and internal tools** that let a business run itself
- **Business analysis and specifications** - turning a messy process into clear rules
  and a buildable scope
- **Integrations** - payment gateways, SMS and email, Google sign-in, analytics
- **AI-assisted development** - shipping production-quality software quickly with
  Claude Code, with the product thinking kept in human hands

Get in touch through [LinkedIn](https://www.linkedin.com/in/maia-markarashvili/).

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Language | TypeScript, React 19 |
| Styling | Tailwind CSS v4 (`@theme` tokens in `src/app/globals.css`) |
| Database | PostgreSQL (Neon) through Drizzle ORM - 26 tables, 31 migrations; PGlite locally |
| Auth | `jose` (JWT sessions) + bcrypt; two separate systems for staff and customers |
| Payments | Flitt (cards); bank transfer confirmed by the admin |
| Messaging | Resend HTTP API (email), ubill.dev (SMS) |
| Hosting | Railway behind Cloudflare |

The interface, code comments and seed content are in Georgian; commit messages and these
documents are in English. Changes are verified with `tsc`, `eslint`, a production build
and scripted smoke tests against a local PGlite database.

## Running it locally

```bash
npm install
npm run dev          # http://localhost:3000
```

With `DATABASE_URL` unset the app falls back to an embedded **PGlite** database in
`./.pglite/data`, so it runs with no external services at all. To create and fill it:

```bash
npm run db:migrate
npm run db:seed
```

PGlite allows **one process at a time** - stop the dev server before running
`db:migrate`, `db:seed` or `db:studio`. Seed inserts use `onConflictDoNothing`, so to
apply seed changes delete `.pglite` and run migrate + seed again.

<details>
<summary><b>Scripts, environment and deployment</b></summary>

### Scripts

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

### Environment

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

### Deployment

Railway builds from `main` on every push and serves the app behind Cloudflare; the
database is Neon (pooled endpoint, `postgres.js` with `prepare: false` for PgBouncer).
Uploaded files live on a Railway volume (`UPLOAD_DIR`), with permanent documents
versioned in `seed-uploads/` as a fallback (empty in this public copy). A nightly job
takes an encrypted `pg_dump` of the database (not included in this public copy).
Migrations are **not** run automatically on deploy; they are applied deliberately.

</details>
