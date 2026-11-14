# MamaLine dashboard

The app health workers (CHEWs) use on their phones: today's danger-sign alerts, follow-ups and the visits and vaccines due, a week strip and a month calendar, the list of their mothers, and a + button to register a mother. It talks to the API in [`../api`](../api).

## How it works

- **Sign-in:** phone number and the same 4-digit PIN as the USSD menu. `POST /api/session` signs in through the API and keeps the session token in an httpOnly cookie, so browser JavaScript never sees it. Sessions last 7 days.
- **API calls:** the browser only calls `/api/mamaline/...` on this app, which adds the token and forwards a fixed list of dashboard routes to the API. Nothing else on the API is reachable through it.
- **Signed out:** `src/proxy.ts` sends anyone without a session to `/sign-in`, and an expired session clears the cookie.
- **Time:** every date is in Nigerian time (WAT). The clock is read only in the browser.

| Path | What it shows |
|---|---|
| `/` | Greeting, the week, and the chosen day: urgent alerts, follow-ups, visits and vaccines. Each card has a ⋮ menu: call her, mark as contacted or done |
| `/mothers` | Her mothers with search and filters (pregnant, babies, awaiting consent); record a birth |
| `/follow-ups` | Every open alert and follow-up, whenever it was raised |
| `/calendar` | The month with a dot on days that have visits due; tap a day to open it |
| `/sign-in` | Phone and PIN |

## Run it locally

Start the API on port 3010 (see [`../api/README.md`](../api/README.md)), with sample mothers from `npm run db:demo`. Then:

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev -- -p 3003
```

Open http://localhost:3003 and sign in as Amina: 0800 000 0101, PIN 2468 (sample data only).

## Configuration

| Variable | What it is |
|---|---|
| `MAMALINE_API_URL` | Where the API runs, e.g. `http://localhost:3010` or the deployed API URL. Server-side only |

## Checks

```bash
npx next typegen && npx tsc --noEmit && npm run lint && npm run build
```
