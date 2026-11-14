"use client";

import { HeartHandshake } from "lucide-react";
import { useState, type FormEvent } from "react";

const field = "w-full rounded-2xl bg-panel px-4 py-4 text-[16px] text-ink outline-none ring-accent/40 placeholder:text-muted focus:ring-2";

/** Health workers sign in with their phone number and the 4-digit PIN they set on USSD. */
export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: form.get("phone"), pin: form.get("pin") }),
    }).catch(() => null);
    if (res?.ok) return window.location.replace(`${window.location.origin}/`);
    const data = await res?.json().catch(() => null);
    setError(data?.message ?? "Could not reach MamaLine. Check your connection and try again.");
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center px-6 py-10">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-white">
        <HeartHandshake className="size-7" />
      </span>
      <h1 className="mt-6 text-[28px] font-semibold tracking-tight text-ink">MamaLine for health workers</h1>
      <p className="mt-2 text-[15px] text-muted">Sign in with your phone number and the same 4-digit PIN you use on the MamaLine USSD menu.</p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
        <label className="sr-only" htmlFor="phone">Phone number</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="Phone number, e.g. 0803 123 4567" className={field} />
        <label className="sr-only" htmlFor="pin">PIN</label>
        <input id="pin" name="pin" type="password" inputMode="numeric" autoComplete="current-password" pattern="\d{4}" maxLength={4} required placeholder="4-digit PIN" className={`${field} tracking-[0.4em] placeholder:tracking-normal`} />
        {error && (
          <p role="alert" className="rounded-2xl bg-urgent-soft px-4 py-3 text-sm text-urgent">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="mt-2 rounded-full bg-ink py-4 text-[16px] font-semibold text-white transition disabled:opacity-60">
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">No PIN yet? Ask your supervisor to set one. After 3 wrong tries, sign-in pauses for 15 minutes.</p>
    </main>
  );
}
