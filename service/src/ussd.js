import { MAX_PIN_FAILURES, PIN_PATTERN, verifyPin, weakPin } from "./auth.js";
import { getFacility, healthWorkerByPhone, matchFacility, matchHealthWorker, normalizePhone } from "./directory.js";
import { CHEW, CHOOSE_LANGUAGE, LANG_CODES, SIGN_GROUPS, signMenu, t } from "./i18n.js";
import { confirmableItem, formatDate, gestationalWeeks, nextItem } from "./schedule.js";
import { hasConsent } from "./store.js";

export const USSD_CODE = process.env.USSD_CODE ?? "*384*2#";

// Handles one USSD request in the Africa's Talking callback format.
// `text` is everything typed this session, joined by "*" (e.g. "1*3").
// Returns the screen ("CON ..." keeps the session open, "END ..." closes it) and actions to run after replying.
export function handleUssd({ sessionId, phoneNumber, text = "" }, { store, sessions }) {
  const parts = text === "" ? [] : text.split("*");
  const worker = healthWorkerByPhone(phoneNumber);
  if (worker) return routeHealthWorker(parts, { worker, store });

  // New callers pick a language first. Remember per session whether they did, so every
  // later request in the session is parsed the same way.
  if (parts.length === 0) sessions.set(sessionId, { askedLanguage: !store.getLang(phoneNumber) });
  const session = sessions.get(sessionId) ?? { askedLanguage: !store.getLang(phoneNumber) };
  sessions.set(sessionId, session);

  const actions = [];
  let path = parts;
  let lang = store.getLang(phoneNumber) ?? "en";
  if (session.askedLanguage) {
    if (parts.length === 0) return con(CHOOSE_LANGUAGE);
    const chosen = LANG_CODES[Number(parts[0]) - 1];
    if (!chosen) return end(t("en", "invalid"));
    lang = chosen;
    if (parts.length === 1) actions.push({ type: "setLang", phone: phoneNumber, lang });
    path = parts.slice(1);
  }

  const ctx = { lang, phone: phoneNumber, store, now: store.now() };
  const mother = store.findMother(phoneNumber);
  let reply;
  if (!mother) reply = routeNewCaller(path, ctx);
  else if (!hasConsent(mother)) reply = routeAwaitingConsent(path, { ...ctx, mother });
  else reply = routeMother(path, { ...ctx, mother });
  return { ...reply, actions: [...actions, ...reply.actions] };
}

// Callers who have not registered yet. Registration ends with a consent question;
// nothing is stored unless she agrees.
function routeNewCaller(path, { lang, phone }) {
  const [choice, ...rest] = path;
  if (choice === undefined) return con(t(lang, "newMain"));
  switch (choice) {
    case "1":
    case "2": {
      const pregnant = choice === "1";
      if (rest.length === 0) return con(t(lang, pregnant ? "askMonths" : "askBabyWeeks"));
      const n = Number(rest[0]);
      const valid = pregnant ? n >= 1 && n <= 9 : n >= 0 && n <= 52;
      if (!Number.isInteger(n) || !valid) return end(t(lang, "invalid"));
      if (rest.length === 1) return con(t(lang, "askLocation"));
      const location = rest[1].trim();
      if (!location) return end(t(lang, "invalid"));
      if (rest.length === 2) return con(t(lang, "consentAsk"));
      if (rest[2] === "2") return end(t(lang, "selfRefused"));
      if (rest[2] !== "1") return end(t(lang, "invalid"));
      const registration = { type: "register", phone, lang, status: pregnant ? "pregnant" : "baby", location, registeredBy: "self", consentChannel: "ussd" };
      registration[pregnant ? "months" : "weeks"] = n;
      const screen = pregnant ? t(lang, "welcomePregnant", { weeks: Math.round(n * 4.33) }) : t(lang, "welcomeBaby");
      return end(screen, [registration]);
    }
    case "3": {
      // Danger sign from someone not registered: who -> sign -> location (to find a facility).
      if (rest.length === 0) return con(t(lang, "whoNeedsHelp"));
      const group = ["pregnant", "mother", "baby"][Number(rest[0]) - 1];
      if (!group) return end(t(lang, "invalid"));
      return dangerFlow(rest.slice(1), { lang, phone, group, needsLocation: true });
    }
    case "4":
      return questionFlow(rest, { lang, phone });
    default:
      return end(t(lang, "invalid"));
  }
}

