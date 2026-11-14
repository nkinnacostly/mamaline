import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { processMother, runActions, runScheduler } from "./src/actions.js";
import { aiEnabled } from "./src/ai.js";
import { getFacility, getHealthWorker, healthWorkers } from "./src/directory.js";
import { inboundAction } from "./src/inbound.js";
import { DAY, currentWeek, formatDate, nextItem } from "./src/schedule.js";
import { smsMode } from "./src/sms.js";
import { createStore } from "./src/store.js";
import { USSD_CODE, handleUssd, itemText } from "./src/ussd.js";

const PORT = Number(process.env.PORT ?? 3001);
const store = createStore();
const sessions = new Map();

const PAGES = { "/": "public/index.html", "/admin": "public/admin.html", "/styles.css": "public/styles.css" };
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8" };

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}
const json = (res, value, status = 200) => send(res, status, JSON.stringify(value), "application/json; charset=utf-8");

function state() {
  const now = store.now();
  const data = store.snapshot();
  const mothers = data.mothers.map((m) => {
    const next = nextItem(m, now);
    return {
      ...m,
      week: currentWeek(m, now),
      next: next ? { text: itemText("en", next), date: formatDate(next.due), overdue: next.due < now - DAY } : null,
      facility: getFacility(m.facilityId)?.name ?? null,
      healthWorker: getHealthWorker(m.healthWorkerId)?.name ?? null,
      consentStatus: m.consent?.status ?? "given",
    };
  });
  const open = (list) => list.filter((x) => x.status === "open");
  return {
    mode: { ai: aiEnabled(), sms: smsMode(), ussdCode: USSD_CODE },
    demoDate: formatDate(now),
    clockOffsetDays: store.clockOffsetDays(),
    healthWorkers: healthWorkers.map(({ id, name, phone }) => ({ id, name, phone })),
    counts: {
      pregnant: mothers.filter((m) => m.status === "pregnant" && m.consentStatus === "given").length,
      babies: mothers.filter((m) => m.status === "baby" && m.consentStatus === "given").length,
      awaitingConsent: mothers.filter((m) => m.consentStatus === "pending").length,
      openAlerts: open(data.alerts).length,
      openFollowups: open(data.followups).length,
      sms: data.outbox.length,
    },
    alerts: data.alerts.slice().reverse(),
    followups: data.followups.slice().reverse(),
    mothers: mothers.reverse(),
    questions: data.questions.slice(-50).reverse(),
    outbox: data.outbox.slice(-60).reverse(),
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  const path = url.pathname;
  try {
    // Africa's Talking USSD callback (also used by the built-in simulator).
    if (req.method === "POST" && path === "/ussd") {
      const form = new URLSearchParams(await readBody(req));
      const request = { sessionId: form.get("sessionId") ?? "", phoneNumber: form.get("phoneNumber") ?? "", text: form.get("text") ?? "" };
      const { reply, actions } = handleUssd(request, { store, sessions });
      if (reply.startsWith("END")) sessions.delete(request.sessionId);
      send(res, 200, reply);
      runActions(actions, { store });
      return;
    }

    // Africa's Talking inbound SMS callback (also used by the simulator's reply box):
    // YES / NO answers to the consent request, and STOP at any time.
    if (req.method === "POST" && path === "/sms/inbound") {
      const form = new URLSearchParams(await readBody(req));
      const action = inboundAction({ from: form.get("from") ?? "", text: form.get("text") ?? "" }, { store });
      send(res, 200, "OK");
      if (action) runActions([action], { store });
      return;
    }

    if (req.method === "GET" && path === "/api/inbox") {
      const phone = url.searchParams.get("phone") ?? "";
      return json(res, store.snapshot().outbox.filter((m) => m.to === phone));
    }
    if (req.method === "GET" && path === "/api/state") return json(res, state());

    let match;
    if (req.method === "POST" && (match = path.match(/^\/api\/alerts\/([\w-]+)\/contacted$/))) {
      store.updateAlert(match[1], { status: "contacted", contactedAt: new Date(store.now()).toISOString() });
      return json(res, { ok: true });
    }
    if (req.method === "POST" && (match = path.match(/^\/api\/followups\/([\w-]+)\/done$/))) {
      store.updateFollowup(match[1], { status: "done" });
      return json(res, { ok: true });
    }
    if (req.method === "POST" && (match = path.match(/^\/api\/mothers\/([\w-]+)\/birth$/))) {
      // The health worker records the birth: the mother moves to the baby track (vaccine reminders).
      const now = new Date(store.now()).toISOString();
      const mother = store.updateMother(match[1], (m) => ({ status: "baby", dob: now, pregnancyRegisteredAt: m.registeredAt, registeredAt: now }));
      if (mother) {
        store.closeFollowupsFor(mother.id, "birth-check");
        await processMother(store, mother);
      }
      return json(res, { ok: Boolean(mother) });
    }
    if (req.method === "POST" && path === "/api/clock") {
      const days = Number(url.searchParams.get("days") ?? 0);
      if (days === 0) store.resetClock();
      else store.advanceClock(days);
      await runScheduler(store);
      return json(res, { ok: true, demoDate: formatDate(store.now()) });
    }
    if (req.method === "POST" && path === "/api/reset") {
      store.reset();
      sessions.clear();
      return json(res, { ok: true });
    }

    if (req.method === "GET" && PAGES[path]) {
      const file = PAGES[path];
      return send(res, 200, await readFile(new URL(file, import.meta.url)), TYPES[file.slice(file.lastIndexOf("."))]);
    }
    send(res, 404, "Not found");
  } catch (error) {
    console.error(error);
    send(res, 500, "END Sorry, something went wrong. If this is an emergency, go to the nearest clinic or call 112.");
  }
});

server.listen(PORT, () => {
  console.log(`MamaLine running on http://localhost:${PORT}`);
  console.log(`  Phone simulator:         http://localhost:${PORT}/`);
  console.log(`  Health worker dashboard: http://localhost:${PORT}/admin`);
  console.log(`  USSD callback:           POST http://localhost:${PORT}/ussd`);
  console.log(`  AI: ${aiEnabled() ? "on (Claude)" : "off - rules and validated messages only (set ANTHROPIC_API_KEY)"}`);
  console.log(`  SMS: ${smsMode() === "africastalking" ? "Africa's Talking" : "simulated (set AT_USERNAME and AT_API_KEY)"}`);
  runScheduler(store);
  setInterval(() => runScheduler(store), 60_000);
});
