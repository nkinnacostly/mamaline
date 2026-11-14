"use client";

import { useEffect, useState } from "react";
import { nav } from "@/lib/site";
import { Close, Menu } from "./icons";
import { Logo } from "./Logo";

/**
 * A slim bar fixed to the top. On phones it is always there (the hero's side
 * navigation is desktop only); on desktop it slides in once the hero is passed.
 */
export function StickyHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 560);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ${
        scrolled ? "translate-y-0" : "translate-y-0 lg:-translate-y-full"
      }`}
    >
      <div className={`border-b border-white/10 bg-leaf-deep/95 backdrop-blur ${scrolled ? "shadow-lg" : ""}`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-3 text-cream" aria-label="MamaLine home">
            <Logo size="sm" />
            <span className="font-display text-xl font-semibold">MamaLine</span>
          </a>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {nav.slice(1).map((item) => (
              <a key={item.href} href={item.href} className="rounded-full px-3.5 py-2 text-sm text-cream/85 transition hover:bg-white/10 hover:text-cream">
                {item.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            className="rounded-full p-2 text-cream lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            {open ? <Close /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-menu" className="bg-leaf-deep px-4 pb-6 lg:hidden" aria-label="Main">
          <ul className="flex flex-col gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-full px-4 py-3 text-cream/90 hover:bg-white/10"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
