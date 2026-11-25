# MamaLine

A free pregnancy and baby-care line that works on any phone. Mothers in Nigeria register by USSD and get antenatal and vaccine reminders, trusted answers and danger-sign help by SMS, in English, Pidgin, Hausa, Yoruba or Igbo. Every mother is linked to her community health extension worker (CHEW), who gets an alert the moment she reports a danger sign.

Live:

- Website: https://mamaline-web.vercel.app
- Health worker dashboard: https://mamaline-dashboard.vercel.app (sample data; sign in as 0800 000 0101, PIN 2468)
- API: https://mamaline-api.vercel.app (`/health`; Africa's Talking callbacks go to `/ussd` and `/sms/inbound`)

## What's in this repository

| Folder | What it is | Stack |
|---|---|---|
| [`api/`](api/) | The production backend: USSD and SMS service, consent, reminders, alerts and the dashboard API | NestJS 12, Prisma 7, Postgres on Neon |
| [`dashboard/`](dashboard/) | The health worker app: today's visits, alerts and follow-ups, her mothers, a calendar, and registering a mother | Next.js 16, Tailwind CSS 4 |
| [`service/`](service/) | The working prototype: USSD and SMS service, health worker dashboard and phone simulator | Node.js 22, no framework; Africa's Talking; Claude for AI answers |
| [`web/`](web/) | The public website | Next.js 16, Tailwind CSS 4, Vercel; Resend for the partner form |

Each folder has its own README with setup, configuration and details.

## Quick start

API (needs a Postgres URL in `api/.env`, see [api/README.md](api/README.md)):

```bash
cd api && npm install && npx prisma migrate deploy && npx prisma db seed && npm run start:dev
```

Health worker dashboard (http://localhost:3003, with the API on port 3010; sign in as 0800 000 0101, PIN 2468 after `npm run db:demo` in `api/`):

```bash
cd dashboard && npm install && MAMALINE_API_URL=http://localhost:3010 npm run dev -- -p 3003
```

Prototype service (http://localhost:3001 for the simulator, `/admin` for the dashboard):

```bash
cd service && npm install && npm run seed && npm start
```

Website (http://localhost:3000):

```bash
cd web && npm install && npm run dev
```

## Status

MamaLine is a working prototype. It is not yet safe to use with real mothers. Before a pilot:

- **Clinical sign-off:** a midwife, nurse or doctor must approve every health message, danger-sign list and triage rule (`service/knowledge/`, `service/src/i18n.js`, `service/src/triage.js`).
- **Professional translation:** the Hausa, Yoruba and Igbo text is a draft. Medical and consent wording is English and Pidgin only until translated.
- **Production backend:** the USSD, SMS, consent and reminder features now run on the NestJS + Neon API in `api/`. The health worker dashboard runs on it too (`dashboard/`). Still to build: delivery reports, webhook verification, field encryption and supervisor accounts.
- **Telecoms:** get a live USSD code and SMS sender ID through Africa's Talking or another aggregator.
- **Data protection:** consent and deletion are built in. Still to do under the Nigeria Data Protection Act 2023: a legal review of the consent wording, a data protection impact assessment and a retention policy.

## Safety design

- Fixed safety rules read every free-text message before the AI does, and the AI can only raise urgency, never lower it.
- Emergency SMS are fixed templates that name the facility and 112.
- Nothing is sent to a mother until she agrees, and NO or STOP deletes her details.
- Health workers sign in with a PIN, stored only as a hash, with lockout after 3 wrong tries.

## Development

- CI runs on every push and pull request (`.github/workflows/ci.yml`): API lint, build, unit tests, migrations and end-to-end tests against Postgres 17; prototype tests; and website type-check, lint and build.
- Never commit `.env` files, `data/` or real phone numbers. Sample data uses the `+2348000000xxx` range, which the SMS code never sends to.

## License

MamaLine is open source under the [Apache License 2.0](LICENSE). Copyright 2026 CLOOP UNIVERSE TECH LTD.

The license covers the code. Health messages and translations still need clinical review and a professional translator before anyone uses them with real mothers (see [Status](#status)).
