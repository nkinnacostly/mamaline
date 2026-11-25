import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { ArrowUpRight, Heart } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { getPublicStats, statsUrl, type PublicStats } from "@/lib/impact";

export const metadata: Metadata = {
  title: "Live data | MamaLine",
  description:
    "Live totals from the MamaLine service: mothers enrolled, visits and vaccines confirmed, danger signs reported and how fast health workers respond. Counts only, no personal data.",
};

const count = new Intl.NumberFormat("en-NG");
const stamp = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

type Figure = { value: string; label: string; note?: string };

function groups(s: PublicStats): { title: string; figures: Figure[] }[] {
  const { mothers, dangerSigns: ds } = s;
  return [
    {
      title: "Reach",
      figures: [
        { value: count.format(mothers.enrolled), label: "mothers enrolled", note: `${count.format(mothers.pregnant)} pregnant, ${count.format(mothers.withBaby)} with a baby` },
        { value: count.format(mothers.registeredByHealthWorker), label: "registered by their health worker", note: `${count.format(mothers.registeredBySelf)} registered themselves` },
        { value: count.format(mothers.awaitingConsent), label: "waiting to say YES", note: "Registered by a health worker; nothing is sent until she agrees" },
        { value: count.format(s.healthWorkers.active), label: "health workers on the line" },
      ],
    },
    {
      title: "Care",
      figures: [
        { value: count.format(s.care.antenatalVisitsConfirmed), label: "antenatal visits confirmed", note: "By the mother or her health worker" },
        { value: count.format(s.care.vaccinesConfirmed), label: "baby vaccines confirmed" },
        { value: count.format(s.questions.answered), label: "health questions answered" },
      ],
    },
    {
      title: "Safety",
      figures: [
        { value: count.format(ds.reported), label: "danger signs reported", note: "Each one told where to go now and to call 112" },
        {
          value: ds.contacted === 0 ? "None yet" : `${count.format(ds.contactedWithinOneHour)} of ${count.format(ds.contacted)}`,
          label: "reached by a health worker within 1 hour",
        },
        {
          value: ds.medianMinutesToContact === null ? "None yet" : `${count.format(ds.medianMinutesToContact)} min`,
          label: "typical time to reach her",
          note: "Median, from her report to her health worker marking her contacted",
        },
      ],
    },
    {
      title: "Messages",
      figures: [
        { value: count.format(s.sms.sent), label: "SMS sent to phones" },
        { value: count.format(s.sms.simulated), label: "SMS recorded, not sent", note: "No SMS provider is connected yet" },
        { value: count.format(s.sms.failed), label: "SMS that failed" },
      ],
    },
  ];
}

function SampleNotice() {
  return (
    <div role="note" className="mt-8 rounded-[28px] border border-clay/40 bg-sand px-6 py-5 text-[0.92rem] leading-relaxed">
      <p className="font-semibold text-ink">Sample data, not real mothers</p>
      <p className="mt-1 text-muted">
        MamaLine has not launched yet. The service is live, but its database holds test records, so these figures show how the page works, not real impact. They switch to real figures when
        our first pilot starts.
      </p>
    </div>
  );
}

function FigureGrid({ title, figures }: { title: string; figures: Figure[] }) {
  return (
    <section aria-labelledby={`group-${title}`} className="mt-12">
      <h2 id={`group-${title}`} className="font-display text-3xl font-semibold">
        {title}
      </h2>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {figures.map((f) => (
          <li key={f.label} className="rounded-[28px] border border-line bg-white p-6">
            <p className="font-display text-4xl leading-none font-semibold text-leaf-deep lining-nums">{f.value}</p>
            <p className="mt-3 text-[0.92rem] font-medium text-ink">{f.label}</p>
            {f.note && <p className="mt-1 text-[0.8rem] leading-relaxed text-muted">{f.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

async function LiveFigures() {
  const stats = await getPublicStats();
  if (!stats) {
    return (
      <p role="status" className="mt-10 rounded-[28px] border border-line bg-white px-6 py-5 text-[0.92rem] text-muted">
        The live figures can&apos;t be reached right now. Please try again in a minute.
      </p>
    );
  }
  return (
    <>
      {stats.dataStatus === "sample" && <SampleNotice />}
      <p className="mt-6 text-[0.85rem] text-muted">Updated {stamp.format(new Date(stats.generatedAt))}, Nigerian time.</p>
      {groups(stats).map((g) => (
        <FigureGrid key={g.title} {...g} />
      ))}
    </>
  );
}

function LoadingFigures() {
  return (
    <ul aria-hidden="true" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="h-32 animate-pulse rounded-[28px] border border-line bg-white" />
      ))}
    </ul>
  );
}

const definitions = [
  ["Mothers enrolled", "registered and agreed to messages. A mother who replies STOP is deleted, so she leaves the count."],
  ["Visits and vaccines confirmed", "she replied that she went, or her health worker marked it done."],
  ["Danger signs reported", "from the danger-sign menu, or found in her message by the fixed safety rules or the AI. Callers who never registered count too."],
  ["Reached within 1 hour", "out of the reports her health worker has marked contacted."],
];

export default function ImpactPage() {
  return (
    <>
      <header className="bg-leaf-deep">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 text-cream" aria-label="MamaLine home">
            <Logo size="sm" />
            <span className="font-display text-xl font-semibold">MamaLine</span>
          </Link>
          <Link href="/" className="rounded-full px-3.5 py-2 text-sm text-cream/85 transition hover:bg-white/10 hover:text-cream">
            Back to home
          </Link>
        </div>
      </header>

      <main className="bg-cream pt-14 pb-40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="eyebrow">
            <Heart className="size-3 text-leaf" /> Open data
          </p>
          <h1 className="section-title mt-3">MamaLine, live</h1>
          <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
            Totals straight from the MamaLine service, at most a minute old. Counts only: no names, phone numbers or places, and nothing that could point to one mother.
          </p>

          <Suspense fallback={<LoadingFigures />}>
            <LiveFigures />
          </Suspense>

          <section aria-labelledby="how-we-count" className="mt-16 grid gap-10 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 id="how-we-count" className="font-display text-3xl font-semibold">
                How we count
              </h2>
              <dl className="mt-4 space-y-3 text-[0.9rem] leading-relaxed">
                {definitions.map(([term, text]) => (
                  <div key={term}>
                    <dt className="inline font-medium text-ink">{term}: </dt>
                    <dd className="inline text-muted">{text}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-[28px] bg-leaf-soft p-6">
              <h2 className="font-display text-2xl font-semibold">Use the data</h2>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">The same figures as JSON, for partners and researchers. Anyone may read them; no sign-in.</p>
              <a
                href={statsUrl}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-leaf-deep px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf"
              >
                Open the JSON <ArrowUpRight className="size-4" />
              </a>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
