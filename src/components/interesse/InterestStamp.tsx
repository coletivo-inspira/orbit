import { TapIcon } from "@/components/interesse/TapIcon";

/** Rubber stamp over a card whose person tapped the user; `animate` lands it when the card reaches the front. */
export function InterestStamp({ animate, compact = false }: { animate: boolean; compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute top-[11%] left-[9%] flex rotate-[-11deg] items-center rounded-md border-areia bg-tinta/60 font-black tracking-[0.14em] text-areia uppercase shadow-[0_0_0_2px_rgba(28,38,49,0.55),inset_0_0_0_1.5px_rgba(222,201,168,0.45)] backdrop-blur-[2px] ${
        compact ? "gap-0.5 border-2 px-1.5 py-0.5 text-xs" : "gap-1 border-[3px] px-2.5 py-1 text-[15px]"
      } ${animate ? "carimbo-entra" : ""}`}
    >
      <TapIcon className={compact ? "h-3 w-3" : "h-[18px] w-[18px]"} filled />
      Interessado
    </span>
  );
}
