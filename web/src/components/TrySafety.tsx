import Image from "next/image";
import { photos, safety } from "@/lib/site";
import { ArrowUpRight, Dots, Heart, Shield } from "./icons";
import { PhoneDemo } from "./PhoneDemo";

export function TrySafety() {
  return (
    <section className="bg-cream pb-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        {/* Demo card, after the reference's "free assessment" card */}
        <div id="try" className="relative rounded-[999px_999px_40px_40px] bg-white px-6 pt-16 pb-8 shadow-xl shadow-leaf-deep/10 sm:px-10">
          <Dots className="absolute top-10 right-12 text-leaf" />
          <div className="text-center">
            <p className="eyebrow justify-center">
              <Heart className="size-3 text-leaf" /> Try it now
            </p>
            <h2 className="mt-2 font-display text-4xl font-semibold">
              The USSD menu, <span className="text-leaf italic">live</span>
            </h2>
          </div>
          <div className="mt-8">
            <PhoneDemo />
          </div>
        </div>

        {/* Safety promise, after the reference's mission statement */}
        <div id="safety">
          <p className="eyebrow">
            <Heart className="size-3 text-leaf" /> Our promise
          </p>
          <h2 className="section-title mt-3">Safety comes before AI</h2>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-muted">
            AI helps MamaLine answer questions in a mother&apos;s own language. But advice about pregnancy and babies has to be safe first, so every message passes through fixed safety rules written from WHO danger-sign guidance.
          </p>
          <ul className="mt-6 space-y-4">
            {safety.map((line) => (
              <li key={line} className="flex gap-3 text-[0.92rem] leading-relaxed">
                <Shield className="mt-0.5 size-5 shrink-0 text-leaf" />
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex items-center gap-5">
            <a
              href="#partner"
              className="inline-flex items-center gap-2 rounded-full bg-leaf px-6 py-3 text-sm font-medium text-cream shadow-lg transition hover:bg-leaf-deep"
            >
              Partner with us <ArrowUpRight />
            </a>
            <div className="relative size-16 overflow-hidden rounded-full ring-4 ring-white">
              <Image src={photos.onThePhone.src} alt={photos.onThePhone.alt} fill sizes="64px" className="object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
