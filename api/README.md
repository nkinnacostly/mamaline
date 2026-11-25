# MamaLine API

The production backend for MamaLine: NestJS 12, Prisma 7 and Postgres on Neon. It replaces the prototype in [`../service`](../service); the USSD and SMS service is now ported.

## Status

| Ported and tested | Still to build |
|---|---|
| USSD menus for new callers, mothers and health workers, in 5 languages (same screens as the prototype) | Africa's Talking delivery reports (mark SMS delivered or failed) |
| Health worker PIN sign-in, 15-minute lockout, PIN change | Rate limiting on the webhooks, and checking requests really come from Africa's Talking |
| Registration by the mother or a health worker; consent by USSD or SMS reply; NO and STOP delete her details | Field encryption for phone numbers; scheduled deletion of old SMS logs |
| Danger signs: emergency SMS to the mother, alert to her health worker (or the duty phone) | A job queue for SMS sending and retries (at the moment SMS go out right after the USSD reply) |
| Free-text questions: safety rules first, then Claude, then validated answers; follow-ups when a call is needed | Supervisor accounts (set PINs, see every health worker in an LGA) |
| Antenatal and vaccine reminders, missed-visit follow-ups, tips; sent exactly once even across instances | |
| Health worker dashboard API: phone + PIN sign-in with 7-day sessions, day, week and month views, register a mother, record a birth, mark visits, alerts and follow-ups done | |
| Audit log for registration, consent, deletion, PIN changes and visits marked done | |
| 40 unit tests, 13 end-to-end tests over HTTP against Postgres; CI against Postgres 17 | |

## Endpoints

| Method and path | Who calls it |
|---|---|
| `POST /ussd` | Africa's Talking USSD callback (form-encoded). Replies `CON ...` or `END ...` |
| `POST /sms/inbound` | Africa's Talking inbound SMS callback: YES, NO and STOP replies |
| `GET /health` | The host and uptime monitors |
| `GET /public/stats` | Anyone, no sign-in: anonymous totals (mothers enrolled, visits and vaccines confirmed, danger signs and time to contact, SMS) for the website's `/impact` page. No phone numbers, names or places. `dataStatus` comes from `PUBLIC_DATA_STATUS` and stays `sample` until real mothers use MamaLine. Cached for 60 seconds |
| `POST /auth/sign-in` | The dashboard: `{ phone, pin }` returns a session token (10 tries a minute per IP; 3 wrong PINs pause the number for 15 minutes) |
| `POST /auth/sign-out`, `GET /auth/me` | The dashboard, with `Authorization: Bearer <token>` |
| `GET /dashboard/day?date=`, `/week?date=`, `/month?date=` | Visits and vaccines due (and, for today, open alerts and follow-ups). Dates are `YYYY-MM-DD` in Nigerian time |
| `GET /dashboard/mothers`, `GET /dashboard/follow-ups` | Her mothers; everything still open |
| `POST /dashboard/mothers` | Register a mother: `{ phone, language, track, amount, location }`. She is saved as awaiting consent and gets the consent SMS |
| `POST /dashboard/mothers/:id/birth` | Record a birth: moves her to baby vaccine reminders |
| `POST /dashboard/mothers/:id/visits/:itemKey/done` | She came for a visit or vaccine (`anc-30`, `vx-6w`): no more reminders for it |
| `POST /dashboard/alerts/:id/contacted`, `POST /dashboard/follow-ups/:id/done` | Close an alert or follow-up |

Every dashboard route only ever reads or changes the signed-in health worker's own mothers, alerts and follow-ups.

## How it is organised

| Folder | What it holds |
|---|---|
| `src/content/` | Everything a mother reads (screens, SMS, tips), the schedules and the safety rules. Pure functions, no database. Needs clinical sign-off before a pilot |
| `src/ussd/` | The menu engine (`menu.ts`, testable without a database), the service that loads the caller's record and session, and the controller |
| `src/care/` | What happens after a screen: registration, consent, emergencies, answers (`care.service.ts`), and the reminder scheduler (`reminders.service.ts`) |
| `src/sms/` | Sending SMS through Africa's Talking; every message is logged |
| `src/ai/` | Claude for grading questions and translating SMS; everything works without it |
| `src/core/` | Clock, facility and health worker directory, audit log |
| `src/auth/` | PIN hashing and lockout, dashboard sessions (only a hash of each token is stored), the bearer-token guard |
| `src/dashboard/` | What the health worker dashboard shows and does, all scoped to the signed-in health worker |

The USSD reply is sent first and the follow-up work runs straight after, because networks close a USSD session within seconds.

## Run it locally

You need Node.js 22.9 or later and a Postgres database: a Neon branch, or Postgres on your machine.

