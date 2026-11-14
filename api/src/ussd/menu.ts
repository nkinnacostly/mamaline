import { isWeakPin, MAX_PIN_FAILURES, PIN_PATTERN } from '../auth/pin.js';
import { CHEW, CHOOSE_LANGUAGE, LANG_CODES, SIGN_GROUPS, signMenu, t, type Lang, type SignGroup } from '../content/i18n.js';
import { confirmableItem, formatDate, nextItem, type CareItem, type CareSubject } from '../content/schedule.js';
import { normalizePhone } from '../content/text.js';
import type { Action } from './actions.js';

// The USSD menus, as a function of what the caller typed and what we know about them.
// Database access comes in through MenuContext, so the flows can be tested without a database.
// `text` is everything typed this session, joined by "*" (Africa's Talking format, e.g. "1*3").

export type MotherView = {
  language: Lang;
  consentStatus: 'PENDING' | 'GIVEN';
  hasHealthWorker: boolean;
  facilityName: string | null;
  care: CareSubject;
};

export type MenuContext = {
  now: number;
  /** The caller is a registered mother (possibly awaiting consent). */
  mother: MotherView | null;
  /** The caller is a health worker on the roster. */
  healthWorker: { id: string; hasPin: boolean } | null;
  /** This session began with the language question (new callers only). */
  askedLanguage: boolean;
  pinLocked(): Promise<boolean>;
  checkPin(pin: string): Promise<boolean>;
  /** Returns how many wrong PINs are now on record in the lockout window. */
  recordPinFailure(): Promise<number>;
  clearPinFailures(): Promise<void>;
  motherExists(phone: string): Promise<boolean>;
  facilityNameFor(location: string): Promise<string | null>;
  hasHealthWorkerFor(location: string): Promise<boolean>;
};

export type MenuResult = { reply: string; end: boolean; actions: Action[] };

const con = (screen: string, actions: Action[] = []): MenuResult => ({ reply: `CON ${screen}`, end: false, actions });
const end = (screen: string, actions: Action[] = []): MenuResult => ({ reply: `END ${screen}`, end: true, actions });
const joinText = (parts: string[]) => parts.join('*').trim();

export async function handleMenu(phone: string, text: string, ctx: MenuContext): Promise<MenuResult> {
  const parts = text === '' ? [] : text.split('*');
  if (ctx.healthWorker) return routeHealthWorker(parts, ctx.healthWorker, ctx);

  let path = parts;
  let lang: Lang = ctx.mother?.language ?? 'en';
  if (ctx.askedLanguage) {
    if (parts.length === 0) return con(CHOOSE_LANGUAGE);
    const chosen = LANG_CODES[Number(parts[0]) - 1];
    if (!chosen) return end(t('en', 'invalid'));
    lang = chosen;
    path = parts.slice(1);
  }

  if (!ctx.mother) return routeNewCaller(path, phone, lang, ctx);
  if (ctx.mother.consentStatus === 'PENDING') return routeAwaitingConsent(path, phone, lang, ctx.mother, ctx);
  return routeMother(path, phone, lang, ctx.mother, ctx);
}

// Callers who have not registered. Registration ends with a consent question; nothing is
// stored unless she agrees, and her language is not remembered between sessions until then.
async function routeNewCaller(path: string[], phone: string, lang: Lang, ctx: MenuContext): Promise<MenuResult> {
  const [choice, ...rest] = path;
  if (choice === undefined) return con(t(lang, 'newMain'));
  switch (choice) {
    case '1':
    case '2': {
      const pregnant = choice === '1';
      if (rest.length === 0) return con(t(lang, pregnant ? 'askMonths' : 'askBabyWeeks'));
      const n = Number(rest[0]);
      const valid = pregnant ? n >= 1 && n <= 9 : n >= 0 && n <= 52;
      if (!Number.isInteger(n) || !valid) return end(t(lang, 'invalid'));
      if (rest.length === 1) return con(t(lang, 'askLocation'));
      const location = rest[1].trim();
      if (!location) return end(t(lang, 'invalid'));
      if (rest.length === 2) return con(t(lang, 'consentAsk'));
      if (rest[2] === '2') return end(t(lang, 'selfRefused'));
      if (rest[2] !== '1') return end(t(lang, 'invalid'));
      const screen = pregnant ? t(lang, 'welcomePregnant', { weeks: Math.round(n * 4.33) }) : t(lang, 'welcomeBaby');
      return end(screen, [
        { type: 'register', phone, lang, track: pregnant ? 'PREGNANCY' : 'BABY', amount: n, location, registeredBy: 'SELF' },
      ]);
    }
    case '3': {
      // Danger sign from someone not registered: who -> sign -> location (to find a facility).
      if (rest.length === 0) return con(t(lang, 'whoNeedsHelp'));
      const group = (['pregnant', 'mother', 'baby'] as const)[Number(rest[0]) - 1];
      if (!group) return end(t(lang, 'invalid'));
      return dangerFlow(rest.slice(1), { phone, lang, group, needsLocation: true, facilityName: null, hasWorker: false }, ctx);
    }
    case '4':
      return questionFlow(rest, phone, lang);
    default:
      return end(t(lang, 'invalid'));
  }
}

