"use client";

import Image from "next/image";
import { nav, photos, site } from "@/lib/site";
import { GreetingLine, LanguagePicker, useGreeting } from "./Greeting";
import { ArrowUpRight, Dots } from "./icons";
import { Logo } from "./Logo";

export function Hero() {
  const { code, setCode, current } = useGreeting();

  return (
    <section id="top" className="relative bg-cream pt-16 lg:pt-0">
      <div className="relative sm:h-[640px] lg:h-[700px]">
        {/* Photo: a band on phones; full-bleed behind the card from tablet up, inset on desktop for the side navigation */}
        <div className="relative h-[360px] overflow-hidden sm:absolute sm:inset-0 sm:h-auto lg:left-[7%] lg:rounded-bl-[140px]">
          <Image
            src={photos.hero.src}
            alt={photos.hero.alt}
            fill
            sizes="(min-width: 1024px) 93vw, 100vw"
            loading="eager"
            fetchPriority="high"
            className="object-cover object-[62%_35%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-leaf-deep/30 via-transparent to-transparent" />
        </div>

        {/* Side navigation card (desktop) */}
        <nav
          aria-label="Main"
          className="absolute top-10 left-[2.5%] z-20 hidden w-[176px] flex-col items-center rounded-[40px] bg-leaf-deep px-4 pt-5 pb-7 shadow-2xl shadow-leaf-deep/30 lg:flex"
        >
          <a href="#top" aria-label="MamaLine home" className="-mt-1">
            <Logo />
          </a>
          <ul className="mt-6 flex w-full flex-col gap-1.5">
            {nav.map((item, i) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={`block rounded-full px-3 py-2 text-center text-[0.8rem] transition ${
                    i === 0 ? "bg-leaf text-cream" : "text-cream/80 hover:bg-white/10 hover:text-cream"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Language picker */}
        <div className="absolute top-5 right-4 z-20 sm:right-8">
          <LanguagePicker code={code} onChange={setCode} />
        </div>

        {/* Hero card */}
        <div className="relative z-10 -mt-24 px-4 pb-24 sm:absolute sm:bottom-16 sm:left-8 sm:mt-0 sm:w-[470px] sm:px-0 sm:pb-0 lg:top-[170px] lg:bottom-auto lg:left-[17%]">
          <div className="relative rounded-[36px] rounded-tr-[120px] bg-cream/95 px-7 pt-8 pb-12 shadow-2xl shadow-leaf-deep/20 backdrop-blur sm:px-10 sm:pt-10">
            <GreetingLine greeting={current.greeting} />
            <h1 className="mt-4 font-display text-[2.1rem] leading-[1.05] font-semibold text-ink sm:text-[2.6rem]">
              Care for every mother,
              <span className="block text-[3.2rem] font-medium text-leaf italic sm:text-[4.2rem]">on any phone</span>
            </h1>
            <p className="mt-4 max-w-[36ch] text-[0.95rem] leading-relaxed text-muted">
              Free reminders, trusted advice and help with danger signs by USSD and SMS, in English, Pidgin, Hausa, Yoruba and Igbo.
            </p>
            <Dots className="mt-6 text-leaf" />

            {/* Round call to action, overlapping the card edge as in the reference */}
            <a
              href={site.ussdLive ? "#how-it-works" : "#try"}
              className="group absolute -right-1 -bottom-10 flex size-[118px] flex-col items-center justify-center rounded-full bg-leaf text-center text-cream shadow-xl ring-8 ring-cream/80 transition hover:bg-leaf-deep sm:-right-10"
            >
              {site.ussdLive ? (
                <>
                  <span className="text-[0.65rem] tracking-[0.2em] uppercase opacity-80">Dial</span>
                  <span className="font-display text-xl font-semibold">{site.ussdCode}</span>
                </>
              ) : (
                <>
                  <span className="text-[0.62rem] tracking-[0.2em] uppercase opacity-80">Try the</span>
                  <span className="font-display text-2xl leading-none font-semibold">demo</span>
                  <ArrowUpRight className="mt-1 size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </>
              )}
            </a>
          </div>
        </div>

        {/* Wave into the next section */}
        <svg
          className="absolute -bottom-px left-0 z-0 h-20 w-full text-cream sm:h-28"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0 96c180-40 360-62 560-38s380 64 560 46 260-58 320-70v86H0z" />
        </svg>
      </div>
    </section>
  );
}
