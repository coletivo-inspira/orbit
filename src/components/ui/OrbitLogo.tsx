import { useId } from "react";

const RING = "M14 72a58 19 0 0 0 116 0";

/**
 * Official Saturn symbol (docs/design/orbit-marca.svg). The brandbook asks for the
 * one-color version from 16 px and the colored art (on night ink) from 48 px.
 */
export function OrbitLogo({
  className = "h-8 w-8",
  variant = "mono",
  title,
}: {
  className?: string;
  variant?: "mono" | "color";
  title?: string;
}) {
  const maskId = `orbit-folga-${useId().replace(/:/g, "")}`;
  const disc = variant === "color" ? "#DEC9A8" : "currentColor";
  const ring = variant === "color" ? "#A87356" : "currentColor";
  return (
    <svg
      className={className}
      viewBox="0 0 144 144"
      fill="none"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="144"
          height="144"
          style={{ maskType: "luminance" }}
        >
          <rect width="144" height="144" fill="#fff" />
          <path d={RING} transform="rotate(-27 72 72)" stroke="#000" strokeWidth="25" />
        </mask>
      </defs>
      <ellipse cx="72" cy="72" rx="58" ry="19" transform="rotate(-27 72 72)" stroke={ring} strokeWidth="12" />
      <circle cx="72" cy="72" r="35" fill={disc} mask={`url(#${maskId})`} />
      <path d={RING} transform="rotate(-27 72 72)" stroke={ring} strokeWidth="12" />
    </svg>
  );
}

/** Symbol + wordmark ("assinatura"); the symbol stays at 32 px or more. */
export function OrbitSignature({ className = "", subtitle }: { className?: string; subtitle?: React.ReactNode }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <OrbitLogo className="h-8 w-8 shrink-0 text-areia" />
      <span className="flex flex-col">
        <span className="font-display text-lg leading-none font-bold tracking-tight text-marfim">Orbit</span>
        {subtitle}
      </span>
    </span>
  );
}
