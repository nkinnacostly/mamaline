"use client";

import { useState } from "react";

// A scripted copy of the real MamaLine USSD menus (see the mamaline service),
// for an example mother in Kura who is 29 weeks pregnant.
type Screen = { text: string; next?: Record<string, string>; sms?: { to: string; text: string }[] };

const SCREENS: Record<string, Screen> = {
  main: {
    text: "MamaLine\n1. Danger sign - get help now\n2. Ask a health question\n3. My next visit\n4. Find a clinic\n5. I went for my visit",
    next: { "1": "signs", "2": "ask", "3": "visit", "4": "clinic", "5": "went" },
  },
  signs: {
    text: "Danger signs:\n1. Bleeding\n2. Fits\n3. Headache/blurred eyes\n4. Swollen face/hands\n5. High fever\n6. Bad belly pain\n7. Hard breathing\n8. Baby moves less\n9. Water broke\n0. Other problem",
    next: { "1": "danger", "2": "danger", "3": "danger", "4": "danger", "5": "danger", "6": "danger", "7": "danger", "8": "danger", "9": "danger", "0": "other" },
  },
  danger: {
    text: "DANGER SIGN. Go to Kura PHC now. Call 112 if you need help getting there. Your health worker has been alerted.",
    sms: [
      { to: "To the mother", text: "MamaLine URGENT: This is a danger sign. Go to Kura PHC now with your card and someone to help you. Call 112 if you need help getting there. Do not wait." },
      { to: "To her health worker", text: "MamaLine URGENT: a mother 29 weeks pregnant in Kura reports a danger sign. Call her now." },
    ],
  },
  other: {
    text: "Thank you. Advice is coming by SMS now. If it gets worse, go to a clinic.",
    sms: [{ to: "To the mother", text: "MamaLine: Please see a health worker at Kura PHC within 1 day. If you see a danger sign, go now or call 112." }],
  },
  ask: {
    text: "Thank you. Your answer will come by SMS in about 1 minute.\n\n(Example question: can I take agbo?)",
    sms: [{ to: "To the mother", text: "MamaLine: Do not take herbal mixtures such as agbo during pregnancy or breastfeeding without asking a health worker. Some can harm you and your baby." }],
  },
  visit: { text: "Next: antenatal visit (week 30), in about a week, at Kura PHC." },
  clinic: {
    text: "Nearest clinic: Kura PHC. Details are coming by SMS.",
    sms: [{ to: "To the mother", text: "MamaLine: Your nearest clinic is Kura PHC (Kura, Kano). Services: antenatal care, 24-hour delivery, vaccines. Take your antenatal card." }],
  },
  went: { text: "Did you go for: antenatal visit (week 30)?\n1. Yes\n2. Not yet", next: { "1": "wentYes", "2": "wentNo" } },
  wentYes: { text: "Thank you! Well done for keeping you and your baby safe." },
  wentNo: { text: "Please go soon to Kura PHC." },
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export function PhoneDemo() {
  const [screen, setScreen] = useState("main");
  const [typed, setTyped] = useState("");
  const current = SCREENS[screen];
  const ended = !current.next;

  function press(key: string) {
    if (ended) return;
    const target = current.next?.[key];
    if (target) {
      setTyped("");
      setScreen(target);
    } else {
      setTyped(key);
    }
  }

  return (
    <div className="grid gap-6 sm:grid-cols-[220px_1fr] sm:items-start">
      <div className="mx-auto w-[220px] rounded-[34px] bg-[#23252b] p-4 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#4a4d55]" />
        <div className="h-[230px] overflow-y-auto rounded-lg bg-[#c7d3b4] p-3 font-mono text-[0.68rem] leading-[1.45] whitespace-pre-wrap text-[#1e2a12]" aria-live="polite">
          {current.text}
          {!ended && <span className="mt-2 block border-t border-dashed border-[#1e2a12]/50 pt-1">Reply: {typed}</span>}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              disabled={ended}
              className="rounded-xl bg-[#3a3d45] py-2 font-mono text-sm font-semibold text-white transition hover:bg-[#4a4e58] active:translate-y-px disabled:opacity-40"
            >
              {k}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setScreen("main");
            setTyped("");
          }}
          className="mt-3 w-full rounded-full bg-[#2e8b4a] py-2 text-xs font-semibold text-white hover:bg-[#287a41]"
        >
          {ended ? "Dial again" : "Back to menu"}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[0.8rem] text-muted">
          Press a number on the keypad. This demo follows a mother in Kura who is 29 weeks pregnant; the facility is a sample.
        </p>
        {current.sms?.map((m) => (
          <div key={m.to} className="animate-[fade_400ms_ease] rounded-2xl rounded-bl-sm border border-line bg-white p-3 shadow-sm">
            <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-clay uppercase">SMS · {m.to}</p>
            <p className="mt-1 text-[0.82rem] leading-snug text-ink">{m.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
