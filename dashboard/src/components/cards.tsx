"use client";

import { Baby, ClipboardList, HeartPulse, Syringe, TriangleAlert, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { apiPost } from "@/lib/api";
import { localPhone, relativeDay, telHref, when } from "@/lib/format";
import type { Alert, FollowUp, Mother, Visit } from "@/lib/types";
import { useApp } from "./AppShell";
import { ItemCard, type MenuItem } from "./ItemCard";

const icon = "size-[22px]";

/** Runs an action, then shows a toast and reloads every open list. */
function useAct() {
  const { toast, changed } = useApp();
  return async (run: () => Promise<unknown>, done: string) => {
    try {
      await run();
      toast(done);
      changed();
    } catch (err) {
      toast((err as Error).message);
    }
  };
}

/** A removed mother's records keep the alert but not her number. */
const reachable = (phone: string) => phone.startsWith("+");
const callItem = (phone: string): MenuItem[] => (reachable(phone) ? [{ label: `Call ${localPhone(phone)}`, href: telHref(phone) }] : []);
const who = (phone: string, place?: string | null) => [place, reachable(phone) ? localPhone(phone) : "number removed"].filter(Boolean).join(" • ");

export function AlertCard({ alert, today }: { alert: Alert; today: string }) {
  const act = useAct();
  return (
    <ItemCard
      tone="urgent"
      icon={<TriangleAlert className={icon} />}
      title={alert.signLabel}
      subtitle={`${when(alert.createdAt, today)} • ${who(alert.phone, alert.location)}`}
      menu={[...callItem(alert.phone), { label: "Mark as contacted", tone: "accent", onSelect: () => act(() => apiPost(`dashboard/alerts/${alert.id}/contacted`), "Marked as contacted") }]}
    />
  );
}

export function FollowUpCard({ followUp, today }: { followUp: FollowUp; today: string }) {
  const act = useAct();
  return (
    <ItemCard
      tone="warn"
      icon={<ClipboardList className={icon} />}
      title={followUp.reason}
      subtitle={`${when(followUp.createdAt, today)} • ${who(followUp.phone)}`}
      menu={[...callItem(followUp.phone), { label: "Mark as done", tone: "accent", onSelect: () => act(() => apiPost(`dashboard/follow-ups/${followUp.id}/done`), "Follow-up done") }]}
    />
  );
}

const VISIT_STATUS: Record<Visit["status"], string> = { done: "Done", due: "Due today", missed: "Missed", upcoming: "Coming up" };

export function VisitCard({ visit }: { visit: Visit }) {
  const act = useAct();
  const menu: MenuItem[] = [...callItem(visit.phone)];
  if (visit.status !== "done" && visit.status !== "upcoming") {
    menu.push({ label: visit.kind === "vaccine" ? "Mark vaccines given" : "Mark visit done", tone: "accent", onSelect: () => act(() => apiPost(`dashboard/mothers/${visit.motherId}/visits/${visit.itemKey}/done`), "Recorded. No more reminders for it.") });
  }
  return (
    <ItemCard
      tone={visit.status === "done" ? "done" : visit.status === "missed" ? "warn" : "neutral"}
      icon={visit.kind === "vaccine" ? <Syringe className={icon} /> : <HeartPulse className={icon} />}
      title={visit.title}
      subtitle={`${VISIT_STATUS[visit.status]} • ${who(visit.phone, visit.location)}`}
      menu={menu}
    />
  );
}

export function MotherCard({ mother, today }: { mother: Mother; today: string }) {
  const act = useAct();
  const pending = mother.consentStatus === "PENDING";
  const stage = mother.track === "PREGNANCY" ? `${mother.week} weeks pregnant` : `Baby, ${mother.week} weeks`;
  const next = mother.next ? `${mother.next.overdue ? "Overdue" : "Next"}: ${mother.next.title.toLowerCase()}, ${relativeDay(mother.next.due, today)}` : null;
  const menu: MenuItem[] = [...callItem(mother.phone)];
  if (mother.track === "PREGNANCY") {
    menu.push({
      label: "Record birth",
      tone: "accent",
      onSelect: () => {
        if (!window.confirm(`Record that ${localPhone(mother.phone)} has given birth today? Her reminders switch to baby vaccines.`)) return;
        return act(() => apiPost(`dashboard/mothers/${mother.id}/birth`), "Birth recorded. Vaccine reminders are on.");
      },
    });
  }
  return (
    <ItemCard
      tone={pending ? "neutral" : mother.next?.overdue ? "warn" : "neutral"}
      icon={pending ? <UserRound className={icon} /> : mother.track === "BABY" ? <Baby className={icon} /> : <HeartPulse className={icon} />}
      title={localPhone(mother.phone)}
      tag={pending ? "awaiting consent" : undefined}
      subtitle={[stage, mother.location, next].filter(Boolean).join(" • ")}
      menu={menu}
    />
  );
}

export function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 flex items-baseline gap-2 px-1 text-[17px] font-semibold text-ink">
        {title}
        {count !== undefined && <span className="text-sm font-medium text-muted">{count}</span>}
      </h2>
      <ul className="flex flex-col gap-3">{children}</ul>
    </section>
  );
}

export function Empty({ icon: Icon = ClipboardList, title, body }: { icon?: typeof ClipboardList; title: string; body: string }) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-[28px] bg-panel px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface text-accent">
        <Icon className="size-6" />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-[260px] text-sm text-muted">{body}</p>
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="mt-7 flex flex-col gap-3" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="h-[80px] animate-pulse rounded-[26px] bg-panel" />
      ))}
    </ul>
  );
}
