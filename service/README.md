# MamaLine

A pregnancy and baby-care companion on **any phone**, linked to the local community health worker (CHEW). A mother dials a USSD code to register, report a danger sign, ask a question or confirm a clinic visit. She gets reminders and advice by SMS in English, Pidgin, Hausa, Yoruba or Igbo. When she reports a danger sign, she is told to go to a named facility now and her CHEW gets an SMS straight away.

Built for the **USPF Changemaker Challenge 2026, Healthcare sector**: Angle 2 (preventive information and reminders), with Angle 1 (navigation to care) and Angle 3 (follow-up tools for frontline staff).

## The problem it answers

- Maternal mortality in Nigeria is about 993 deaths per 100,000 live births (WHO estimate, cited by Nigeria Health Watch, 2025).
- About 2.1 million infants, 24% of under-ones, have had no vaccine at all (UNICEF, 2025).
- There is about 1 doctor per 9,083 people, against a recommended 1 per 600 (The Lancet, cited by Nigeria Health Watch).
- Only 28% of Nigerian adults own a smartphone (Research ICT Africa, 2022), so the service runs on USSD and SMS.

## What works today

| Part | Status |
|---|---|
| Self-registration by USSD (pregnancy by months, or baby by weeks), ending with a consent question | Working, tested |
| CHEW registration of mothers from any phone after a PIN, with Nigerian number formats and a duplicate check | Working, tested |
| Mother's consent before any reminder: reply YES by SMS or press 1 on USSD; NO or STOP deletes her details | Working, tested |
| CHEW PINs stored hashed, 15-minute lockout after 3 wrong tries, PIN change by USSD | Working, tested |
| Danger-sign menus (pregnancy, after birth, baby) leading to emergency advice in 2–3 key presses | Working, tested |
| Instant SMS alert to the mother's CHEW, plus a dashboard alert | Working |
| Antenatal reminders on the WHO 8-contact schedule | Working, tested |
| Vaccine reminders on Nigeria's routine schedule | Working, tested |
| Missed visit or vaccine leads to an SMS to the mother and a CHEW follow-up | Working, tested |
| Weekly tips matched to pregnancy week or baby age | Working |
| Free-text questions: safety rules, then Claude when a key is set, then validated answers | Working; live Claude path not yet tested |
| "I went for my visit" confirmation by USSD | Working |
| Health worker dashboard with alerts, follow-ups, mothers and a demo clock | Working |
| Real USSD and SMS through Africa's Talking | Code ready; needs your sandbox key |

All 28 automated checks pass (`npm test`). They include the rule that every USSD screen fits 182 characters and uses only GSM-safe characters in all five languages.

## Registration, consent and PINs

**A health worker registering a mother**

1. She dials the code from her own phone, which is on the roster in `knowledge/directory.json`, and enters her 4-digit PIN.
2. She picks **1. Register pregnant woman** or **2. Register baby** and enters the mother's number, language, months of pregnancy (or baby's age in weeks) and village.
3. MamaLine refuses a number that is already registered.
4. The mother is saved as **awaiting consent**. The only thing sent to her is an SMS explaining what MamaLine stores and who sees it, asking her to reply YES or NO.

**The mother's consent**

- She agrees by replying **YES** to the SMS, or by dialling the code and pressing **1**. Her welcome SMS and reminders start only then.
- **NO**, or pressing **2**, deletes her details. **STOP** at any time later does the same, and every welcome SMS tells her so.
- Replies also understand common words for yes and no in Pidgin, Hausa, Yoruba and Igbo.
- While she is awaiting consent, she can still press **0** for danger-sign help. Emergency help never waits for consent.
- If she has not answered after 3 days, her health worker gets a follow-up to explain MamaLine or remove her.
- A mother who registers herself sees the same explanation on screen and must press **1. I agree** before anything is saved.

**Health worker PINs**

- PINs are stored only as salted scrypt hashes, never in plain text.
- 3 wrong PINs in 15 minutes lock that health worker out for 15 minutes.
- Health workers change their PIN with option **4**. Easy PINs such as 1111, 1234 or 9876 are refused.
- A supervisor sets or resets a PIN with `npm run set-pin -- chew-amina 4821`.
- The sample PINs from `npm run seed` are Amina 2468, Bisi 1357 and Ngozi 8642.
- On USSD the PIN travels inside the session text, so the USSD gateway can see it. The PIN protects against a lost or shared phone, not against the gateway.

Consent wording exists in English and Pidgin. Hausa, Yoruba and Igbo speakers see English until a legal and medical translator has reviewed the text.

## Run it

Needs Node.js 22.9 or later.

```bash
npm install
```

```bash
npm run seed
```

```bash
npm start
```

Open http://localhost:3001 for the phone simulator and http://localhost:3001/admin for the health worker dashboard. `npm run seed` adds six sample mothers (one awaiting consent), all marked "sample", and the sample health worker PINs. Copy `.env.example` to `.env` to turn on Claude or real SMS.

## Demo script (about 2 minutes, for your application video)

