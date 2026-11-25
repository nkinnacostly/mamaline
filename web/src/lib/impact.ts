import { connection } from "next/server";

// The MamaLine API, which serves the public totals. Override with MAMALINE_API_URL (e.g. a local API).
export const apiUrl = (process.env.MAMALINE_API_URL || "https://mamaline-api.vercel.app").replace(/\/$/, "");
export const statsUrl = `${apiUrl}/public/stats`;

// Mirrors `PublicStats` in api/src/public-stats/public-stats.service.ts; keep the two in step.
export type PublicStats = {
  generatedAt: string;
  dataStatus: "sample" | "live";
  mothers: {
    enrolled: number;
    awaitingConsent: number;
    registeredByHealthWorker: number;
    registeredBySelf: number;
    pregnant: number;
    withBaby: number;
  };
  healthWorkers: { active: number };
  care: { antenatalVisitsConfirmed: number; vaccinesConfirmed: number };
  dangerSigns: { reported: number; contacted: number; contactedWithinOneHour: number; medianMinutesToContact: number | null };
  questions: { answered: number };
  sms: { sent: number; simulated: number; failed: number };
};

/** The latest totals, read at request time. Null if the API can't be reached. */
export async function getPublicStats(): Promise<PublicStats | null> {
  await connection();
  try {
    const res = await fetch(statsUrl, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return (await res.json()) as PublicStats;
  } catch {
    return null;
  }
}
