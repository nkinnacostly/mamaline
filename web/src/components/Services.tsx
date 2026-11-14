import Image from "next/image";
import { services } from "@/lib/site";
import { ArrowUpRight, Heart } from "./icons";

export function Services() {
  return (
    <section id="services" className="relative bg-cream pt-10 pb-0">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <p className="eyebrow justify-center">
          <Heart className="size-3 text-leaf" /> What MamaLine does
        </p>
        <h2 className="section-title mt-3">Care that follows every stage of motherhood</h2>
        <p className="mx-auto mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
          From the first antenatal visit to the 15-month vaccines, MamaLine keeps a mother on schedule and connects her to her community health worker.
        </p>
      </div>

      <div className="relative mt-12">
        {/* Green band behind the lower half of the cards */}
        <div className="absolute inset-x-0 bottom-0 h-[52%] rounded-tl-[120px] bg-leaf sm:rounded-tl-[200px]" aria-hidden="true" />

        <ul className="relative mx-auto grid max-w-6xl gap-6 px-4 pb-20 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {services.map((s) => (
            <li
              key={s.title.join(" ")}
              className={`group flex flex-col rounded-[34px] p-6 pb-5 shadow-xl shadow-leaf-deep/10 transition hover:-translate-y-1 ${
                s.featured ? "bg-leaf-deep text-cream" : "bg-white text-ink"
              }`}
            >
              <h3 className="font-display leading-none">
                <span className="block text-xl font-medium">{s.title[0]}</span>
                <span className={`block text-[2rem] font-semibold ${s.featured ? "text-cream" : "text-leaf"}`}>{s.title[1]}</span>
              </h3>
              <p className={`mt-3 min-h-[5.5rem] text-[0.82rem] leading-relaxed ${s.featured ? "text-cream/80" : "text-muted"}`}>{s.text}</p>

              <div className="relative mt-4">
                <div className="relative aspect-[5/4] overflow-hidden sm:aspect-[4/5] rounded-[999px_999px_28px_28px] ring-4 ring-cream/70">
                  <Image
                    src={s.photo.src}
                    alt={s.photo.alt}
                    fill
                    sizes="(min-width: 1024px) 240px, (min-width: 640px) 45vw, 90vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <a
                  href={s.href}
                  aria-label={`More about ${s.title.join(" ").toLowerCase()}`}
                  className="absolute top-6 right-2 flex size-11 items-center justify-center rounded-full bg-leaf text-cream shadow-lg ring-4 ring-white transition hover:bg-leaf-deep"
                >
                  <ArrowUpRight />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