// A health worker registered her, but she has not agreed yet. Nothing is sent to her
// until she does. Emergency help is always available, consent or not.
function routeAwaitingConsent(path, { lang, phone, mother }) {
  const [choice, ...rest] = path;
  if (choice === undefined) return con(t(lang, "consentPending"));
  if (choice === "1") return end(t(lang, "consentThanks"), [{ type: "consent", phone, answer: "yes", channel: "ussd" }]);
  if (choice === "2") return end(t(lang, "consentRefused"), [{ type: "consent", phone, answer: "no", channel: "ussd" }]);
  if (choice === "0") {
    const facilityName = getFacility(mother.facilityId)?.name ?? null;
    const group = mother.status === "pregnant" ? "pregnant" : "baby";
    return dangerFlow(rest, { lang, phone, group, facilityName, hasWorker: Boolean(mother.healthWorkerId) });
  }
  return end(t(lang, "invalid"));
}

// Registered mothers who have agreed.
function routeMother(path, { lang, phone, mother, now }) {
  const [choice, ...rest] = path;
  const facility = getFacility(mother.facilityId);
  const facilityName = facility?.name ?? "your clinic";
  if (choice === undefined) return con(t(lang, "main"));
  switch (choice) {
    case "1": {
      const hasWorker = Boolean(mother.healthWorkerId);
      if (mother.status === "pregnant") return dangerFlow(rest, { lang, phone, group: "pregnant", facilityName, hasWorker });
      if (rest.length === 0) return con(t(lang, "whoIsSick"));
      const group = ["mother", "baby"][Number(rest[0]) - 1];
      if (!group) return end(t(lang, "invalid"));
      return dangerFlow(rest.slice(1), { lang, phone, group, facilityName, hasWorker });
    }
    case "2":
      return questionFlow(rest, { lang, phone });
    case "3": {
      const item = nextItem(mother, now);
      if (!item) return end(t(lang, "noNextVisit"));
      return end(t(lang, "nextVisit", { item: itemText(lang, item), date: formatDate(item.due), facility: facilityName }));
    }
    case "4":
      return end(t(lang, "clinic", { facility: facilityName }), [{ type: "sendClinic", phone, lang }]);
    case "5": {
      const item = confirmableItem(mother, now);
      if (!item) return end(t(lang, "noNextVisit"));
      if (rest.length === 0) return con(t(lang, "didYouGo", { item: itemText(lang, item) }));
      if (rest[0] === "1") return end(t(lang, "wentThanks"), [{ type: "markDone", phone, itemKey: item.key }]);
      if (rest[0] === "2") return end(t(lang, "notYet", { facility: facilityName }));
      return end(t(lang, "invalid"));
    }
    case "6": {
      if (rest.length === 0) return con(CHOOSE_LANGUAGE);
      const chosen = LANG_CODES[Number(rest[0]) - 1];
      if (!chosen) return end(t(lang, "invalid"));
      return end(t(chosen, "langSet"), [{ type: "setLang", phone, lang: chosen }]);
    }
    default:
      return end(t(lang, "invalid"));
  }
}

// Sign list -> (location for unregistered callers) -> emergency. "0" is a free-text "other problem".
function dangerFlow(rest, { lang, phone, group, needsLocation = false, facilityName = null, hasWorker = false }) {
  if (rest.length === 0) return con(signMenu(lang, group));
  if (rest[0] === "0") {
    if (rest.length === 1) return con(t(lang, "describe"));
    const description = joinText(rest.slice(1));
    if (!description) return end(t(lang, "invalid"));
    return end(t(lang, "triageThanks"), [{ type: "respond", phone, lang, kind: "problem", group, text: description }]);
  }
  const sign = SIGN_GROUPS[group][Number(rest[0]) - 1];
  if (!sign) return end(t(lang, "invalid"));
  let location = null;
  if (needsLocation) {
    if (rest.length === 1) return con(t(lang, "askLocation"));
    location = joinText(rest.slice(1));
    if (!location) return end(t(lang, "invalid"));
    facilityName = matchFacility(location)?.name ?? null;
    hasWorker = Boolean(matchHealthWorker(location));
  }
  const facility = facilityName ?? "the nearest health facility";
  const screen = hasWorker ? `${t(lang, "emergency", { facility })} ${t(lang, "alerted")}` : t(lang, "emergency", { facility });
  return end(screen, [{ type: "emergency", phone, lang, group, sign, location, source: "menu" }]);
}

