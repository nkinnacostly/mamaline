"use client";

import { LogOut } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useApi } from "@/lib/api";
import { useNow } from "@/lib/now";
import { firstName, greeting, initials, longDate } from "@/lib/format";
import type { HealthWorker } from "@/lib/types";
import { BottomNav } from "./BottomNav";
import { RegisterSheet } from "./RegisterSheet";

type AppContextValue = {
  worker: HealthWorker | null;
  toast: (message: string) => void;
  /** Bumps after anything changes, so open screens reload. */
  changes: number;
  changed: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppShell");
  return ctx;
}

/** The phone-width app: content, the floating tab bar, the register sheet and toasts. */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: worker } = useApi<HealthWorker>("auth/me");
  const [toastText, setToastText] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [changes, setChanges] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((message: string) => {
    setToastText(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastText(null), 3500);
  }, []);
  const changed = useCallback(() => setChanges((c) => c + 1), []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <AppContext.Provider value={{ worker, toast, changes, changed }}>
      <div inert={registering} className="mx-auto min-h-dvh max-w-[460px] bg-surface pb-36 sm:my-6 sm:min-h-[calc(100dvh-48px)] sm:rounded-[44px] sm:shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
        <div className="px-5 pt-[max(24px,env(safe-area-inset-top))]">{children}</div>
      </div>
      <div inert={registering}>
        <BottomNav onAdd={() => setRegistering(true)} />
      </div>
      {registering && (
        <RegisterSheet
          onClose={() => setRegistering(false)}
          onDone={(message) => {
            setRegistering(false);
            toast(message);
            changed();
          }}
        />
      )}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-6">
        {toastText && <p className="animate-[rise_200ms_ease] rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-lg">{toastText}</p>}
      </div>
    </AppContext.Provider>
  );
}

/** "December 10, 2025 / Good morning, Amina" with her initials, as in the reference header. */
export function Greeting({ title }: { title?: string }) {
  const { worker } = useApp();
  const now = useNow();
  const [menu, setMenu] = useState(false);
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <p className="h-5 text-[13px] text-muted">{now ? longDate(now) : ""}</p>
        <h1 className="mt-1 min-h-8 text-[24px] font-semibold tracking-tight text-ink">{title ?? (now ? `${greeting(now)}${worker ? `, ${firstName(worker.name)}` : ""}` : "")}</h1>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-label="Account"
          aria-expanded={menu}
          className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-base font-semibold text-accent ring-4 ring-panel"
        >
          {worker ? initials(worker.name) : ""}
        </button>
        {menu && (
          <div className="absolute right-0 top-16 z-30 w-56 animate-[rise_160ms_ease] rounded-2xl bg-surface p-2 shadow-xl ring-1 ring-black/5">
            {worker && <p className="px-3 py-2 text-sm text-muted">{worker.name}</p>}
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-ink hover:bg-panel"
              onClick={async () => {
                await fetch("/api/session", { method: "DELETE" });
                window.location.replace(`${window.location.origin}/sign-in`);
              }}
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
