"use client";

import { CalendarCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, shortDay } from "@/lib/format";
import { useApi } from "@/lib/api";
import type { Day, Week } from "@/lib/types";
import { Greeting, useApp } from "../AppShell";
import { AlertCard, Empty, FollowUpCard, Section, Skeleton, VisitCard } from "../cards";
import { WeekStrip } from "../WeekStrip";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Home: the greeting, a week strip, and the chosen day's alerts, follow-ups and visits. */
export function HomeScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { changes } = useApp();
  const requested = params.get("date");
  const date = requested && DATE.test(requested) ? requested : null;

  const week = useApi<Week>(`dashboard/week${date ? `?date=${date}` : ""}`, changes);
  const day = useApi<Day>(`dashboard/day${date ? `?date=${date}` : ""}`, changes);
  const today = week.data?.today ?? day.data?.date ?? "";
  const selected = date ?? today;

  const go = (key: string) => router.replace(key === today ? "/" : `/?date=${key}`, { scroll: false });
  const d = day.data?.date === selected ? day.data : null;
  const visitsDue = d?.visits.filter((v) => v.status !== "done").length ?? 0;

  return (
    <>
      <Greeting />
      <div className="mt-6">
        {week.data ? <WeekStrip days={week.data.days} selected={selected} today={today} onSelect={go} onShift={(n) => go(addDays(selected, n * 7))} /> : <div className="h-[132px] animate-pulse rounded-[28px] bg-panel" />}
      </div>

      {day.error && <p className="mt-6 rounded-2xl bg-urgent-soft px-4 py-3 text-sm text-urgent">{day.error}</p>}
      {!d && !day.error && <Skeleton />}
      {d && (
        <div className={day.loading ? "opacity-60 transition" : "transition"}>
          {d.alerts.length > 0 && (
            <Section title="Urgent" count={d.alerts.length}>
              {d.alerts.map((a) => (
                <AlertCard key={a.id} alert={a} today={today} />
              ))}
            </Section>
          )}
          {d.followUps.length > 0 && (
            <Section title="Follow-ups" count={d.followUps.length}>
              {d.followUps.map((f) => (
                <FollowUpCard key={f.id} followUp={f} today={today} />
              ))}
            </Section>
          )}
          {d.visits.length > 0 && (
            <Section title={d.isToday ? "Visits today" : `Visits, ${shortDay(d.date)}`} count={visitsDue}>
              {d.visits.map((v) => (
                <VisitCard key={`${v.motherId}:${v.itemKey}`} visit={v} />
              ))}
            </Section>
          )}
          {d.alerts.length + d.followUps.length + d.visits.length === 0 && (
            <Empty icon={CalendarCheck} title={d.isToday ? "Nothing due today" : `Nothing due on ${shortDay(d.date)}`} body="Visits and vaccines due for your mothers show here. Tap + to register a mother." />
          )}
        </div>
      )}
    </>
  );
}
