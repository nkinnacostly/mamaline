# MamaLine API

The production backend for MamaLine: NestJS 12, Prisma 7 and Postgres on Neon. It replaces the prototype in [`../service`](../service); the USSD and SMS service is now ported.

## Status

| Ported and tested | Still to build |
|---|---|
| USSD menus for new callers, mothers and health workers, in 5 languages (same screens as the prototype) | Health worker dashboard API with sign-in, and the dashboard itself |
| Health worker PIN sign-in, 15-minute lockout, PIN change | Africa's Talking delivery reports (mark SMS delivered or failed) |
| Registration by the mother or a health worker; consent by USSD or SMS reply; NO and STOP delete her details | Rate limiting on the webhooks, and checking requests really come from Africa's Talking |
| Danger signs: emergency SMS to the mother, alert to her health worker (or the duty phone) | Field encryption for phone numbers; scheduled deletion of old SMS logs |
| Free-text questions: safety rules first, then Claude, then validated answers; follow-ups when a call is needed | A job queue for SMS sending and retries (at the moment SMS go out right after the USSD reply) |
| Antenatal and vaccine reminders, missed-visit follow-ups, tips; sent exactly once even across instances | Recording a birth (moves a mother to vaccine reminders) |
| Audit log for registration, consent, deletion and PIN changes | |
| 38 unit tests, 8 end-to-end tests over HTTP against Postgres; CI against Postgres 17 | |

## Endpoints

| Method and path | Who calls it |
|---|---|
| `POST /ussd` | Africa's Talking USSD callback (form-encoded). Replies `CON ...` or `END ...` |
| `POST /sms/inbound` | Africa's Talking inbound SMS callback: YES, NO and STOP replies |
| `GET /health` | The host and uptime monitors |

## How it is organised

| Folder | What it holds |
|---|---|
| `src/content/` | Everything a mother reads (screens, SMS, tips), the schedules and the safety rules. Pure functions, no database. Needs clinical sign-off before a pilot |
| `src/ussd/` | The menu engine (`menu.ts`, testable without a database), the service that loads the caller's record and session, and the controller |
| `src/care/` | What happens after a screen: registration, consent, emergencies, answers (`care.service.ts`), and the reminder scheduler (`reminders.service.ts`) |
| `src/sms/` | Sending SMS through Africa's Talking; every message is logged |
| `src/ai/` | Claude for grading questions and translating SMS; everything works without it |
| `src/core/` | Clock, facility and health worker directory, audit log |

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

## Setting up Neon

1. Create a project and pick the region closest to your users and your API host. Neon has no African region as of writing, so Frankfurt (`aws-eu-central-1`) or London (`aws-eu-west-2`) are the nearest. Run the API in the same region.
2. In **Connect**, copy the pooled connection string into `DATABASE_URL` and the direct one (pooling off) into `DIRECT_URL`.
3. **Production: turn off scale to zero** on the production branch's compute. USSD sessions time out within seconds, and the first query after Neon wakes from idle is slower. This needs a paid plan.
4. Use Neon **branches** for development and previews: each branch is a full copy you can migrate and throw away.
5. Run `npx prisma migrate deploy` against `DIRECT_URL` on every release, before the new version starts.

**Data protection:** a Neon database outside Nigeria means mothers' health data leaves the country. The Nigeria Data Protection Act 2023 allows this only on a lawful basis, so get legal advice before a pilot.

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
