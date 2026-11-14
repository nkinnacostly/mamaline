import { aiRespond, localize, toSms } from "./ai.js";
import { getFacility, getHealthWorker, matchFacility, matchHealthWorker } from "./directory.js";
import { signLabel, sms } from "./i18n.js";
import { currentWeek, dobFromWeeks, dueEvents, eddFromMonths, findContent, formatDate, nextItem } from "./schedule.js";
import { sendSms } from "./sms.js";
import { hasConsent } from "./store.js";
import { maxLevel, ruleTriage } from "./triage.js";
import { USSD_CODE, describeMother, itemText } from "./ussd.js";

// Side effects requested by a USSD screen. They run after the USSD reply is sent,
// because the network closes a session if the server takes more than a few seconds.
export async function runActions(actions, { store }) {
  for (const action of actions) {
    try {
      await ACTIONS[action.type](action, store);
    } catch (error) {
      console.error(`[actions] ${action.type} failed: ${error.stack ?? error.message}`);
    }
  }
}

const ACTIONS = {
  setLang({ phone, lang }, store) {
    store.setLang(phone, lang);
  },

  // A mother who registers herself has just agreed on the consent screen. One registered by a
  // health worker is held as "pending": she gets only the consent request until she replies YES.
  async register(a, store) {
    const now = store.now();
    const at = new Date(now).toISOString();
    const facility = matchFacility(a.location);
    const worker = a.healthWorkerId ? getHealthWorker(a.healthWorkerId) : matchHealthWorker(a.location);
    const self = a.registeredBy === "self";
    const mother = store.addMother({
      phone: a.phone,
      lang: a.lang,
      status: a.status,
      edd: a.status === "pregnant" ? eddFromMonths(a.months, now) : null,
      dob: a.status === "baby" ? dobFromWeeks(a.weeks, now) : null,
      location: a.location,
      facilityId: facility?.id ?? null,
      healthWorkerId: worker?.id ?? null,
      registeredBy: a.registeredBy,
      consent: self ? { status: "given", at, channel: a.consentChannel ?? "ussd" } : { status: "pending", requestedAt: at },
    });
    store.setLang(a.phone, a.lang);
    if (self) {
      await welcome(store, mother);
      return;
    }
    const text = sms(a.lang, "consentRequest", { worker: worker?.name ?? "Your health worker" });
    await send(store, a.phone, a.lang, text, "consent");
  },

  // Her answer to the consent request, by USSD or SMS reply. "no" (or STOP later on)
  // deletes her details; a confirmation SMS goes out only when she replied by SMS.
  async consent({ phone, answer, channel }, store) {
    const mother = store.findMother(phone);
    if (!mother) return;
    if (answer === "yes") {
      if (hasConsent(mother)) return;
      const updated = store.updateMother(mother.id, (m) => ({ consent: { ...m.consent, status: "given", at: new Date(store.now()).toISOString(), channel } }));
      await welcome(store, updated);
      return;
    }
    const lang = mother.lang;
    store.deleteMother(mother.id);
    if (channel === "sms") await sendSms(store, { to: phone, message: toSms(sms(lang, "optedOut", { code: USSD_CODE })), kind: "consent" });
  },

  setPin({ healthWorkerId, pin }, store) {
    store.setPin(healthWorkerId, pin);
  },

  async emergency(a, store) {
    await raiseEmergency(store, { ...a, signText: signLabel(a.lang === "pcm" ? "pcm" : "en", a.sign), signEnglish: signLabel("en", a.sign) });
  },

  // Free text: a question, or an "other problem" from the danger menu.
  // Rules run first and set the minimum urgency; the AI can only raise it.
  async respond(a, store) {
    const now = store.now();
    const mother = store.findMother(a.phone);
    const rules = ruleTriage(a.text);
    const context = `${describeMother(mother, now)}${a.group ? `; message is about: ${a.group}` : ""}`;
    const ai = await aiRespond({ text: a.text, lang: a.lang, context });

    let level = maxLevel(rules.level, ai?.level ?? "routine");
    if (!ai && a.kind === "problem") level = maxLevel(level, "soon"); // came through the danger menu
    const record = store.addQuestion({ phone: a.phone, lang: a.lang, kind: a.kind, text: a.text, level, ruleSigns: rules.signs, source: ai ? "ai+rules" : "rules" });

    if (level === "emergency") {
      const sign = rules.signs[0];
      const fallback = a.lang === "pcm" ? "Wetin you talk" : "What you describe";
      await raiseEmergency(store, {
        phone: a.phone,
        lang: a.lang,
        group: a.group ?? (mother?.status === "baby" ? "mother" : "pregnant"),
        sign: sign ?? "other",
        signText: sign ? signLabel(a.lang === "pcm" ? "pcm" : "en", sign) : fallback,
        signEnglish: sign ? signLabel("en", sign) : `"${a.text.slice(0, 60)}"`,
        source: sign ? "rules" : "ai",
        location: mother?.location ?? null,
      });
      store.updateQuestion(record.id, { answer: "Emergency advice sent; health worker alerted." });
      return;
    }

    const facility = mother ? getFacility(mother.facilityId) : null;
    let answer;
    let needsCall = false;
    if (level === "soon") {
      answer = ai?.text ?? sms(a.lang, "soon", { facility: facilityName(a.lang, facility) });
      needsCall = true;
    } else {
      const content = ai ? null : findContent(a.text);
      answer = ai?.text ?? (content ? content.sms[a.lang] ?? content.sms.en : sms(a.lang, "noAnswer"));
      needsCall = !ai && !content;
    }
    await send(store, a.phone, a.lang, answer, "answer");
    store.updateQuestion(record.id, { answer });
    if (needsCall) {
      store.addFollowup({
        motherId: mother?.id ?? null,
        phone: a.phone,
        healthWorkerId: mother?.healthWorkerId ?? null,
        reason: `${level === "soon" ? "Reported" : "Asked"}: "${a.text.slice(0, 80)}"`,
      });
    }
  },

  async sendClinic({ phone, lang }, store) {
    const mother = store.findMother(phone);
    const facility = mother ? getFacility(mother.facilityId) : null;
    const text = facility
      ? sms(lang, "clinic", { facility: facility.name, lga: facility.lga, state: facility.state, services: facility.services })
      : sms(lang, "noAnswer");
    await send(store, phone, lang, text, "clinic");
  },

  markDone({ phone, itemKey }, store) {
    const mother = store.findMother(phone);
    if (!mother) return;
    store.updateMother(mother.id, (m) => ({ done: { ...m.done, [itemKey]: new Date(store.now()).toISOString() } }));
    store.closeFollowupsFor(mother.id, itemKey);
  },

  async sendFollowups({ healthWorkerId }, store) {
    const worker = getHealthWorker(healthWorkerId);
    const data = store.snapshot();
    const alerts = data.alerts.filter((x) => x.status === "open" && x.healthWorkerId === healthWorkerId).map((x) => `${x.phone} URGENT ${x.signEnglish}`);
    const followups = data.followups.filter((x) => x.status === "open" && x.healthWorkerId === healthWorkerId).map((x) => `${x.phone} ${x.reason}`);
    const items = [...alerts, ...followups];
    const text = items.length ? `MamaLine follow-ups (${items.length}): ${items.join("; ")}` : "MamaLine: No open follow-ups. Well done.";
    await sendSms(store, { to: worker.phone, message: toSms(text), kind: "health-worker" });
  },
};

