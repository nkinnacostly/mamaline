import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyPin, weakPin } from "../src/auth.js";
import { normalizePhone } from "../src/directory.js";
import { LANG_CODES, SIGN_GROUPS, sms } from "../src/i18n.js";
import { inboundAction, parseReply } from "../src/inbound.js";
import { DAY, dueEvents, eddFromMonths, dobFromWeeks, findContent, nextItem, TIPS, FAQ } from "../src/schedule.js";
import { createStore, hasConsent } from "../src/store.js";
import { ruleTriage } from "../src/triage.js";
import { handleUssd } from "../src/ussd.js";

const USSD_MAX = 182;
const SMS_MAX = 306;
const CHEW_PHONE = "+2348000000101";
const PIN = "2468";

const fresh = () => ({ store: createStore(null), sessions: new Map() });

function dial(ctx, phone, inputs, sessionId = "s1") {
  const replies = [];
  let text = "";
  replies.push(handleUssd({ sessionId, phoneNumber: phone, text }, ctx));
  for (const input of inputs) {
    text = text === "" ? input : `${text}*${input}`;
    replies.push(handleUssd({ sessionId, phoneNumber: phone, text }, ctx));
  }
  return replies;
}

function registered(ctx, phone, { status = "pregnant", weeksAgoRegistered = 0, gestation = 28, babyWeeks = 5, lang = "en", consent = { status: "given" } } = {}) {
  const now = ctx.store.now();
  ctx.store.setLang(phone, lang);
  return ctx.store.addMother({
    phone, lang, status, location: "Kura", facilityId: "kura-phc", healthWorkerId: "chew-amina", registeredBy: "self", consent,
    registeredAt: new Date(now - weeksAgoRegistered * 7 * DAY).toISOString(),
    edd: status === "pregnant" ? new Date(now + (40 - gestation) * 7 * DAY).toISOString() : null,
    dob: status === "baby" ? new Date(now - babyWeeks * 7 * DAY).toISOString() : null,
  });
}

test("a new caller chooses a language, agrees, then registers a pregnancy", () => {
  const ctx = fresh();
  const replies = dial(ctx, "+2348011111111", ["2", "1", "6", "Kura", "1"]);
  assert.match(replies[0].reply, /^CON Welcome to MamaLine/);
  assert.match(replies[1].reply, /^CON MamaLine: free help for mothers\n1\. I get belle/);
  assert.match(replies[4].reply, /^CON MamaLine dey send free health SMS.*\n1\. I agree\n2\. No$/s);
  const last = replies.at(-1);
  assert.match(last.reply, /^END Welcome to MamaLine\. Your belle be like 26 weeks/);
  assert.deepEqual(last.actions.at(-1), { type: "register", phone: "+2348011111111", lang: "pcm", status: "pregnant", months: 6, location: "Kura", registeredBy: "self", consentChannel: "ussd" });
});

test("a new caller who says no is not registered", () => {
  const ctx = fresh();
  ctx.store.setLang("+2348011111112", "en");
  const last = dial(ctx, "+2348011111112", ["2", "6", "Kura", "2"]).at(-1);
  assert.equal(last.reply, "END OK. Nothing has been saved.");
  assert.deepEqual(last.actions, []);
});

test("a registered pregnant mother reaches emergency advice in two key presses", () => {
  const ctx = fresh();
  registered(ctx, "+2348022222222");
  const last = dial(ctx, "+2348022222222", ["1", "1"]).at(-1);
  assert.match(last.reply, /^END DANGER SIGN\. Go to Kura PHC \(sample\) now\. Call 112.*alerted\./);
  assert.equal(last.actions[0].type, "emergency");
  assert.equal(last.actions[0].sign, "bleeding");
});

test("an unregistered caller with a sick baby gets the facility for their village", () => {
  const ctx = fresh();
  ctx.store.setLang("+2348033333333", "en");
  const last = dial(ctx, "+2348033333333", ["3", "3", "1", "Ikire"]).at(-1);
  assert.match(last.reply, /Go to Ikire PHC \(sample\) now/);
  assert.equal(last.actions[0].group, "baby");
  assert.equal(last.actions[0].sign, "feeding");
});