// A health worker registered her but she has not agreed. Emergency help never waits for consent.
async function routeAwaitingConsent(path: string[], phone: string, lang: Lang, mother: MotherView, ctx: MenuContext): Promise<MenuResult> {
  const [choice, ...rest] = path;
  if (choice === undefined) return con(t(lang, 'consentPending'));
  if (choice === '1') return end(t(lang, 'consentThanks'), [{ type: 'consent', phone, answer: 'yes', channel: 'USSD' }]);
  if (choice === '2') return end(t(lang, 'consentRefused'), [{ type: 'consent', phone, answer: 'no', channel: 'USSD' }]);
  if (choice === '0') {
    const group = mother.care.track === 'PREGNANCY' ? 'pregnant' : 'baby';
    return dangerFlow(rest, { phone, lang, group, needsLocation: false, facilityName: mother.facilityName, hasWorker: mother.hasHealthWorker }, ctx);
  }
  return end(t(lang, 'invalid'));
}

// Registered mothers who have agreed.
async function routeMother(path: string[], phone: string, lang: Lang, mother: MotherView, ctx: MenuContext): Promise<MenuResult> {
  const [choice, ...rest] = path;
  const facilityName = mother.facilityName ?? 'your clinic';
  if (choice === undefined) return con(t(lang, 'main'));
  switch (choice) {
    case '1': {
      const base = { phone, lang, needsLocation: false, facilityName, hasWorker: mother.hasHealthWorker };
      if (mother.care.track === 'PREGNANCY') return dangerFlow(rest, { ...base, group: 'pregnant' }, ctx);
      if (rest.length === 0) return con(t(lang, 'whoIsSick'));
      const group = (['mother', 'baby'] as const)[Number(rest[0]) - 1];
      if (!group) return end(t(lang, 'invalid'));
      return dangerFlow(rest.slice(1), { ...base, group }, ctx);
    }
    case '2':
      return questionFlow(rest, phone, lang);
    case '3': {
      const item = nextItem(mother.care, ctx.now);
      if (!item) return end(t(lang, 'noNextVisit'));
      return end(t(lang, 'nextVisit', { item: itemText(lang, item), date: formatDate(item.due), facility: facilityName }));
    }
    case '4':
      return end(t(lang, 'clinic', { facility: facilityName }), [{ type: 'sendClinic', phone, lang }]);
    case '5': {
      const item = confirmableItem(mother.care, ctx.now);
      if (!item) return end(t(lang, 'noNextVisit'));
      if (rest.length === 0) return con(t(lang, 'didYouGo', { item: itemText(lang, item) }));
      if (rest[0] === '1') return end(t(lang, 'wentThanks'), [{ type: 'markDone', phone, itemKey: item.key }]);
      if (rest[0] === '2') return end(t(lang, 'notYet', { facility: facilityName }));
      return end(t(lang, 'invalid'));
    }
    case '6': {
      if (rest.length === 0) return con(CHOOSE_LANGUAGE);
      const chosen = LANG_CODES[Number(rest[0]) - 1];
      if (!chosen) return end(t(lang, 'invalid'));
      return end(t(chosen, 'langSet'), [{ type: 'setLanguage', phone, lang: chosen }]);
    }
    default:
      return end(t(lang, 'invalid'));
  }
}

type DangerOptions = { phone: string; lang: Lang; group: SignGroup; needsLocation: boolean; facilityName: string | null; hasWorker: boolean };

