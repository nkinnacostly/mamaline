"use client";

import { useCallback, useEffect, useState } from "react";

/** Calls the API through this app's server (/api/mamaline/...), which adds the session token. */
async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/mamaline/${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    window.location.replace(`${window.location.origin}/sign-in`);
    throw new Error("Please sign in again.");
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as { message?: string } | null)?.message ?? "Something went wrong. Please try again.");
  return data as T;
}

export const apiGet = <T,>(path: string) => call<T>("GET", path);
export const apiPost = <T,>(path: string, body?: unknown) => call<T>("POST", path, body);

/** Loads a GET endpoint and reloads it on demand (after an action, or when the key changes). */
/** `refresh` lets a caller reload when something changed elsewhere (e.g. a mother was registered). */
export function useApi<T>(path: string | null, refresh = 0) {
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string | null }>({ key: null, data: null, error: null });
  const [version, setVersion] = useState(0);
  const key = path ? `${path}#${version}#${refresh}` : null;

  useEffect(() => {
    if (!path || !key) return;
    let cancelled = false;
    apiGet<T>(path)
      .then((data) => !cancelled && setState({ key, data, error: null }))
      .catch((e: Error) => !cancelled && setState((s) => ({ key, data: s.data, error: e.message })));
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  // Keeps showing the last data while a new request is in flight.
  return { data: state.data, error: state.error, loading: state.key !== key, reload };
}
