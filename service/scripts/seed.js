// Adds clearly marked SAMPLE records so the dashboard has something to show in a demo.
// Run `npm run seed` while the server is stopped, then `npm start`.
// Sample numbers use the +2348000000xxx range, which the SMS module never sends to for real.
import { DAY } from "../src/schedule.js";
import { createStore } from "../src/store.js";

const store = createStore();
const now = store.now();
const iso = (ms) => new Date(ms).toISOString();
const weeks = (n) => n * 7 * DAY;

// Sample health worker PINs (hashed in the store). Real PINs: npm run set-pin.
const SAMPLE_PINS = { "chew-amina": "2468", "chew-bisi": "1357", "chew-ngozi": "8642" };
for (const [id, pin] of Object.entries(SAMPLE_PINS)) store.setPin(id, pin);

const consented = (registeredAt) => ({ status: "given", at: registeredAt, channel: "sms" });

function pregnant({ phone, lang, gestation, registeredWeeksAgo, location, facilityId, healthWorkerId, done = [], consent }) {
  store.setLang(phone, lang);
  const registeredAt = iso(now - weeks(registeredWeeksAgo));
  return store.addMother({
    sample: true, phone, lang, status: "pregnant", location, facilityId, healthWorkerId, registeredBy: healthWorkerId,
    edd: iso(now + weeks(40 - gestation)), dob: null, registeredAt,
    done: Object.fromEntries(done.map((k) => [k, iso(now - weeks(1))])),
    consent: consent ?? consented(registeredAt),
  });
}

function baby({ phone, lang, ageWeeks, location, facilityId, healthWorkerId, done = [] }) {
  store.setLang(phone, lang);
  const registeredAt = iso(now - weeks(ageWeeks));
  return store.addMother({
    sample: true, phone, lang, status: "baby", location, facilityId, healthWorkerId, registeredBy: healthWorkerId,
    edd: null, dob: iso(now - weeks(ageWeeks)), registeredAt,
    done: Object.fromEntries(done.map((k) => [k, iso(now - weeks(1))])),
    consent: consented(registeredAt),
  });
}

// Hausa speaker in Kura, 29 weeks: her week-30 visit is due in about a week.
pregnant({ phone: "+2348000000201", lang: "ha", gestation: 29, registeredWeeksAgo: 12, location: "Kura", facilityId: "kura-phc", healthWorkerId: "chew-amina", done: ["anc-20", "anc-26"] });
// Pidgin speaker in Bunkure, 36 weeks: missed her week-34 visit.
pregnant({ phone: "+2348000000202", lang: "pcm", gestation: 36, registeredWeeksAgo: 8, location: "Bunkure", facilityId: "bunkure-phc", healthWorkerId: "chew-amina", done: ["anc-30"] });
// Yoruba speaker in Ikire with a 5-week-old: 6-week vaccines due next week.
baby({ phone: "+2348000000203", lang: "yo", ageWeeks: 5, location: "Ikire", facilityId: "ikire-phc", healthWorkerId: "chew-bisi", done: ["vx-birth"] });
// English speaker in Nsukka with a 12-week-old: missed the 10-week vaccines.
baby({ phone: "+2348000000204", lang: "en", ageWeeks: 12, location: "Nsukka", facilityId: "nsukka-phc", healthWorkerId: "chew-ngozi", done: ["vx-birth", "vx-6w"] });
// Reported bleeding at 33 weeks this morning.
const m5 = pregnant({ phone: "+2348000000205", lang: "ha", gestation: 33, registeredWeeksAgo: 20, location: "Dawakin Kudu", facilityId: "dawakin-gh", healthWorkerId: "chew-amina", done: ["anc-20", "anc-26", "anc-30"] });

// Registered by CHEW Amina 4 days ago and has not replied to the consent request yet.
pregnant({
  phone: "+2348000000206", lang: "pcm", gestation: 18, registeredWeeksAgo: 4 / 7, location: "Kura", facilityId: "kura-phc", healthWorkerId: "chew-amina",
  consent: { status: "pending", requestedAt: iso(now - 4 * DAY) },
});

store.addAlert({
  sample: true, phone: m5.phone, motherId: m5.id, group: "pregnant", sign: "bleeding", signEnglish: "Bleeding", source: "menu",
  location: "Dawakin Kudu", facilityId: "dawakin-gh", healthWorkerId: "chew-amina", detail: "about 33 weeks pregnant",
});
store.addQuestion({
  sample: true, phone: "+2348000000202", lang: "pcm", kind: "question", text: "I fit take agbo for this belle?", level: "routine", ruleSigns: [], source: "rules",
  answer: "MamaLine: No take agbo or any herbal mixture when you get belle or dey breastfeed if health worker never approve. Some fit harm you and your pikin.",
});

console.log("Added 6 sample mothers (1 awaiting consent), 1 urgent alert, 1 question and sample CHEW PINs (Amina 2468, Bisi 1357, Ngozi 8642).");
console.log("Reminders and follow-ups are generated when the server starts.");
