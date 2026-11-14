/** Round wordmark: "Mama / Line" stacked, after the reference's circular logo. */
export function Logo({ size = "lg" }: { size?: "lg" | "sm" }) {
  const big = size === "lg";
  return (
    <span
      className={`flex flex-col items-center justify-center rounded-full bg-cream text-leaf-deep shadow-sm ${
        big ? "size-28 ring-4 ring-leaf-deep" : "size-11"
      }`}
    >
      <span className={`font-display font-bold leading-none ${big ? "text-[1.7rem]" : "text-[0.8rem]"}`}>Mama</span>
      <span className={`font-display font-semibold leading-none text-leaf ${big ? "text-[1.35rem]" : "text-[0.66rem]"}`}>Line</span>
      {big && <span className="mt-1 text-[0.5rem] font-medium tracking-[0.25em] text-clay uppercase">Health line</span>}
    </span>
  );
}
