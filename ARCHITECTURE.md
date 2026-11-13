# Architecture

How the application is put together, which rules live where, and the conventions that are
easy to trip over. For setup and scripts see [README.md](README.md).

## Principles

1. **Everything user-visible comes from the database.** Public pages declare
   `export const dynamic = "force-dynamic"` and read through `src/lib/db/queries/*`.
   There is no hardcoded catalogue: changing a price, a club, a course, a label or a legal
   text means changing a row, and every one of those rows is editable from the admin panel.
2. **A missing credential disables a feature, it never breaks the site.** SMS, email,
   card payments, Google sign-in, the analytics and the Neon keep-alive are all gated on
   their environment variables; without them they log and return.
3. **The server decides.** Prices, availability, ownership and consent are recomputed on
   the server on every request; hidden form fields are never trusted.

## Directory map

```
src/
  app/
    (site)/          public pages, customer account, payment status
    (landing)/       club and course landing pages
    admin/(panel)/   the back office (17 sections)
    api/, */route.ts route handlers (Flitt callback, uploads, exports, OAuth, payment token)
  components/        UI primitives and page sections
  lib/
    db/              schema, connection, queries, mutations, seed, migrations runner
    auth/            admin sessions/roles, customer accounts, Google OAuth, purchase profiles
    site-texts/      the editable-text registry (groups, defaults, kinds)
    quizzes/         the club-matching quiz
    pricing.ts slots.ts calendar.ts booking-rules.ts cancellation-rules.ts ...
  proxy.ts           admin navigation redirects (convenience only, never the real guard)
  instrumentation.ts optional Neon keep-alive
drizzle/             generated migrations (31)
seed-uploads/        permanent uploaded documents, versioned in the repo
```

## Database layer

`src/lib/db/schema.ts` defines **26 tables**: catalogue (`clubs`, `courses`, `spaces`,
`content_posts`, `hero_slides`), settings (`pricing_settings`, `dropin_settings`,
`site_texts`, `legal_versions`), availability (`calendar_overrides`), transactions
(`subscriptions`, `bookings`, `entry_passes`, `payments`, `referral_credits`), accounts
(`accounts`, `account_profiles`, `account_verifications`, `phone_verifications`), staff
(`admin_users`, `admin_audit_log`, `visits`) and the rest (`leads`, `subscribers`,
`promo_codes`, `membership_plans`).

- **Money is always an integer in tetri** (GEL x 100). `src/lib/money.ts` has `toTetri`
  and `formatGel`; a float price never enters the system.
- `connect.ts` picks the driver - `postgres.js` for Neon, PGlite locally - and is
  deliberately *not* `server-only`, so the `tsx` scripts (`migrate.ts`, `seed.ts`) can
  import it. In production a missing or `pglite:` URL is a loud error, so the app can
  never fall through onto an ephemeral database.
- The app imports only `index.ts`, which is `server-only` and exposes a lazy `Proxy`, so a
  production build succeeds with no database reachable.
- Reads live in `db/queries/*`, writes that carry business rules in `db/mutations/*`.

## Domain rules

**Pricing** (`src/lib/pricing.ts`, server-only) is the single source:

- A club subscription is one flat monthly price (`pricing_settings.club_price`, with an
  optional sale price) and **one club per purchase**.
- Courses can carry a member discount per club (`courses.club_discounts`, the highest
  matching rate wins) and optional instalments (`monthly_price` x `monthly_months`, with
  only the first month charged online). Rounding always favours the buyer
  (`floorToWholeGel`).
- An event is priced as *slot price + people-tier add-on*; the tiers
  (`pricing_settings.event_people_tiers`) are editable, with `DEFAULT_EVENT_PEOPLE_TIERS`
  as the code fallback.
- A referral code adds a percentage on top of the club price and is only honoured once the
  caller has proven ownership of the phone number.

**Availability** (`src/lib/slots.ts`, `calendar.ts`, `booking-rules.ts`): the day is split
into three slots - morning, midday (14:00-18:00) and evening. **There is no `slots` table
by design**; what is free is computed from the `bookings` rows. Capacity resolves through
a three-step hierarchy: the override for that date, then the weekday capacity, then the
global default (0 means an explicit close, null means fall through). Today's slot is only
sold when it already has a booking or the same-day toggle is on.

**Bookings.** A single entry, a pass entry and an event are all `bookings` rows; an event
is `itemType: "space"` with `people_up_to` and quantity 1. Entries and events cross-block
each other on the same date and slot, under a `pg_advisory_xact_lock`. An unpaid card
order holds its seat through `hold_expires_at` (10 minutes) and every counter ignores an
expired hold, so no cron is needed.