```bash
npm install
```

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` and `DIRECT_URL`, then:

```bash
npx prisma migrate deploy
```

```bash
npx prisma db seed
```

```bash
npm run start:dev
```

Check it at http://localhost:3000/health.

To see the dashboard with something on it, add sample mothers for Amina (sign in as 0800 000 0101, PIN 2468). It refuses to run when `NODE_ENV=production`, and sample numbers never get real SMS:

```bash
npm run db:demo
```

## Setting up Neon

1. Create a project and pick the region closest to your users and your API host. Neon has no African region as of writing, so Frankfurt (`aws-eu-central-1`) or London (`aws-eu-west-2`) are the nearest. Run the API in the same region.
2. In **Connect**, copy the pooled connection string into `DATABASE_URL` and the direct one (pooling off) into `DIRECT_URL`.
3. **Production: turn off scale to zero** on the production branch's compute. USSD sessions time out within seconds, and the first query after Neon wakes from idle is slower. This needs a paid plan.
4. Use Neon **branches** for development and previews: each branch is a full copy you can migrate and throw away.
5. Run `npx prisma migrate deploy` against `DIRECT_URL` on every release, before the new version starts.

**Data protection:** a Neon database outside Nigeria means mothers' health data leaves the country. The Nigeria Data Protection Act 2023 allows this only on a lawful basis, so get legal advice before a pilot.

## Deploying on Vercel

The API runs on Vercel as a single function (project `mamaline-api`, root directory `api`, London region, Node 22) at https://mamaline-api.vercel.app. Postgres is the Neon project `mamaline` (AWS London), linked to the Vercel project through Neon's Vercel integration. Pushing to `main` deploys it when something in `api/` changed.

- **Database:** the Neon integration sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct, used by the Prisma CLI). It also creates a Neon branch for preview deployments and development, which start empty. Run migrations from your machine before deploying a schema change: `vercel env pull` into a file outside the repo, load it, then `npx prisma migrate deploy`.
- **Reminders:** a serverless function can't keep a timer running, so `REMINDERS_ENABLED=false` there and Vercel Cron calls `GET /internal/reminders` once a day at 08:00 Nigerian time (`vercel.json`), signed with `CRON_SECRET`. Without `CRON_SECRET` the route doesn't exist.
- **After a USSD reply:** SMS, alerts and records run after the reply is sent; on Vercel `waitUntil` keeps the function alive until they finish (`src/core/background.ts`).
- **SMS:** without `AT_USERNAME` and `AT_API_KEY`, every SMS is recorded as SIMULATED and nothing is sent.

- **Startup:** `src/main.ts` calls `bootstrap()` without awaiting it. Vercel takes over `listen()`, and an awaited top-level promise would keep the function from ever finishing loading.
- **Only ESM-compatible packages:** Vercel's function loader can't `require()` an ES module, so a CommonJS package that loads `@nestjs/common` (Nest 12 is ESM) crashes the function at startup. That is why sign-in uses a small built-in rate limiter instead of `@nestjs/throttler`.
- **Live data:** the production database holds sample health workers (with sample PINs) and sample mothers only. Remove them and set real PINs before any real mother uses it.

On a long-running server (Fly.io, Render, a VM) leave `REMINDERS_ENABLED` on and skip the cron.

## Working with the database

| Task | Command |
|---|---|
| Change the data model | Edit `prisma/schema.prisma`, then `npx prisma migrate dev --name what-changed` |
| Regenerate the client | `npx prisma generate` (output: `src/generated/prisma`, git-ignored) |
| Apply migrations (deploys, CI) | `npx prisma migrate deploy` |
| Load facilities and health workers | `npx prisma db seed` (sample PINs outside production only) |
| Browse data | `npx prisma studio` |

Migrations are plain SQL in `prisma/migrations`. Review them in pull requests like code. CI fails if `schema.prisma` changes without a matching migration.

## Tests

| Command | What it runs |
|---|---|
| `npm test` | Unit tests (Vitest), no database needed |
| `npm run test:e2e` | End-to-end tests against the database in `DATABASE_URL` (migrate and seed it first) |
| `npm run lint` | oxlint with type-aware rules |

## Design notes

- **Pooled vs direct:** the app connects through Neon's pooler (PgBouncer in transaction mode). Anything needing a session, such as advisory locks or LISTEN/NOTIFY, must use `DIRECT_URL`.
- **Deleting a mother** (she says NO or STOP) cascades to her care records, reminders, follow-ups and questions. Alerts keep the event but lose the link to her; the service must also clear the alert's phone number.
- **Audit log:** `audit_events` records consent, deletions, registrations and PIN changes. Never put message text or health details in it.
- **SMS log:** `outbound_messages` and `inbound_messages` hold phone numbers. Set a retention period and delete old rows on a schedule.