async function raiseEmergency(store, { phone, lang, group, sign, signText, signEnglish, source, location }) {
  const now = store.now();
  const mother = store.findMother(phone);
  const facility = mother ? getFacility(mother.facilityId) : matchFacility(location);
  const worker = mother?.healthWorkerId ? getHealthWorker(mother.healthWorkerId) : matchHealthWorker(location);
  const place = mother?.location ?? location ?? "location unknown";
  store.addAlert({
    phone,
    motherId: mother?.id ?? null,
    group,
    sign,
    signEnglish,
    source,
    location: place,
    facilityId: facility?.id ?? null,
    healthWorkerId: worker?.id ?? null,
    detail: mother ? describeMother(mother, now) : `not registered (${group})`,
  });

  // The mother's SMS goes first and is never held up by translation for more than a few seconds.
  const template = group === "baby" ? "emergencyBaby" : "emergencyMother";
  await send(store, phone, lang, sms(lang, template, { sign: signText, facility: facilityName(lang, facility) }), "urgent", { timeoutMs: 5000 });

  const detail = mother ? describeMother(mother, now) : `${group}, not registered`;
  const message = toSms(`MamaLine URGENT: ${phone} reports ${signEnglish} (${detail}) in ${place}. Call her now.`);
  if (worker) await sendSms(store, { to: worker.phone, message, kind: "health-worker" });
  else if (process.env.DUTY_PHONE) await sendSms(store, { to: process.env.DUTY_PHONE, message, kind: "health-worker" });
}

