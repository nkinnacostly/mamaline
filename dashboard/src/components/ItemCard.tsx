"use client";

import { MoreVertical } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type MenuItem = { label: string; href?: string; onSelect?: () => void | Promise<void>; tone?: "default" | "accent" };

const TONES = {
  neutral: { card: "bg-panel", badge: "bg-surface text-ink" },
  urgent: { card: "bg-urgent-soft", badge: "bg-urgent text-white" },
  warn: { card: "bg-panel", badge: "bg-warn-soft text-warn" },
  done: { card: "bg-panel opacity-60", badge: "bg-accent-soft text-accent" },
} as const;

/** One row of the day: a round icon, a title, a line of detail, and a ⋮ menu of actions. */
export function ItemCard({ icon, tone = "neutral", title, subtitle, menu, tag }: { icon: ReactNode; tone?: keyof typeof TONES; title: string; subtitle: string; menu?: MenuItem[]; tag?: string }) {
  const t = TONES[tone];
  return (
    <li className={`flex items-center gap-4 rounded-[26px] px-4 py-4 ${t.card}`}>
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${t.badge}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold leading-snug text-ink">
          <span className="line-clamp-2">{title}</span>
          {tag && <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">{tag}</span>}
        </p>
        <p className="mt-1 text-[13.5px] leading-snug text-muted">{subtitle}</p>
      </div>
      {menu && menu.length > 0 && <Kebab items={menu} label={`Actions for ${title}`} />}
    </li>
  );
}

function Kebab({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex size-9 items-center justify-center rounded-full text-ink transition hover:bg-black/5"
      >
        <MoreVertical className="size-5" />
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 top-10 z-30 min-w-[190px] animate-[rise_160ms_ease] overflow-hidden rounded-2xl bg-surface py-1.5 shadow-xl ring-1 ring-black/5">
          {items.map((item) => (
            <li key={item.label} role="none">
              {item.href ? (
                <a role="menuitem" href={item.href} className="block px-4 py-2.5 text-sm text-ink hover:bg-panel" onClick={() => setOpen(false)}>
                  {item.label}
                </a>
              ) : (
                <button
                  role="menuitem"
                  type="button"
                  disabled={busy}
                  className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-panel disabled:opacity-50 ${item.tone === "accent" ? "font-semibold text-accent" : "text-ink"}`}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await item.onSelect?.();
                    } finally {
                      setBusy(false);
                      setOpen(false);
                    }
                  }}
                >
                  {item.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
