import { waitUntil } from '@vercel/functions';

/**
 * Starts work that should finish after the HTTP reply is sent (SMS, alerts, records after a
 * USSD screen). On a long-running server it simply runs. On Vercel, a function can be paused
 * once it has replied, so waitUntil keeps it alive until the work is done.
 */
export function inBackground(task: Promise<unknown>, onError: (error: unknown) => void): void {
  const guarded = task.catch(onError);
  if (process.env.VERCEL) waitUntil(guarded);
}