test("unknown places do not claim a health worker was alerted", () => {
  const ctx = fresh();
  ctx.store.setLang("+2348044444444", "en");
  const last = dial(ctx, "+2348044444444", ["3", "1", "2", "Somewhere Else"]).at(-1);
  assert.match(last.reply, /the nearest health facility/);
  assert.doesNotMatch(last.reply, /alerted/);
});

test("a health worker signs in with her PIN and registers a mother pending consent", () => {
  const ctx = fresh();
  ctx.store.setPin("chew-amina", PIN);
  const replies = dial(ctx, CHEW_PHONE, [PIN, "1", "0803 123 4567", "3", "4", "Bunkure"]);
  assert.equal(replies[0].reply, "CON MamaLine Health Worker\nEnter your 4-digit PIN:");
  assert.match(replies[1].reply, /^CON MamaLine Health Worker\n1\. Register pregnant woman/);
  const last = replies.at(-1);
  assert.match(last.reply, /^END Consent request sent to \+2348031234567\. Reminders start once she agrees/);
  assert.equal(last.actions[0].healthWorkerId, "chew-amina");
  assert.equal(last.actions[0].lang, "ha");
  assert.equal(last.actions[0].months, 4);
});

test("a wrong PIN is refused, and 3 wrong PINs lock the health worker out", () => {
  const ctx = fresh();
  ctx.store.setPin("chew-amina", PIN);
  assert.match(dial(ctx, CHEW_PHONE, ["1111"], "a").at(-1).reply, /^END Wrong PIN/);
  assert.match(dial(ctx, CHEW_PHONE, ["2222"], "b").at(-1).reply, /^END Wrong PIN/);
  assert.match(dial(ctx, CHEW_PHONE, ["3333"], "c").at(-1).reply, /^END Too many wrong PINs/);
  // Even the right PIN is refused while locked.
  assert.match(dial(ctx, CHEW_PHONE, [PIN], "d").at(-1).reply, /^END Too many wrong PINs/);
});

test("a health worker without a PIN cannot sign in", () => {
  assert.match(dial(fresh(), CHEW_PHONE, ["1234"]).at(-1).reply, /^END Your PIN is not set yet/);
});

test("PINs are stored hashed, never in plain text", () => {
  const ctx = fresh();
  ctx.store.setPin("chew-amina", PIN);
  const saved = JSON.stringify(ctx.store.snapshot().workerPins);
  assert.doesNotMatch(saved, new RegExp(PIN));
  assert.ok(verifyPin(PIN, ctx.store.getPin("chew-amina")));
  assert.ok(!verifyPin("8642", ctx.store.getPin("chew-amina")));
});

test("a health worker can change her PIN, but not to an easy one", () => {
  const ctx = fresh();
  ctx.store.setPin("chew-amina", PIN);
  assert.match(dial(ctx, CHEW_PHONE, [PIN, "4", "1234"], "a").at(-1).reply, /too easy to guess/);
  assert.match(dial(ctx, CHEW_PHONE, [PIN, "4", "5170", "5171"], "b").at(-1).reply, /did not match/);
  const last = dial(ctx, CHEW_PHONE, [PIN, "4", "5170", "5170"], "c").at(-1);
  assert.equal(last.reply, "END Your PIN has been changed.");
  assert.deepEqual(last.actions, [{ type: "setPin", healthWorkerId: "chew-amina", pin: "5170" }]);
  assert.ok(weakPin("0000") && weakPin("9876") && !weakPin("2468"));
});

test("a health worker cannot register a mother twice", () => {
  const ctx = fresh();
  ctx.store.setPin("chew-amina", PIN);
  registered(ctx, "+2348031234567");
  assert.match(dial(ctx, CHEW_PHONE, [PIN, "1", "08031234567"]).at(-1).reply, /^END \+2348031234567 is already on MamaLine/);
});

