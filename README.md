# MamaLine

A free pregnancy and baby-care line that works on any phone. Mothers in Nigeria register by USSD and get antenatal and vaccine reminders, trusted answers and danger-sign help by SMS, in English, Pidgin, Hausa, Yoruba or Igbo. Every mother is linked to her community health extension worker (CHEW), who gets an alert the moment she reports a danger sign.

Live website: https://mamaline-web.vercel.app

## What's in this repository

| Folder | What it is | Stack |
|---|---|---|
| [`service/`](service/) | The USSD and SMS service, health worker dashboard and phone simulator | Node.js 22, no framework; Africa's Talking; Claude for AI answers |
| [`web/`](web/) | The public website | Next.js 16, Tailwind CSS 4, Vercel; Resend for the partner form |

Each folder has its own README with setup, configuration and details.

## Quick start

Service (http://localhost:3001 for the simulator, `/admin` for the dashboard):

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
- **Production backend:** the service stores data in a JSON file. Move it to a managed database with encryption and backups.
- **Telecoms:** get a live USSD code and SMS sender ID through Africa's Talking or another aggregator.
- **Data protection:** consent and deletion are built in. Still to do under the Nigeria Data Protection Act 2023: a legal review of the consent wording, a data protection impact assessment and a retention policy.

## Safety design

- Fixed safety rules read every free-text message before the AI does, and the AI can only raise urgency, never lower it.
- Emergency SMS are fixed templates that name the facility and 112.
- Nothing is sent to a mother until she agrees, and NO or STOP deletes her details.
- Health workers sign in with a PIN, stored only as a hash, with lockout after 3 wrong tries.

## Development

- CI runs on every push and pull request: service tests, and website type-check, lint and build (`.github/workflows/ci.yml`).
- Never commit `.env` files, `data/` or real phone numbers. Sample data uses the `+2348000000xxx` range, which the SMS code never sends to.
