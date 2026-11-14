import Image from "next/image";
import { photos, stats } from "@/lib/site";
import { Check, Heart } from "./icons";

const workerFeatures = [
  "Register mothers from any phone by USSD, at the clinic or on a home visit",
  "Get an SMS the moment one of your mothers reports a danger sign",
  "See missed visits and vaccines on one follow-up list, not on paper",
];

export function HealthWorkers() {
  return (
    <section id="health-workers" className="relative bg-leaf text-cream">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-6 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-28">
        <div>
          <p className="eyebrow text-cream/70">
            <Heart className="size-3" /> Built with community health workers
          </p>
          <h2 className="mt-4 font-display leading-[0.95] font-semibold">
            <span className="block text-6xl sm:text-7xl">MamaLine</span>
            <span className="mt-2 block text-3xl font-medium text-cream/90 sm:text-4xl">puts every mother on her CHEW&apos;s radar</span>
          </h2>
          <p className="mt-6 max-w-xl text-[0.95rem] leading-relaxed text-cream/85">
            Nigeria has about one doctor for every 9,000 people, so community health extension workers carry most of the load. MamaLine gives them a simple tool that fits the way they already work.
          </p>
          <ul className="mt-6 space-y-3">
            {workerFeatures.map((f) => (
              <li key={f} className="flex gap-3 text-[0.92rem] text-cream/90">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-cream text-leaf">
                  <Check className="size-3.5" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="relative aspect-[5/4] overflow-hidden rounded-[48px] rounded-tr-[140px] shadow-2xl shadow-leaf-deep/40 lg:-mr-[max(0px,calc((100vw-72rem)/2))] lg:rounded-r-none">
            <Image src={photos.ward.src} alt={photos.ward.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
          {/* Alert preview card */}
          <div className="absolute -bottom-8 left-4 max-w-[290px] rounded-3xl bg-cream p-4 text-ink shadow-xl sm:left-[-28px]">
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-clay uppercase">Example alert to the CHEW</p>
            <p className="mt-1.5 font-mono text-[0.78rem] leading-snug">
              MamaLine URGENT: +234803... reports Bleeding (about 33 weeks pregnant) in Kura. Call her now.
            </p>
          </div>
        </div>
      </div>

      {/* Why it matters */}
      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <h3 className="font-display text-3xl font-semibold">Why it matters</h3>
        <dl className="mt-6 grid gap-px overflow-hidden rounded-[28px] bg-cream/20 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 bg-leaf-deep/60 p-6">
              <dt className="order-2 text-[0.85rem] leading-snug text-cream/85">{s.label}</dt>
              <dd className="order-1 font-display text-4xl font-semibold tabular-nums">{s.value}</dd>
              <dd className="order-3 mt-2 text-[0.7rem] text-cream/60">
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="underline decoration-cream/30 underline-offset-2 hover:text-cream">
                  {s.source}
                </a>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <svg className="absolute -bottom-px left-0 h-16 w-full text-cream sm:h-24" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
        <path fill="currentColor" d="M0 60c240 50 520 48 760 18S1200 0 1440 34v66H0z" />
      </svg>
    </section>
  );
}