1. **Simulator: New mother.** Dial, choose a language, press `1` (pregnant), `6` months, type `Kura`, then `1` to agree. Show the welcome SMS, the due-visit reminder and the tip arriving.
2. **Health worker registration.** Switch to CHEW Amina, enter PIN `2468` and register `08031234567`. Switch to that number: only the consent SMS has arrived. Reply `YES` in the SMS box and the welcome SMS follows.
3. **Danger sign.** Dial again, press `1` then `1` (bleeding). The screen says go to Kura PHC now and call 112. In the same moment the health worker's phone panel shows the alert to CHEW Amina.
4. **A hidden danger.** Press `2` and type `my legs dey swell and my head dey pain me`. The safety rules catch the headache and treat it as an emergency, even though it came in as a question.
5. **A routine question.** Press `2` and type `can I take agbo`. A validated answer comes back.
6. **Dashboard.** Show the alerts, then press **+1 week**. Missed visits move into the follow-up list and reminder SMS go out. Press **Record birth** on a pregnant mother to switch her to vaccine reminders.
7. Close with: "One doctor serves about 9,000 people. MamaLine gives every mother a reminder service and a direct line to her CHEW, from the cheapest basic phone."

## How the AI is used, and how it is kept safe

1. **Safety rules come first.** Every free-text message goes through rules in `src/triage.js`, written in English and Pidgin with some Hausa, Yoruba and Igbo terms. If they find a danger sign, the message is an emergency, whatever the AI says.
2. **The AI can only raise urgency.** Claude (default `claude-opus-5-5`, medium effort) grades each message as EMERGENCY, SOON or ROUTINE and writes the reply. The final level is the higher of the rules' level and Claude's.
3. **Answers come only from validated messages.** Claude is told to answer only from `knowledge/content.json`. It must never diagnose, name or dose medicines, or tell a mother she does not need care.
4. **Emergency SMS are fixed templates**, not AI text. They name the facility and 112.
5. **Translation.** Hausa, Yoruba and Igbo SMS are translated by Claude when a key is set, with a 5–8 second timeout, so urgent messages are never held up.
6. **Fallbacks.** Requests use server-side `fallbacks: "default"`. If the API fails or no key is set, the rules and validated answers still work, so the service never goes silent.

Without an API key, MamaLine runs on rules and validated messages only. The live Claude path has been checked only up to authentication (no key was available while building). Run a few messages with a real key before you demo it.

## Put it on a real USSD code (Africa's Talking sandbox)

1. Create a free account at africastalking.com, open the **Sandbox** app and copy its API key.
2. Expose your server with a tunnel, for example `npx localtunnel --port 3001` or `cloudflared tunnel --url http://localhost:3001`.
3. In the sandbox, create a USSD channel and set its callback URL to `https://<your-tunnel>/ussd`.
4. In `.env` set `AT_USERNAME=sandbox`, `AT_API_KEY=<key>` and `USSD_CODE=<your code>`, then restart.
5. To receive CHEW alerts on your own phone, put your number in `knowledge/directory.json`. SMS are never sent to the sample range `+2348000000xxx`.

## Before real mothers use it

- **Clinical review.** A midwife, nurse or doctor must review and approve every message in `knowledge/content.json`, the danger-sign lists in `src/i18n.js` and the rules in `src/triage.js`.
- **Professional translation.** The Hausa, Yoruba and Igbo menus are drafts. Danger-sign lists and SMS templates in those languages need a medical translator.
- **Real directory.** Replace the sample facilities with Nigeria Health Facility Registry data, and the sample CHEWs with the state primary health care board's roster.
- **Data protection.** Pregnancy status is sensitive health data under the Nigeria Data Protection Act 2023. Consent and deletion are in place; still to do: have a lawyer review the consent wording, encrypt the store, set a retention policy for the SMS log, and complete a data protection impact assessment.
- **Storage.** The JSON file store is fine for a demo; use Postgres or SQLite for a pilot.
- **Schedules.** Confirm the vaccine list against the current NPHCDA schedule for your state.

## Roadmap

1. **Voice line (IVR)** in local languages, using speech models such as N-ATLaS, for mothers who cannot read.
2. **Two-way SMS**, so mothers can reply to reminders without dialling.
3. **Defaulter risk score**, trained on visit history, to tell CHEWs who to call first.
4. **DHIS2 export**, so visits confirmed on MamaLine feed state health records.

## Project layout

```
server.js                 HTTP server: /ussd callback, simulator, dashboard, JSON API, scheduler
src/ussd.js               USSD menus for mothers, new callers and health workers
src/triage.js             Rule-based danger-sign detection (runs before the AI)
src/ai.js                 Claude grading, answers and translation, with fallbacks
src/schedule.js           Antenatal and vaccine schedules, reminder windows, tips
src/actions.js            Registration, emergencies, replies, reminders, follow-ups
src/i18n.js               USSD screens and SMS templates in 5 languages (GSM-safe)
src/directory.js          Facilities, health workers, phone number normalisation
src/sms.js                Africa's Talking SMS, or simulated outbox
src/store.js              JSON-file store and demo clock
knowledge/content.json    Validated tips and FAQ answers (demo content, needs clinical review)
knowledge/directory.json  Sample facilities and CHEWs
public/                   Phone simulator and health worker dashboard
test/                     node:test suite
```
