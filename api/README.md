# MamaLine API

The production backend for MamaLine: NestJS 12, Prisma 7 and Postgres on Neon. It will replace the prototype in [`../service`](../service) one module at a time.

## Status

| Done | Next |
|---|---|
| NestJS app with config validation (Zod) and graceful shutdown | Port the USSD menus, triage rules, schedules and text from `service/src` |
| Prisma 7 with the Postgres driver adapter, Neon-ready (pooled + direct URLs) | Africa's Talking USSD and SMS webhooks |
| Data model and first migration: mothers, consent, health workers and PINs, facilities, care records, reminders, alerts, follow-ups, questions, SMS log, USSD sessions, audit log | Reminder scheduler (one instance only) |
| `GET /health` with a database check | Health worker dashboard API with sign-in |
| PIN hashing shared with the prototype | Field encryption for phone numbers; data retention jobs |
| Seed for facilities and health workers | |
| Unit and end-to-end tests; CI against Postgres 17 | |

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