test("a mother awaiting consent sees the consent screen and can still get emergency help", () => {
  const ctx = fresh();
  registered(ctx, "+2348055555555", { consent: { status: "pending" } });
  assert.match(dial(ctx, "+2348055555555", []).at(-1).reply, /^CON Your health worker registered you.*\n1\. I agree\n2\. No, delete my details\n0\. Danger sign$/s);
  assert.deepEqual(dial(ctx, "+2348055555555", ["1"], "a").at(-1).actions, [{ type: "consent", phone: "+2348055555555", answer: "yes", channel: "ussd" }]);
  assert.deepEqual(dial(ctx, "+2348055555555", ["2"], "b").at(-1).actions, [{ type: "consent", phone: "+2348055555555", answer: "no", channel: "ussd" }]);
  const emergency = dial(ctx, "+2348055555555", ["0", "1"], "c").at(-1);
  assert.match(emergency.reply, /^END DANGER SIGN/);
  assert.equal(emergency.actions[0].type, "emergency");
});

test("no reminders or tips go to a mother before she consents", () => {
  const ctx = fresh();
  const mother = registered(ctx, "+2348066666666", { gestation: 29, consent: { status: "pending" } });
  assert.equal(hasConsent(mother), false);
  assert.ok(dueEvents(mother, ctx.store.now()).length > 0, "events would be due if she had consented");
});

test("SMS replies are read as yes, no or nothing", () => {
  for (const yes of ["YES", "yes please", "Y", "Eh", "Ee", "Beeni", "Bẹ́ẹ̀ni", "I agree", "1"]) assert.equal(parseReply(yes), "yes", yes);
  for (const no of ["NO", "Stop", "STOP!", "A'a", "Rara", "Mba", "2"]) assert.equal(parseReply(no), "no", no);
  for (const other of ["hello", "", "when is my visit"]) assert.equal(parseReply(other), null, other);
});

test("an SMS YES confirms a pending mother; STOP removes an active one", () => {
  const ctx = fresh();
  registered(ctx, "+2348077777777", { consent: { status: "pending" } });
  registered(ctx, "+2348088888888");
  assert.deepEqual(inboundAction({ from: "+2348077777777", text: "Yes" }, ctx), { type: "consent", phone: "+2348077777777", answer: "yes", channel: "sms" });
  assert.equal(inboundAction({ from: "+2348088888888", text: "YES" }, ctx), null);
  assert.deepEqual(inboundAction({ from: "+2348088888888", text: "STOP" }, ctx), { type: "consent", phone: "+2348088888888", answer: "no", channel: "sms" });
  assert.equal(inboundAction({ from: "+2348099999999", text: "YES" }, ctx), null);
});

test("deleting a mother removes her details and follow-ups", () => {
  const ctx = fresh();
  const mother = registered(ctx, "+2348012121212");
  ctx.store.addFollowup({ motherId: mother.id, phone: mother.phone, itemKey: "anc-30", reason: "x" });
  ctx.store.deleteMother(mother.id);
  const data = ctx.store.snapshot();
  assert.equal(data.mothers.length, 0);
  assert.equal(data.users[mother.phone], undefined);
  assert.equal(data.followups.length, 0);
});

