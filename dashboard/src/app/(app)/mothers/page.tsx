"use client";

import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Greeting, useApp } from "@/components/AppShell";
import { Empty, MotherCard, Section, Skeleton } from "@/components/cards";
import { useApi } from "@/lib/api";
import { dayKeyOf, localPhone } from "@/lib/format";
import { useNow } from "@/lib/now";
import type { Mother } from "@/lib/types";

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "pregnant", label: "Pregnant", test: (m: Mother) => m.track === "PREGNANCY" && m.consentStatus === "GIVEN" },
  { key: "baby", label: "Babies", test: (m: Mother) => m.track === "BABY" && m.consentStatus === "GIVEN" },
  { key: "pending", label: "Awaiting consent", test: (m: Mother) => m.consentStatus === "PENDING" },
] as const;

export default function MothersPage() {
  const { changes } = useApp();
  const { data, error } = useApi<Mother[]>("dashboard/mothers", changes);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const now = useNow();
  const today = now ? dayKeyOf(now) : "";

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    const test = FILTERS.find((f) => f.key === filter)!.test;
    return (data ?? []).filter((m) => test(m) && (!q || `${localPhone(m.phone)}${m.phone}${m.location}`.toLowerCase().replace(/\s+/g, "").includes(q)));
  }, [data, filter, query]);

  return (
    <>
      <Greeting title="Your mothers" />
      <label className="mt-6 flex items-center gap-3 rounded-full bg-panel px-5 py-3.5">
        <Search className="size-5 text-muted" />
        <span className="sr-only">Search by number or village</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search number or village" className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted" />
      </label>
      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Filter">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${filter === f.key ? "bg-ink text-white" : "bg-panel text-muted hover:text-ink"}`}
          >
            {f.label}
            {data && <span className="ml-1.5 opacity-60">{data.filter(f.test).length}</span>}
          </button>
        ))}
      </div>

      {error && <p className="mt-6 rounded-2xl bg-urgent-soft px-4 py-3 text-sm text-urgent">{error}</p>}
      {!data && !error && <Skeleton rows={5} />}
      {data && shown.length > 0 && (
        <Section title={FILTERS.find((f) => f.key === filter)!.label} count={shown.length}>
          {shown.map((m) => (
            <MotherCard key={m.id} mother={m} today={today} />
          ))}
        </Section>
      )}
      {data && shown.length === 0 && (
        <Empty icon={Users} title={data.length ? "No one matches" : "No mothers yet"} body={data.length ? "Try another number, village or filter." : "Tap + to register a mother. She gets an SMS asking her to agree first."} />
      )}
    </>
  );
}
