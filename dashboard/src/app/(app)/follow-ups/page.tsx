"use client";

import { CircleCheck } from "lucide-react";
import { Greeting, useApp } from "@/components/AppShell";
import { AlertCard, Empty, FollowUpCard, Section, Skeleton } from "@/components/cards";
import { useApi } from "@/lib/api";
import { dayKeyOf } from "@/lib/format";
import { useNow } from "@/lib/now";
import type { Alert, FollowUp } from "@/lib/types";

/** Everything still open, whenever it was raised: danger-sign alerts first, then follow-ups. */
export default function FollowUpsPage() {
  const { changes } = useApp();
  const { data, error } = useApi<{ alerts: Alert[]; followUps: FollowUp[] }>("dashboard/follow-ups", changes);
  const now = useNow();
  const today = now ? dayKeyOf(now) : "";

  return (
    <>
      <Greeting title="Follow-ups" />
      {error && <p className="mt-6 rounded-2xl bg-urgent-soft px-4 py-3 text-sm text-urgent">{error}</p>}
      {!data && !error && <Skeleton />}
      {data && data.alerts.length > 0 && (
        <Section title="Urgent" count={data.alerts.length}>
          {data.alerts.map((a) => (
            <AlertCard key={a.id} alert={a} today={today} />
          ))}
        </Section>
      )}
      {data && data.followUps.length > 0 && (
        <Section title="To follow up" count={data.followUps.length}>
          {data.followUps.map((f) => (
            <FollowUpCard key={f.id} followUp={f} today={today} />
          ))}
        </Section>
      )}
      {data && data.alerts.length + data.followUps.length === 0 && (
        <Empty icon={CircleCheck} title="All caught up" body="When a mother reports a danger sign or misses a visit, it shows here." />
      )}
    </>
  );
}
