"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Greeting, useApp } from "@/components/AppShell";
import { useApi } from "@/lib/api";
import { dayNumber, monthLabel } from "@/lib/format";
import type { Week } from "@/lib/types";

/** Shifts "2026-11-01" by whole months. */
function shiftMonth(first: string, n: number): string {
  const d = new Date(`${first}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n, 1);
  return d.toISOString().slice(0, 10);
}

/** The month at a glance: how many visits and vaccines are due each day. Tap a day to open it on Home. */
export default function CalendarPage() {
  const { changes } = useApp();
  const [month, setMonth] = useState<string | null>(null);
  const { data, error } = useApi<Week>(`dashboard/month${month ? `?date=${month}` : ""}`, changes);
  const first = month ?? (data ? `${data.today.slice(0, 7)}-01` : null);
  const lead = first ? new Date(`${first}T12:00:00Z`).getUTCDay() : 0;
  const total = data?.days.reduce((sum, d) => sum + d.due, 0) ?? 0;

  return (
    <>
      <Greeting title="Calendar" />
      <section className="mt-6 rounded-[28px] bg-panel px-3 pb-4 pt-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-[15px] font-semibold text-ink">{first ? monthLabel(first) : " "}</p>
          <div className="flex gap-1">
            <button type="button" aria-label="Previous month" disabled={!first} onClick={() => first && setMonth(shiftMonth(first, -1))} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-black/5">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" aria-label="Next month" disabled={!first} onClick={() => first && setMonth(shiftMonth(first, 1))} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-black/5">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-[12px] font-medium text-muted">
          {["S", "M", "T", "W", "T", "F", "S"].map((l, i) => (
            <span key={i} className="py-1">
              {l}
            </span>
          ))}
        </div>
        {error && <p className="px-2 py-6 text-sm text-urgent">{error}</p>}
        {!data && !error && <div className="h-[260px] animate-pulse rounded-2xl" />}
        {data && (
          <ol className="grid grid-cols-7 gap-y-1 text-center">
            {Array.from({ length: lead }, (_, i) => (
              <li key={`lead-${i}`} aria-hidden />
            ))}
            {data.days.map((d) => {
              const isToday = d.date === data.today;
              return (
                <li key={d.date}>
                  <Link
                    href={isToday ? "/" : `/?date=${d.date}`}
                    aria-label={`${d.date}${d.due ? `, ${d.due} due` : ""}`}
                    className="mx-auto flex h-14 w-full max-w-[52px] flex-col items-center justify-center gap-1 rounded-2xl transition hover:bg-black/5"
                  >
                    <span className={`flex size-9 items-center justify-center rounded-full text-[15px] tabular-nums ${isToday ? "bg-accent font-semibold text-white" : "text-ink"}`}>{dayNumber(d.date)}</span>
                    <span className={`h-1.5 rounded-full ${d.due ? "bg-accent" : "bg-transparent"} ${d.due > 2 ? "w-4" : "w-1.5"}`} />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      {data && (
        <p className="mt-4 px-1 text-sm text-muted">
          {total ? `${total === 1 ? "1 visit or vaccine" : `${total} visits and vaccines`} still due this month. Tap a day to see who.` : "Nothing due this month."}
        </p>
      )}
    </>
  );
}