// Sign list -> (location for unregistered callers) -> emergency. "0" is a free-text "other problem".
async function dangerFlow(rest: string[], o: DangerOptions, ctx: MenuContext): Promise<MenuResult> {
  const { phone, lang, group } = o;
  if (rest.length === 0) return con(signMenu(lang, group));
  if (rest[0] === '0') {
    if (rest.length === 1) return con(t(lang, 'describe'));
    const description = joinText(rest.slice(1));
    if (!description) return end(t(lang, 'invalid'));
    return end(t(lang, 'triageThanks'), [{ type: 'respond', phone, lang, isProblem: true, group, text: description }]);
  }
  const sign = SIGN_GROUPS[group][Number(rest[0]) - 1];
  if (!sign) return end(t(lang, 'invalid'));
  let { facilityName, hasWorker } = o;
  let location: string | null = null;
  if (o.needsLocation) {
    if (rest.length === 1) return con(t(lang, 'askLocation'));
    location = joinText(rest.slice(1));
    if (!location) return end(t(lang, 'invalid'));
    facilityName = await ctx.facilityNameFor(location);
    hasWorker = await ctx.hasHealthWorkerFor(location);
  }
  const facility = facilityName ?? 'the nearest health facility';
  const screen = hasWorker ? `${t(lang, 'emergency', { facility })} ${t(lang, 'alerted')}` : t(lang, 'emergency', { facility });
  return end(screen, [{ type: 'emergency', phone, lang, group, sign, location }]);
}

function questionFlow(rest: string[], phone: string, lang: Lang): MenuResult {
  if (rest.length === 0) return con(t(lang, 'askQuestion'));
  const question = joinText(rest);
  if (!question) return end(t(lang, 'invalid'));
  return end(t(lang, 'questionThanks'), [{ type: 'respond', phone, lang, isProblem: false, text: question }]);
}

// Health workers sign in with a PIN, then register mothers from any phone.
// The PIN is the first input of every session, so it is checked on every request.
async function routeHealthWorker(parts: string[], worker: { id: string; hasPin: boolean }, ctx: MenuContext): Promise<MenuResult> {
  if (parts.length === 0) return con(CHEW.pinPrompt);
  if (await ctx.pinLocked()) return end(CHEW.locked);
  if (!worker.hasPin) return end(CHEW.noPin);
  if (!(await ctx.checkPin(parts[0]))) {
    const failures = await ctx.recordPinFailure();
    return end(failures >= MAX_PIN_FAILURES ? CHEW.locked : CHEW.wrongPin);
  }
  if (parts.length === 1) await ctx.clearPinFailures();

  const [choice, ...rest] = parts.slice(1);
  if (choice === undefined) return con(CHEW.main);
  if (choice === '3') return end(CHEW.followups, [{ type: 'sendFollowups', healthWorkerId: worker.id }]);
  if (choice === '4') return changePinFlow(rest, worker.id);
  if (choice !== '1' && choice !== '2') return end(CHEW.invalid);

  const track = choice === '1' ? 'PREGNANCY' : 'BABY';
  if (rest.length === 0) return con(CHEW.phone);
  const phone = normalizePhone(rest[0]);
  if (!phone) return end(CHEW.invalid);
  if (await ctx.motherExists(phone)) return end(CHEW.already.replace('{phone}', phone));
  if (rest.length === 1) return con(CHEW.lang);
  const lang = LANG_CODES[Number(rest[1]) - 1];
  if (!lang) return end(CHEW.invalid);
  if (rest.length === 2) return con(track === 'PREGNANCY' ? CHEW.months : CHEW.weeks);
  const n = Number(rest[2]);
  const valid = track === 'PREGNANCY' ? n >= 1 && n <= 9 : n >= 0 && n <= 52;
  if (!Number.isInteger(n) || !valid) return end(CHEW.invalid);
  if (rest.length === 3) return con(CHEW.location);
  const location = joinText(rest.slice(3));
  if (!location) return end(CHEW.invalid);
  return end(CHEW.registered.replace('{phone}', phone), [
    { type: 'register', phone, lang, track, amount: n, location, registeredBy: 'HEALTH_WORKER', healthWorkerId: worker.id },
  ]);
}

function changePinFlow(rest: string[], healthWorkerId: string): MenuResult {
  if (rest.length === 0) return con(CHEW.newPin);
  const [first, second] = rest;
  if (!PIN_PATTERN.test(first)) return end(CHEW.invalid);
  if (isWeakPin(first)) return end(CHEW.weakPin);
  if (rest.length === 1) return con(CHEW.confirmPin);
  if (second !== first) return end(CHEW.pinMismatch);
  return end(CHEW.pinChanged, [{ type: 'setPin', healthWorkerId, pin: first }]);
}

export function itemText(lang: Lang, item: CareItem): string {
  return item.kind === 'anc' ? t(lang, 'ancItem', { week: item.week }) : t(lang, 'vaccineItem', { label: item.label });
}
