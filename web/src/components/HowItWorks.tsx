import { steps } from "@/lib/site";
import { Heart } from "./icons";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-cream py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="eyebrow">
            <Heart className="size-3 text-leaf" /> How it works
          </p>
          <h2 className="section-title mt-3">Three steps, no smartphone and no data</h2>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="relative rounded-[32px] border border-line bg-white p-7">
              <span className="flex size-12 items-center justify-center rounded-full bg-leaf-soft font-display text-2xl font-semibold text-leaf-deep">
                {i + 1}
              </span>
              <h3 className="mt-5 font-display text-2xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