test("every USSD screen fits a basic phone in every language", () => {
  const newPaths = [[], ["1"], ["1", "5"], ["1", "5", "Kura"], ["2"], ["2", "3"], ["2", "3", "Kura"], ["3"], ["4"], ["4", "hi"], ["9"]];
  for (const g of [1, 2, 3]) newPaths.push(["3", `${g}`], ["3", `${g}`, "1"], ["3", `${g}`, "1", "Dawakin Kudu"], ["3", `${g}`, "0"], ["3", `${g}`, "0", "x"]);
  const motherPaths = [[], ["1"], ["1", "1"], ["1", "0"], ["1", "0", "x"], ["2"], ["3"], ["4"], ["5"], ["5", "1"], ["5", "2"], ["6"], ["6", "3"]];
  const babyPaths = [["1"], ["1", "1"], ["1", "2"], ["1", "2", "7"], ["1", "1", "4"], ["3"], ["5"]];
  const check = (reply, label) => {
    const screen = reply.slice(4);
    assert.ok(screen.length <= USSD_MAX, `${label} is ${screen.length} chars:\n${screen}`);
    assert.match(screen, /^[\x20-\x7E\n]+$/, `${label} has non-GSM characters`);
  };
  for (const lang of LANG_CODES) {
    for (const p of newPaths) {
      const ctx = fresh();
      ctx.store.setLang("+234801", lang);
      check(dial(ctx, "+234801", p).at(-1).reply, `${lang} new ${p.join("*")}`);
    }
    for (const p of motherPaths) {
      const ctx = fresh();
      registered(ctx, "+234802", { lang, gestation: 29 });
      check(dial(ctx, "+234802", p).at(-1).reply, `${lang} pregnant ${p.join("*")}`);
    }
    for (const p of babyPaths) {
      const ctx = fresh();
      registered(ctx, "+234803", { lang, status: "baby", babyWeeks: 6 });
      check(dial(ctx, "+234803", p).at(-1).reply, `${lang} baby ${p.join("*")}`);
    }
  }
  for (const lang of LANG_CODES) {
    for (const p of [["2", "6", "Kura"], ["2", "6", "Kura", "1"], ["2", "6", "Kura", "2"], ["1", "5", "Kura", "1"]]) {
      const ctx = fresh();
      ctx.store.setLang("+234804", lang);
      check(dial(ctx, "+234804", p).at(-1).reply, `${lang} self-consent ${p.join("*")}`);
    }
    for (const p of [[], ["1"], ["2"], ["0"], ["0", "1"]]) {
      const ctx = fresh();
      registered(ctx, "+234805", { lang, consent: { status: "pending" } });
      check(dial(ctx, "+234805", p).at(-1).reply, `${lang} pending ${p.join("*")}`);
    }
  }
  const chewPaths = [[], ["9999"], [PIN], [PIN, "1"], [PIN, "1", "08031234567"], [PIN, "1", "08031234567", "1"], [PIN, "1", "08031234567", "1", "5"], [PIN, "1", "08031234567", "1", "5", "Kura"], [PIN, "2", "08031234567", "1"], [PIN, "3"], [PIN, "4"], [PIN, "4", "1111"], [PIN, "4", "5170"], [PIN, "4", "5170", "5170"], [PIN, "4", "5170", "1234"]];
  for (const p of chewPaths) {
    const ctx = fresh();
    ctx.store.setPin("chew-amina", PIN);
    check(dial(ctx, CHEW_PHONE, p).at(-1).reply, `chew ${p.join("*")}`);
  }
  check(dial(fresh(), CHEW_PHONE, ["1234"]).at(-1).reply, "chew no PIN");
});

test("every SMS fits two segments with the longest real values", () => {
  const vars = { weeks: 38, next: "antenatal visit (week 40), Wed 30 Dec", facility: "Dawakin Kudu General Hospital (sample)", code: "*384*2#", week: 40, label: "15-month", names: "Penta 3, PCV 3, OPV 3, IPV, Rota 3", date: "Wed 30 Dec", sign: "Fever or bad-smelling discharge", worker: "Ngozi (sample CHEW)", lga: "Dawakin Kudu", state: "Kano", services: "emergency obstetric care, caesarean section, blood" };
  const keys = ["consentRequest", "optedOut", "welcomePregnant", "welcomeBaby", "ancPre", "ancDue", "ancMissed", "vaccinePre", "vaccineDue", "vaccineMissed", "emergencyMother", "emergencyBaby", "soon", "noAnswer", "clinic"];
  for (const lang of ["en", "pcm"]) {
    for (const key of keys) {
      const text = sms(lang, key, vars);
      assert.ok(text.length <= SMS_MAX, `${lang}/${key} is ${text.length} chars`);
      assert.doesNotMatch(text, /\{\w+\}/, `${lang}/${key} has an unfilled placeholder`);
    }
  }
  for (const entry of [...TIPS, ...FAQ]) {
    for (const [lang, text] of Object.entries(entry.sms)) {
      assert.ok(text.length <= SMS_MAX, `${entry.id}/${lang} is ${text.length} chars`);
      assert.match(text, /^[\x20-\x7E]+$/, `${entry.id}/${lang} has non-ASCII characters`);
    }
  }
});

test("every danger-sign group fits the 1-9 keypad", () => {
  for (const signs of Object.values(SIGN_GROUPS)) assert.ok(signs.length <= 9);
});

