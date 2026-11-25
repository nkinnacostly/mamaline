import Image from "next/image";
import { footerLinks, photos, site } from "@/lib/site";
import { Heart } from "./icons";

export function Footer() {
  const year = 2026;
  return (
    <footer className="relative bg-leaf text-cream">
      <svg className="absolute -top-px left-0 h-16 w-full -translate-y-full text-leaf sm:h-24" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
        <path fill="currentColor" d="M0 100V58c220-56 470-66 720-30s520 34 720-12v84z" />
      </svg>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-10 pb-12 sm:px-6 md:grid-cols-[1.2fr_1fr_auto] md:items-start">
        <div>
          <p className="eyebrow text-cream/70">
            <Heart className="size-3" /> Get in touch
          </p>
          <h2 className="mt-3 font-display text-4xl leading-tight font-semibold">
            Contact
            <br />
            MamaLine
          </h2>
          <p className="mt-4 max-w-sm text-[0.9rem] leading-relaxed text-cream/80">
            Health workers, clinics and partners can reach us through the partner form. Mothers will reach MamaLine by USSD from {site.pilotArea}.
          </p>
          <dl className="mt-6 space-y-2 text-[0.9rem]">
            <div className="flex gap-2">
              <dt className="text-cream/70">USSD:</dt>
              <dd>{site.ussdLive ? site.ussdCode : "launches with our first pilot"}</dd>
            </div>
            {site.contactEmail && (
              <div className="flex gap-2">
                <dt className="text-cream/70">Email:</dt>
                <dd>
                  <a href={`mailto:${site.contactEmail}`} className="underline underline-offset-2">
                    {site.contactEmail}
                  </a>
                </dd>
              </div>
            )}
            {site.contactPhone && (
              <div className="flex gap-2">
                <dt className="text-cream/70">Phone:</dt>
                <dd>{site.contactPhone}</dd>
              </div>
            )}
          </dl>
        </div>

        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-3 text-[0.9rem]">
            {footerLinks.map((item) => (
              <li key={item.href} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-cream/60" />
                <a href={item.href} className="text-cream/85 hover:text-cream">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="relative mx-auto size-56 overflow-hidden rounded-full ring-8 ring-cream md:-mt-28 md:size-64">
          <Image src={photos.motherAndChild.src} alt={photos.motherAndChild.alt} fill sizes="256px" className="object-cover" />
        </div>
      </div>

      <div className="border-t border-cream/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-[0.78rem] text-cream/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            <span className="font-display text-base font-semibold text-cream">MamaLine</span> &copy; {year}. Health information, not a substitute for care from a health worker.
          </p>
          <p>
            Photos from{" "}
            <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-cream">
              Unsplash
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