**Cancellation** (`cancellation-rules.ts`) is one shared rule used by both the customer
(in `/account`) and the admin: until 10:00 on the day before, as long as the service has
not started. Cancelling a club cascades to its bonus pass and referral credits.

## Authentication

Two independent systems, each with its own cookie and its own data access layer:

- **Staff.** `admin_users` with two roles, `owner` and `reception`. `src/proxy.ts` only
  performs convenience redirects for GET navigation - the real guard is
  `requireOwner()`/`requireStaff()` *inside every server action and page*, which reads the
  role from the database on each request, so deactivating an account or changing a role
  takes effect immediately rather than when the token expires. Reception sees masked
  contact data only, and everything it does is written to `admin_audit_log`.
- **Customers.** `accounts` + `account_profiles` (a parent and their children), a separate
  30-day `member_session` cookie (jose HS256), bcrypt cost 12, activation and password
  recovery by one-time codes, and optional Google OAuth implemented directly
  (authorization code + PKCE, no library). Old guest purchases attach to an account only
  through a **verified** email or phone.

## Payments

`src/lib/flitt.ts` builds and checks the signature; `api/flitt/callback` is the single
source of truth for a result. Three layers make it robust:

1. the callback itself, verified by signature and amount;
2. a **status fallback** - if the signature does not verify, the payload is ignored and
   the status is asked of Flitt with our own signed request;
3. **reconcile** - the status page poller and the admin orders page re-check pending and
   recently paid payments, so a lost callback heals itself.

All three funnel into `applyFlittOutcome`, which is idempotent (a repeated callback
changes 0 rows and sends no second message) and carries a financial safety net: a payment
that lands on a cancelled order, or a chargeback on an active one, raises a loud alert
email to the owner. Bank transfer is the alternative path and is confirmed by the admin.

## Notifications and texts

`notify-customer.ts` is the single call site for customer messaging; SMS (`sms.ts`,
ubill.dev) and email (`mail.ts`, the Resend HTTP API) are independent - one failing never
blocks the other or the purchase. Every template lives in the `site_texts` registry
(`src/lib/site-texts/`), is editable from `/admin/texts`, and most are *disablable*:
an empty value really means "do not send this one".

## Other subsystems

- **Tickets and visits.** A signed QR token (`ticket-token.ts`, a key derived from
  `SESSION_SECRET`) renders a PII-free page at `/ticket/<token>` whose QR deep-links into
  the reception screen; each admission is a `visits` row.
- **Uploads.** `uploads.ts` writes into `UPLOAD_DIR` (a Railway volume); the
  `/uploads/[file]` route looks there first and in `seed-uploads/` second, which is how
  permanent documents survive a volume reset.
- **Analytics and consent.** GA4 and the Meta Pixel are behind a consent gate; the choice
  is stored with the order (`analytics_consent`) and a server-side Purchase is sent
  through the Conversions API only when consent allows it, deduplicated with the browser
  event by `event_id`. Capability tokens never reach a third party: the payment token
  travels in an httpOnly cookie and any `?t=` is stripped before the first event fires.
- **Exports.** `xlsx.ts` (exceljs) produces genuine `.xlsx` files for orders, passes,
  subscribers, leads and visits.
- **Markdown.** A small in-house parser (`markdown.ts`) renders admin-entered text - no
  HTML is ever accepted from the admin.

## Design system

Tailwind v4 `@theme` tokens in `src/app/globals.css` (the greens from the logo, ink,
cream, one radius and shadow scale, fluid type). Text is never overlaid on a photo except
in the hero, which uses a dark gradient.

**`cn()` in `src/lib/cn.ts` is a plain join with no tailwind-merge**, so conflicting
utilities both land in the class list and CSS order decides unpredictably. Never override
a Button variant's colours through `className` - add or use a variant
(`primary | secondary | ghost | inverted | invertedOutline`; the inverted ones exist for
dark sections).

## Conventions

- UI copy, seed content and code comments are Georgian; commit messages are English.
- In JSX/JS strings use the Georgian quotes „…" - a straight `"` inside a double-quoted
  attribute is a recurring syntax error here.
- Never use an em dash in user-visible text; the short dash `-` is the standing rule.
- Migrations are generated, never hand-edited, and `db:push` is never used against Neon.
- PGlite allows one process at a time locally, and the seed does not update existing rows.