function questionFlow(rest, { lang, phone }) {
  if (rest.length === 0) return con(t(lang, "askQuestion"));
  const question = joinText(rest);
  if (!question) return end(t(lang, "invalid"));
  return end(t(lang, "questionThanks"), [{ type: "respond", phone, lang, kind: "question", text: question }]);
}

// Community health extension workers sign in with a PIN, then register mothers from any phone.
// The first input of every session is the PIN, so it is checked on every request.
function routeHealthWorker(parts, { worker, store }) {
  if (parts.length === 0) return con(CHEW.pinPrompt);
  if (store.pinLocked(worker.id)) return end(CHEW.locked);
  const record = store.getPin(worker.id);
  if (!record) return end(CHEW.noPin);
  if (!verifyPin(parts[0], record)) {
    const failures = store.recordPinFailure(worker.id);
    return end(failures >= MAX_PIN_FAILURES ? CHEW.locked : CHEW.wrongPin);
  }
  if (parts.length === 1) store.clearPinFailures(worker.id);

  const [choice, ...rest] = parts.slice(1);
  if (choice === undefined) return con(CHEW.main);
  if (choice === "3") return end(CHEW.followups, [{ type: "sendFollowups", healthWorkerId: worker.id }]);
  if (choice === "4") return changePinFlow(rest, worker);
  if (choice !== "1" && choice !== "2") return end(CHEW.invalid);

  const status = choice === "1" ? "pregnant" : "baby";
  if (rest.length === 0) return con(CHEW.phone);
  const phone = normalizePhone(rest[0]);
  if (!phone) return end(CHEW.invalid);
  if (store.findMother(phone)) return end(CHEW.already.replace("{phone}", phone));
  if (rest.length === 1) return con(CHEW.lang);
  const lang = LANG_CODES[Number(rest[1]) - 1];
  if (!lang) return end(CHEW.invalid);
  if (rest.length === 2) return con(status === "pregnant" ? CHEW.months : CHEW.weeks);
  const n = Number(rest[2]);
  const valid = status === "pregnant" ? n >= 1 && n <= 9 : n >= 0 && n <= 52;
  if (!Number.isInteger(n) || !valid) return end(CHEW.invalid);
  if (rest.length === 3) return con(CHEW.location);
  const location = joinText(rest.slice(3));
  if (!location) return end(CHEW.invalid);
  const registration = { type: "register", phone, lang, status, location, registeredBy: worker.id, healthWorkerId: worker.id };
  registration[status === "pregnant" ? "months" : "weeks"] = n;
  return end(CHEW.registered.replace("{phone}", phone), [registration]);
}

function changePinFlow(rest, worker) {
  if (rest.length === 0) return con(CHEW.newPin);
  const [first, second] = rest;
  if (!PIN_PATTERN.test(first)) return end(CHEW.invalid);
  if (weakPin(first)) return end(CHEW.weakPin);
  if (rest.length === 1) return con(CHEW.confirmPin);
  if (second !== first) return end(CHEW.pinMismatch);
  return end(CHEW.pinChanged, [{ type: "setPin", healthWorkerId: worker.id, pin: first }]);
}

export function itemText(lang, item) {
  return item.kind === "anc" ? t(lang, "ancItem", { week: item.week }) : t(lang, "vaccineItem", { label: item.label });
}

export function describeMother(mother, now) {
  if (!mother) return "not registered";
  return mother.status === "pregnant"
    ? `about ${gestationalWeeks(mother, now)} weeks pregnant`
    : `mother of a baby about ${Math.floor((now - Date.parse(mother.dob)) / (7 * 86400000))} weeks old`;
}

const joinText = (parts) => parts.join("*").trim();
const con = (screen, actions = []) => ({ reply: `CON ${screen}`, actions });
const end = (screen, actions = []) => ({ reply: `END ${screen}`, actions });