// Welcome SMS with her next visit, then whatever reminder or tip is due now.
async function welcome(store, mother) {
  const now = store.now();
  const facility = getFacility(mother.facilityId);
  const next = nextItem(mother, now);
  const text = sms(mother.lang, mother.status === "pregnant" ? "welcomePregnant" : "welcomeBaby", {
    weeks: currentWeek(mother, now),
    next: next ? `${itemText(mother.lang, next)}, ${formatDate(next.due)}` : "-",
    facility: facilityName(mother.lang, facility),
    code: USSD_CODE,
  });
  await send(store, mother.phone, mother.lang, text, "welcome");
  await processMother(store, store.getMother(mother.id));
}

// Scheduled messages for one mother: visit and vaccine reminders, missed-visit follow-ups, tips.
// Nothing is sent before she consents; after 3 days without an answer her health worker is asked to follow up.
export async function processMother(store, mother) {
  const now = store.now();
  if (!hasConsent(mother)) {
    const waitedDays = (now - Date.parse(mother.registeredAt)) / (24 * 3600 * 1000);
    if (waitedDays >= 3 && !mother.sent?.["consent-check"]) {
      store.addFollowup({
        motherId: mother.id,
        phone: mother.phone,
        itemKey: "consent-check",
        healthWorkerId: mother.healthWorkerId,
        reason: "Has not agreed to MamaLine after 3 days: explain it and help her reply YES, or remove her",
      });
      store.markSent(mother.id, "consent-check");
    }
    return;
  }
  const facility = getFacility(mother.facilityId);
  for (const event of dueEvents(mother, now)) {
    if (event.type === "reminder") {
      const { item, stage } = event;
      const key = `${item.kind === "anc" ? "anc" : "vaccine"}${stage[0].toUpperCase()}${stage.slice(1)}`;
      const text = sms(mother.lang, key, {
        week: item.week,
        label: item.label,
        names: item.names,
        date: formatDate(item.due),
        facility: facilityName(mother.lang, facility),
        code: USSD_CODE,
      });
      await send(store, mother.phone, mother.lang, text, stage === "missed" ? "missed" : "reminder");
      if (stage === "missed") {
        store.addFollowup({
          motherId: mother.id,
          phone: mother.phone,
          itemKey: item.key,
          healthWorkerId: mother.healthWorkerId,
          reason: `Missed ${itemText("en", item)}, due ${formatDate(item.due)}`,
        });
      }
    } else if (event.type === "tip") {
      await send(store, mother.phone, mother.lang, event.tip.sms[mother.lang] ?? event.tip.sms.en, "tip");
    } else if (event.type === "birthCheck") {
      store.addFollowup({
        motherId: mother.id,
        phone: mother.phone,
        itemKey: "birth-check",
        healthWorkerId: mother.healthWorkerId,
        reason: "2 weeks past due date: check on the birth and record the baby",
      });
    }
    store.markSent(mother.id, event.key);
  }
}

export async function runScheduler(store) {
  for (const mother of store.mothers()) {
    try {
      await processMother(store, mother);
    } catch (error) {
      console.error(`[scheduler] ${mother.phone}: ${error.message}`);
    }
  }
}

function facilityName(lang, facility) {
  return facility?.name ?? sms(lang, "nearestFacility");
}

async function send(store, to, lang, text, kind, options) {
  const message = toSms(await localize(text, lang, options));
  return sendSms(store, { to, message, kind });
}
