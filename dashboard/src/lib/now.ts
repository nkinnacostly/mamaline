"use client";

import { useSyncExternalStore } from "react";

// The current time, read only in the browser (never while the page is prerendered),
// updated every minute so the greeting and "today" stay right on a phone left open.
const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
};
const getSnapshot = () => Math.floor(Date.now() / 60_000) * 60_000;
const getServerSnapshot = () => null;

export function useNow(): Date | null {
  const t = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return t === null ? null : new Date(t);
}
