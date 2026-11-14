import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCKOUT_MS, MAX_PIN_FAILURES, hashPin } from "./auth.js";
import { DAY } from "./schedule.js";

// JSON-file store: fine for a demo or small pilot. Move to Postgres or SQLite before scaling,
// and encrypt it: phone numbers and pregnancy status are sensitive health data.
const EMPTY = {
  clockOffsetDays: 0,
  users: {},
  mothers: [],
  alerts: [],
  questions: [],
  followups: [],
  outbox: [],
  workerPins: {}, // health worker id -> { salt, hash, setAt }
  pinFailures: {}, // health worker id -> [timestamps of wrong PINs]
};

// Records made before consent existed (and sample data) count as consented.
export const hasConsent = (mother) => (mother?.consent?.status ?? "given") === "given";

export function createStore(path = fileURLToPath(new URL("../data/store.json", import.meta.url))) {
  let data = structuredClone(EMPTY);
  if (path && existsSync(path)) {
    try {
      data = { ...structuredClone(EMPTY), ...JSON.parse(readFileSync(path, "utf8")) };
    } catch {
      console.warn(`[store] Could not read ${path}; starting empty.`);
    }
  }

  const now = () => Date.now() + data.clockOffsetDays * DAY;

  function save() {
    if (!path) return;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(data, null, 2));
  }

  function add(list, record) {
    const entry = { id: `${list}-${now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date(now()).toISOString(), ...record };
    data[list].push(entry);
    save();
    return entry;
  }

  function update(list, id, patch) {
    const entry = data[list].find((x) => x.id === id);
    if (entry) Object.assign(entry, typeof patch === "function" ? patch(entry) : patch);
    save();
    return entry;
  }

  return {
    // The demo clock lets the dashboard fast-forward time to show reminders and missed visits.
    now,
    clockOffsetDays: () => data.clockOffsetDays,
    advanceClock(days) {
      data.clockOffsetDays += days;
      save();
    },
    resetClock() {
      data.clockOffsetDays = 0;
      save();
    },

    getLang: (phone) => data.users[phone]?.lang ?? null,
    setLang(phone, lang) {
      data.users[phone] = { ...data.users[phone], lang };
      const mother = data.mothers.find((m) => m.phone === phone);
      if (mother) mother.lang = lang;
      save();
    },

    mothers: () => data.mothers,
    findMother: (phone) => data.mothers.find((m) => m.phone === phone) ?? null,
    getMother: (id) => data.mothers.find((m) => m.id === id) ?? null,
    addMother(record) {
      data.mothers = data.mothers.filter((m) => m.phone !== record.phone);
      return add("mothers", { done: {}, sent: {}, registeredAt: new Date(now()).toISOString(), ...record });
    },
    updateMother: (id, patch) => update("mothers", id, patch),
    // Removes a mother's personal data when she refuses consent or leaves (sends STOP).
    // The SMS log keeps the messages already sent, as a delivery record.
    deleteMother(id) {
      const mother = data.mothers.find((m) => m.id === id);
      if (!mother) return;
      data.mothers = data.mothers.filter((m) => m.id !== id);
      delete data.users[mother.phone];
      data.followups = data.followups.filter((f) => f.motherId !== id);
      save();
    },

    // Health worker PINs (hashed) and wrong-PIN lockout.
    getPin: (workerId) => data.workerPins[workerId] ?? null,
    setPin(workerId, pin) {
      data.workerPins[workerId] = { ...hashPin(pin), setAt: new Date(now()).toISOString() };
      save();
    },
    pinLocked(workerId) {
      const recent = (data.pinFailures[workerId] ?? []).filter((t) => Date.now() - t < LOCKOUT_MS);
      return recent.length >= MAX_PIN_FAILURES;
    },
    recordPinFailure(workerId) {
      const recent = (data.pinFailures[workerId] ?? []).filter((t) => Date.now() - t < LOCKOUT_MS);
      data.pinFailures[workerId] = [...recent, Date.now()];
      save();
      return data.pinFailures[workerId].length;
    },
    clearPinFailures(workerId) {
      if (data.pinFailures[workerId]?.length) {
        delete data.pinFailures[workerId];
        save();
      }
    },
    markSent(id, key) {
      return update("mothers", id, (m) => ({ sent: { ...m.sent, [key]: new Date(now()).toISOString() } }));
    },

    addAlert: (a) => add("alerts", { status: "open", ...a }),
    updateAlert: (id, patch) => update("alerts", id, patch),
    addQuestion: (q) => add("questions", q),
    updateQuestion: (id, patch) => update("questions", id, patch),

    addFollowup(f) {
      const existing = data.followups.find((x) => x.status === "open" && x.motherId && x.motherId === f.motherId && x.itemKey && x.itemKey === f.itemKey);
      return existing ?? add("followups", { status: "open", ...f });
    },
    updateFollowup: (id, patch) => update("followups", id, patch),
    closeFollowupsFor(motherId, itemKey) {
      for (const f of data.followups) if (f.motherId === motherId && f.itemKey === itemKey && f.status === "open") f.status = "done";
      save();
    },

    addOutbox: (m) => add("outbox", m),
    updateOutbox: (id, patch) => update("outbox", id, patch),

    snapshot: () => structuredClone(data),
    reset() {
      data = structuredClone(EMPTY);
      save();
    },
  };
}
