"use client";

import { CalendarDays, ClipboardList, House, Plus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", Icon: House },
  { href: "/mothers", label: "Mothers", Icon: Users },
  { href: "/follow-ups", label: "Follow-ups", Icon: ClipboardList },
  { href: "/calendar", label: "Calendar", Icon: CalendarDays },
];

/** A floating pill of tabs (the active one labelled) and a round + button that registers a mother. */
export function BottomNav({ onAdd }: { onAdd: () => void }) {
  const path = usePathname();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex max-w-[460px] items-center gap-3 px-4">
        <nav aria-label="Main" className="flex flex-1 items-center justify-between rounded-full bg-surface p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
          {TABS.map(({ href, label, Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className={`flex items-center gap-2 rounded-full transition ${active ? "bg-panel py-2 pl-2 pr-4" : "p-3 text-muted hover:text-ink"}`}
              >
                {active ? (
                  <span className="flex size-8 items-center justify-center rounded-[10px] bg-ink text-white">
                    <Icon className="size-[18px]" />
                  </span>
                ) : (
                  <Icon className="size-[22px]" strokeWidth={1.6} />
                )}
                {active && <span className="text-sm font-semibold text-ink">{label}</span>}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Register a mother"
          className="flex size-[66px] shrink-0 items-center justify-center rounded-full bg-ink text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)] transition hover:scale-105 active:scale-95"
        >
          <Plus className="size-7" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
