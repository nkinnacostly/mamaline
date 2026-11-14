"use client";

import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { apiPost } from "@/lib/api";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "pcm", label: "Pidgin" },
  { value: "ha", label: "Hausa" },
  { value: "yo", label: "Yoruba" },
  { value: "ig", label: "Igbo" },
];

const field = "w-full rounded-2xl bg-panel px-4 py-3.5 text-[15px] text-ink outline-none ring-accent/40 placeholder:text-muted focus:ring-2";

/** The + button: register a mother. She gets a consent SMS; nothing else is sent until she replies YES. */
export function RegisterSheet({ onClose, onDone }: { onClose: () => void; onDone: (message: string) => void }) {
  const [track, setTrack] = useState<"PREGNANCY" | "BABY">("PREGNANCY");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    try {
      await apiPost("dashboard/mothers", {
        phone: form.get("phone"),
        language: form.get("language"),
        track,
        amount: Number(form.get("amount")),
        location: form.get("location"),
      });
      onDone(`Consent request sent to ${String(form.get("phone"))}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="register-title" className="w-full max-w-[460px] animate-[rise_220ms_ease] rounded-t-[36px] bg-surface px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 sm:rounded-[36px]">
        <div className="flex items-center justify-between">
          <h2 id="register-title" className="text-[20px] font-semibold text-ink">Register a mother</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-10 items-center justify-center rounded-full bg-panel">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">She gets an SMS asking her to agree. Nothing else is sent until she replies YES.</p>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-panel p-1" role="radiogroup" aria-label="Pregnant or baby">
            {(["PREGNANCY", "BABY"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={track === t}
                onClick={() => setTrack(t)}
                className={`rounded-xl py-2.5 text-sm font-semibold transition ${track === t ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
              >
                {t === "PREGNANCY" ? "Pregnant" : "Has a baby"}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="reg-phone">Her phone number</label>
          <input id="reg-phone" name="phone" type="tel" inputMode="tel" required placeholder="Her phone number, e.g. 0803 123 4567" className={field} autoComplete="off" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block px-1 text-xs font-medium text-muted" htmlFor="reg-amount">{track === "PREGNANCY" ? "Months pregnant" : "Baby's age (weeks)"}</label>
              <input id="reg-amount" name="amount" type="number" inputMode="numeric" required min={track === "PREGNANCY" ? 1 : 0} max={track === "PREGNANCY" ? 9 : 52} className={field} />
            </div>
            <div>
              <label className="mb-1 block px-1 text-xs font-medium text-muted" htmlFor="reg-language">Her language</label>
              <select id="reg-language" name="language" defaultValue="ha" className={field}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="sr-only" htmlFor="reg-location">Village or LGA</label>
          <input id="reg-location" name="location" required minLength={2} maxLength={80} placeholder="Village or LGA" className={field} />
          {error && (
            <p role="alert" className="rounded-2xl bg-urgent-soft px-4 py-3 text-sm text-urgent">
              {error}
            </p>
          )}
          <button type="submit" disabled={saving} className="mt-1 rounded-full bg-ink py-4 text-[15px] font-semibold text-white transition disabled:opacity-60">
            {saving ? "Sending..." : "Send consent request"}
          </button>
        </form>
      </div>
    </div>
  );
}