test("rules catch danger signs in plain words and Pidgin", () => {
  assert.equal(ruleTriage("I dey see blood small small").level, "emergency");
  assert.equal(ruleTriage("my baby no dey suck breast since morning").level, "emergency");
  assert.equal(ruleTriage("my face and hands are swollen").level, "emergency");
  assert.equal(ruleTriage("water broke this morning").level, "emergency");
  assert.equal(ruleTriage("pikin body hot well well").level, "emergency");
  assert.equal(ruleTriage("baby eyes yellow").level, "emergency");
});

test("rules do not raise false alarms for common questions", () => {
  assert.equal(ruleTriage("when is the yellow fever vaccine").level, "routine");
  assert.equal(ruleTriage("what does my blood test result mean").level, "routine");
  assert.equal(ruleTriage("what food should I eat").level, "routine");
  assert.equal(ruleTriage("my feet are swollen").level, "soon");
  assert.equal(ruleTriage("I have back pain").level, "soon");
});

test("offline answers come from validated content", () => {
  assert.equal(findContent("can I take agbo").id, "faq-herbs");
  assert.equal(findContent("what food should I eat").id, "preg-16");
  assert.equal(findContent("how do I prevent malaria").id, "preg-12");
});

test("visit reminders go out before, on, and after the due date, once each", () => {
  const ctx = fresh();
  const mother = registered(ctx, "+234805", { gestation: 29 }); // week 30 visit due in about a week
  const visit = nextItem(mother, ctx.store.now());
  assert.equal(visit.key, "anc-30");
  const stagesAt = (ms) => dueEvents(mother, ms).filter((e) => e.type === "reminder").map((e) => e.key);
  assert.deepEqual(stagesAt(visit.due - 3 * DAY), []);
  assert.deepEqual(stagesAt(visit.due - 1 * DAY), ["anc-30:pre"]);
  assert.deepEqual(stagesAt(visit.due + 1 * DAY), ["anc-30:due"]);
  assert.deepEqual(stagesAt(visit.due + 8 * DAY), ["anc-30:missed"]);
  mother.sent["anc-30:missed"] = "x";
  assert.deepEqual(stagesAt(visit.due + 9 * DAY), []);
  mother.done["anc-30"] = "x";
  assert.equal(nextItem(mother, visit.due + 9 * DAY).key, "anc-34");
});

test("babies get vaccine reminders from the national schedule", () => {
  const ctx = fresh();
  const mother = registered(ctx, "+234806", { status: "baby", babyWeeks: 5 });
  const next = nextItem(mother, ctx.store.now());
  assert.equal(next.key, "vx-6w");
  assert.match(next.names, /Penta 1/);
});

test("visits due before registration are not chased", () => {
  const ctx = fresh();
  const mother = registered(ctx, "+234807", { gestation: 33 });
  assert.equal(nextItem(mother, ctx.store.now()).key, "anc-34");
});

test("pregnancy dates come out right", () => {
  const now = Date.UTC(2026, 10, 14);
  assert.equal(Math.round((Date.parse(eddFromMonths(9, now)) - now) / (7 * DAY)), 1);
  assert.equal(Math.round((now - Date.parse(dobFromWeeks(6, now))) / (7 * DAY)), 6);
});

test("Nigerian phone numbers are normalised", () => {
  assert.equal(normalizePhone("0803 123 4567"), "+2348031234567");
  assert.equal(normalizePhone("2348031234567"), "+2348031234567");
  assert.equal(normalizePhone("+234 803 123 4567"), "+2348031234567");
  assert.equal(normalizePhone("12345"), null);
});

test("the scheduler sends nothing before consent and flags the mother after 3 days", async () => {
  const { processMother } = await import("../src/actions.js");
  const ctx = fresh();
  const mother = registered(ctx, "+2348000000299", { gestation: 29, consent: { status: "pending" } });
  await processMother(ctx.store, mother);
  assert.equal(ctx.store.snapshot().outbox.length, 0);
  assert.equal(ctx.store.snapshot().followups.length, 0);
  ctx.store.advanceClock(3);
  await processMother(ctx.store, ctx.store.getMother(mother.id));
  const data = ctx.store.snapshot();
  assert.equal(data.outbox.length, 0);
  assert.equal(data.followups.length, 1);
  assert.match(data.followups[0].reason, /Has not agreed/);
});
