"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { dayNumber, monthLabel, weekdayLetter } from "@/lib/format";
import type { DayCount } from "@/lib/types";

/** The week: letters, dates, the selected day in a filled circle, and a dot on days with visits due. */
export function WeekStrip({ days, selected, today, onSelect, onShift }: { days: DayCount[]; selected: string; today: string; onSelect: (date: string) => void; onShift: (weeks: number) => void }) {
  return (
    <section className="rounded-[28px] bg-panel px-3 pb-4 pt-3" aria-label="Choose a day">
      <div className="mb-1 flex items-center justify-between px-2">
        <p className="text-[13px] font-medium text-muted">{days[0] ? monthLabel(days[3]?.date ?? days[0].date) : " "}</p>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous week" onClick={() => onShift(-1)} className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-black/5">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" aria-label="Next week" onClick={() => onShift(1)} className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-black/5">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <ol className="grid grid-cols-7 text-center">
        {days.map((d) => {
          const isSelected = d.date === selected;
          const isToday = d.date === today;
          return (
            <li key={d.date}>
              <button
                type="button"
                onClick={() => onSelect(d.date)}
                aria-pressed={isSelected}
                aria-label={`${d.date}${d.due ? `, ${d.due} due` : ""}`}
                className="group flex w-full flex-col items-center gap-2.5 rounded-2xl py-1"
              >
                <span className="text-[13px] font-medium text-ink">{weekdayLetter(d.date)}</span>
                <span
                  className={`flex size-10 items-center justify-center rounded-full text-[15px] tabular-nums transition ${
                    isSelected ? "bg-accent font-semibold text-white" : isToday ? "font-semibold text-accent ring-1 ring-accent/40" : "text-muted group-hover:bg-black/5"
                  }`}
                >
                  {dayNumber(d.date)}
                </span>
                <span className={`size-1.5 rounded-full ${d.due ? "bg-accent" : "bg-transparent"}`} />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
