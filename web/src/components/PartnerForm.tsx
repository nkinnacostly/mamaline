"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check, Heart } from "./icons";

const ROLES = ["Community health worker", "PHC or state health board", "NGO or donor", "Telecom or tech partner", "Other"];

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

const field =
  "w-full rounded-full border border-line bg-white px-5 py-3.5 text-[0.9rem] text-ink placeholder:text-muted/70 outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

export function PartnerForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, consent: data.consent === "on" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Something went wrong. Please try again.");
      form.reset();
      setStatus({ kind: "sent" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Something went wrong. Please try again." });
    }
  }

  return (
    <section id="partner" className="bg-cream pt-6 pb-28">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <p className="eyebrow justify-center">
          <Heart className="size-3 text-leaf" /> Bring MamaLine to your community
        </p>
        <h2 className="section-title mt-3">Partner with us</h2>
        <p className="mx-auto mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
          We are looking for primary health centres, CHEWs, state health boards and partners to run our first pilots. Tell us where you work and how you would like to help.
        </p>

        {status.kind === "sent" ? (
          <div className="mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 rounded-[32px] bg-white p-10 shadow-lg" role="status">
            <span className="flex size-12 items-center justify-center rounded-full bg-leaf text-cream">
              <Check className="size-6" />
            </span>
            <p className="font-display text-3xl font-semibold">Thank you</p>
            <p className="text-[0.9rem] text-muted">We have your message and will reply by email.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 grid gap-4 text-left sm:grid-cols-3" noValidate={false}>
            <label className="sr-only" htmlFor="partner-name">Your name</label>
            <input id="partner-name" name="name" required maxLength={120} placeholder="Your name" autoComplete="name" className={field} />
            <label className="sr-only" htmlFor="partner-email">Email address</label>
            <input id="partner-email" name="email" type="email" required maxLength={160} placeholder="Email address" autoComplete="email" className={field} />
            <label className="sr-only" htmlFor="partner-org">Organisation or LGA</label>
            <input id="partner-org" name="organisation" required maxLength={160} placeholder="Organisation or LGA" autoComplete="organization" className={field} />

            {/* Honeypot for bots: hidden from people and screen readers, so only bots fill it */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="partner-website">Website</label>
              <input id="partner-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <label className="sr-only" htmlFor="partner-role">Your role</label>
            <select id="partner-role" name="role" required defaultValue="" className={`${field} appearance-none sm:col-span-3`}>
              <option value="" disabled>
                Which best describes you?
              </option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="partner-message">Message</label>
            <textarea
              id="partner-message"
              name="message"
              required
              maxLength={2000}
              rows={4}
              placeholder="How would you like to work with MamaLine?"
              className={`${field} rounded-[28px] sm:col-span-3`}
            />

            <div className="flex flex-col gap-4 sm:col-span-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-start gap-3 text-[0.8rem] text-muted">
                <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-leaf" />
                <span>I agree that MamaLine may store these details to reply to me.</span>
              </label>
              <button
                type="submit"
                disabled={status.kind === "sending"}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-leaf px-8 py-3.5 text-sm font-medium text-cream shadow-lg transition hover:bg-leaf-deep disabled:opacity-60"
              >
                {status.kind === "sending" ? "Sending..." : "Send message"} <ArrowUpRight />
              </button>
            </div>
            {status.kind === "error" && (
              <p className="text-sm text-red-700 sm:col-span-3" role="alert">
                {status.message}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
