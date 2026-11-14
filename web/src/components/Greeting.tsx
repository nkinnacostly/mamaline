"use client";

import { useState } from "react";
import { greetings } from "@/lib/site";
import { Heart } from "./icons";

/** Language picker (top right of the hero) and the greeting it changes inside the hero card. */
export function useGreeting() {
  const [code, setCode] = useState("en");
  const current = greetings.find((g) => g.code === code) ?? greetings[0];
  return { code, setCode, current };
}

export function LanguagePicker({ code, onChange }: { code: string; onChange: (code: string) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-full bg-white/90 py-1.5 pr-2 pl-4 text-xs text-muted shadow-sm backdrop-blur">
      <span>Language</span>
      <select
        value={code}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer rounded-full bg-cream px-3 py-1 text-xs font-medium text-ink outline-none"
      >
        {greetings.map((g) => (
          <option key={g.code} value={g.code}>
            {g.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function GreetingLine({ greeting }: { greeting: string }) {
  return (
    <p className="eyebrow" aria-live="polite">
      <Heart className="size-3 text-leaf" />
      <span key={greeting} className="animate-[fade_400ms_ease]">
        {greeting}, Mama
      </span>
    </p>
  );
}
