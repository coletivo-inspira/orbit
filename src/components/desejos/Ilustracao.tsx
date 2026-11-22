import type { ReactNode } from "react";
import type { IlustracaoId } from "@/lib/desejos/types";

const TINTA = "#1c2631";
const MARFIM = "#f5f0e7";
const AREIA = "#dec9a8";
const COBRE = "#a87356";
const COBRE_ESCURO = "#754b38";
const SALVIA = "#d9e4d6";
const PRESENCA = "#30483d";

/**
 * Objects, settings and silhouettes only: no bodies, nudity or explicit acts. Every scene
 * keeps the same frame, palette and amount of detail so no option looks more inviting.
 */
const CENAS: Record<IlustracaoId, ReactNode> = {
  jantar: (
    <>
      <circle cx="80" cy="50" r="22" fill={AREIA} opacity="0.14" />
      <rect x="26" y="86" width="108" height="6" rx="3" fill={COBRE} />
      <rect x="76" y="58" width="8" height="28" rx="2" fill={MARFIM} />
      <path d="M80 40c5 6 6 11 0 16-6-5-5-10 0-16z" fill={AREIA} />
      <path d="M44 50h18c0 13-4 20-9 20s-9-7-9-20z" fill={SALVIA} />
      <rect x="52" y="70" width="2" height="13" fill={SALVIA} />
      <rect x="46" y="83" width="14" height="3" rx="1.5" fill={SALVIA} />
      <path d="M98 50h18c0 13-4 20-9 20s-9-7-9-20z" fill={SALVIA} />
      <rect x="106" y="70" width="2" height="13" fill={SALVIA} />
      <rect x="100" y="83" width="14" height="3" rx="1.5" fill={SALVIA} />
      <path d="M45 56h16M99 56h16" stroke={COBRE_ESCURO} strokeWidth="3" />
    </>
  ),
  caneca: (
    <>
      <path d="M18 96c10-22 30-34 56-34h40c14 0 24 10 28 34z" fill={COBRE} />
      <path
        d="M30 96c8-16 24-26 44-26M48 96c6-10 16-16 28-16"
        stroke={AREIA}
        strokeWidth="2"
        fill="none"
        opacity="0.6"
      />
      <path d="M90 50h30v26c0 8-6 14-14 14h-2c-8 0-14-6-14-14z" fill={MARFIM} />
      <path d="M120 56c10 0 10 16 0 16" stroke={MARFIM} strokeWidth="4" fill="none" />
      <path
        d="M100 42c-4-6 4-8 0-14M110 42c-4-6 4-8 0-14"
        stroke={AREIA}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M105 66c-2-3-7-2-7 2 0 3 7 7 7 7s7-4 7-7c0-4-5-5-7-2z" fill={COBRE} />
    </>
  ),
  janela: (
    <>
      <circle cx="130" cy="24" r="9" fill={MARFIM} opacity="0.9" />
      <rect x="62" y="20" width="58" height="80" rx="2" fill={TINTA} />
      <g fill={MARFIM} opacity="0.12">
        <rect x="70" y="28" width="12" height="12" />
        <rect x="100" y="28" width="12" height="12" />
        <rect x="70" y="76" width="12" height="12" />
        <rect x="100" y="76" width="12" height="12" />
      </g>
      <rect x="84" y="50" width="16" height="18" fill={AREIA} />
      <path d="M84 50h7c-2 6-2 12 0 18h-7z" fill={COBRE} />
      <rect x="18" y="88" width="44" height="4" rx="2" fill={SALVIA} />
      <path d="M22 92v10M32 92v10M42 92v10M52 92v10" stroke={SALVIA} strokeWidth="2" />
      <path d="M26 80c4-6 10-6 14 0" stroke={AREIA} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="33" cy="74" r="5" fill={COBRE_ESCURO} />
    </>
  ),
  palco: (
    <>
      <path d="M66 10h28l26 84H40z" fill={AREIA} opacity="0.2" />
      <ellipse cx="80" cy="94" rx="44" ry="7" fill={AREIA} opacity="0.45" />
      <path d="M14 10h22c-4 30-4 58 2 86H14z" fill={COBRE} />
      <path d="M146 10h-22c4 30 4 58-2 86h24z" fill={COBRE} />
      <circle cx="80" cy="48" r="7" fill={COBRE_ESCURO} />
      <path d="M70 92c0-14 3-30 10-34 7 4 10 20 10 34z" fill={COBRE_ESCURO} />
      <path d="M72 64l-10-12M88 64l10-12" stroke={COBRE_ESCURO} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  coroa: (
    <>
      <ellipse cx="80" cy="90" rx="42" ry="10" fill={COBRE} />
      <path d="M40 88c8-6 72-6 80 0" stroke={COBRE_ESCURO} strokeWidth="2" fill="none" />
      <path d="M50 78 44 40l20 18 16-26 16 26 20-18-6 38z" fill={AREIA} />
      <rect x="50" y="74" width="60" height="8" rx="2" fill={AREIA} />
      <circle cx="80" cy="60" r="4" fill={SALVIA} />
      <circle cx="62" cy="66" r="3" fill={SALVIA} />
      <circle cx="98" cy="66" r="3" fill={SALVIA} />
    </>
  ),
  chave: (
    <>
      <path d="M106 34c-8-8-20-2-20 8 0 12 20 22 20 22s20-10 20-22c0-10-12-16-20-8z" fill={COBRE} />
      <rect x="102" y="44" width="8" height="10" rx="2" fill={TINTA} opacity="0.6" />
      <circle cx="46" cy="72" r="14" fill="none" stroke={AREIA} strokeWidth="6" />
      <path d="M60 72h40" stroke={AREIA} strokeWidth="6" strokeLinecap="round" />
      <path d="M88 72v10M96 72v8" stroke={AREIA} strokeWidth="6" />
      <path d="M30 96c16 6 40 6 56 0" stroke={SALVIA} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  setas: (
    <>
      <path d="M48 52a34 26 0 0 1 60-10" stroke={AREIA} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M100 30l12 12-16 4z" fill={AREIA} />
      <path d="M112 68a34 26 0 0 1-60 10" stroke={SALVIA} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M60 90 48 78l16-4z" fill={SALVIA} />
      <circle cx="80" cy="60" r="6" fill={COBRE} />
    </>
  ),
  corda: (
    <>
      <rect x="18" y="80" width="124" height="20" rx="10" fill={MARFIM} opacity="0.12" />
      <g fill="none" stroke={AREIA} strokeWidth="6" strokeLinecap="round">
        <ellipse cx="74" cy="64" rx="30" ry="20" />
        <ellipse cx="74" cy="64" rx="18" ry="11" />
        <path d="M104 64c10 0 16 8 26 22" />
      </g>
      <g stroke={COBRE} strokeWidth="1.5" opacity="0.8">
        <path d="M50 52l4 4M62 46l3 5M80 44l2 5M96 50l-3 4M100 68l-4 2M86 82l-2-5M64 84l2-5M46 72l5-2" />
      </g>
      <circle cx="131" cy="88" r="4" fill={COBRE} />
    </>
  ),
  pimenta: (
    <>
      <path d="M60 46c18-6 46 0 56 22 6 14 0 30-6 30-4-18-22-32-46-36-10-2-12-12-4-16z" fill={COBRE} />
      <path
        d="M62 50c14-2 30 2 40 12"
        stroke={AREIA}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M58 48c-6-4-8-12-4-18M54 30c6 0 10 4 10 10"
        stroke={SALVIA}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M34 66c-4-6 2-10-2-16M26 80c-4-6 2-10-2-16M42 84c-4-6 2-10-2-16"
        stroke={AREIA}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
    </>
  ),
  rosa: (
    <>
      <path d="M80 56c4 14-2 30 4 44" stroke={SALVIA} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M81 70l8-4M79 82l-8-3M83 92l7-3" stroke={SALVIA} strokeWidth="3" strokeLinecap="round" />
      <path d="M82 76c10-10 22-8 26-4-8 8-18 8-26 4z" fill={PRESENCA} stroke={SALVIA} strokeWidth="1.5" />
      <circle cx="80" cy="40" r="20" fill={COBRE} />
      <path d="M66 36c6-10 22-10 28 0-6 8-22 8-28 0z" fill={COBRE_ESCURO} />
      <path d="M72 38c4-6 12-6 16 0" stroke={AREIA} strokeWidth="2" fill="none" />
      <path d="M62 46c6 10 30 10 36 0" stroke={AREIA} strokeWidth="2" fill="none" opacity="0.6" />
    </>
  ),
  aviao: (
    <>
      <path
        d="M24 92c20-4 22-26 40-26s14 22 34 10"
        stroke={AREIA}
        strokeWidth="2.5"
        strokeDasharray="5 6"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M96 66 140 30 108 82l-6-12z" fill={MARFIM} />
      <path d="M96 66l44-36-38 40z" fill={SALVIA} />
      <path d="M102 70l6 12 4-14z" fill={AREIA} />
      <path d="M118 92l6-4M126 98l8-3M112 100l4-5" stroke={COBRE} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  floresta: (
    <>
      <circle cx="120" cy="28" r="11" fill={MARFIM} />
      <circle cx="125" cy="25" r="10" fill="#27323d" />
      <path d="M36 96 52 40l16 56z" fill={PRESENCA} />
      <path d="M60 96 80 28l20 68z" fill={SALVIA} opacity="0.85" />
      <path d="M94 96 108 50l14 46z" fill={PRESENCA} />
      <rect x="20" y="94" width="120" height="6" rx="3" fill={COBRE_ESCURO} />
      <g fill={AREIA}>
        <circle cx="46" cy="76" r="2" />
        <circle cx="54" cy="76" r="2" />
        <circle cx="104" cy="80" r="2" />
        <circle cx="112" cy="80" r="2" />
      </g>
    </>
  ),
  mascaras: (
    <>
      <path
        d="M24 52c10-8 28-8 36 2 8-10 26-10 36-2-2 16-14 24-24 20-6-2-8-8-12-8s-6 6-12 8c-10 4-22-4-24-20z"
        fill={AREIA}
      />
      <ellipse cx="44" cy="58" rx="7" ry="4.5" fill={TINTA} />
      <ellipse cx="76" cy="58" rx="7" ry="4.5" fill={TINTA} />
      <path
        d="M24 52c-6-2-10 4-12 10M96 52c6-2 10 4 12 10"
        stroke={COBRE}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M78 66c10-8 26-8 34 2 8-10 24-10 34-2-2 16-14 24-22 20-6-2-8-8-12-8s-6 6-12 8c-8 4-20-4-22-20z"
        fill={SALVIA}
        transform="translate(-8 10)"
      />
      <ellipse cx="96" cy="81" rx="6" ry="4" fill={TINTA} />
      <ellipse cx="126" cy="81" rx="6" ry="4" fill={TINTA} />
    </>
  ),
  couro: (
    <>
      <path d="M40 30h22v40c0 8 8 10 18 12 8 2 10 8 10 14H40z" fill={COBRE_ESCURO} />
      <path d="M44 34h14M44 42h14M44 50h14" stroke={AREIA} strokeWidth="1.5" opacity="0.7" />
      <rect x="40" y="94" width="50" height="4" rx="2" fill={TINTA} />
      <path
        d="M104 96V64c0-4-6-14-4-20 1-3 5-2 6 1l4 12V34c0-4 6-4 6 0v18-24c0-4 6-4 6 0v24-20c0-4 6-4 6 0v22-14c0-4 6-4 6 0v34c0 12-6 22-6 22z"
        fill={COBRE}
      />
      <path d="M104 88h30" stroke={AREIA} strokeWidth="2" opacity="0.7" />
    </>
  ),
  coracoes: (
    <>
      <ellipse
        cx="80"
        cy="62"
        rx="60"
        ry="22"
        transform="rotate(-27 80 62)"
        fill="none"
        stroke={COBRE}
        strokeWidth="2"
        opacity="0.7"
      />
      <path d="M58 52c-6-8-20-4-20 6 0 10 20 22 20 22s20-12 20-22c0-10-14-14-20-6z" fill={AREIA} />
      <path d="M102 52c-6-8-20-4-20 6 0 10 20 22 20 22s20-12 20-22c0-10-14-14-20-6z" fill={SALVIA} />
      <path d="M80 30c-5-7-17-4-17 5 0 9 17 19 17 19s17-10 17-19c0-9-12-12-17-5z" fill={COBRE} />
    </>
  ),
  mapa: (
    <>
      <path d="M26 34l34-8 40 8 34-8v64l-34 8-40-8-34 8z" fill={MARFIM} />
      <path d="M60 26v64M100 34v64" stroke={AREIA} strokeWidth="2" />
      <path d="M60 26l40 8v64l-40-8z" fill={AREIA} opacity="0.55" />
      <path
        d="M36 80c12-4 14-22 30-22s20 18 34 12 16-22 26-26"
        stroke={COBRE_ESCURO}
        strokeWidth="2.5"
        strokeDasharray="4 5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M124 26c-7 0-11 5-11 10 0 8 11 16 11 16s11-8 11-16c0-5-4-10-11-10z" fill={COBRE} />
      <circle cx="124" cy="36" r="4" fill={MARFIM} />
    </>
  ),
};

export function Ilustracao({ id, className = "", title }: { id: IlustracaoId; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <rect width="160" height="120" rx="14" fill="#27323d" />
      <ellipse
        cx="80"
        cy="60"
        rx="74"
        ry="26"
        transform="rotate(-27 80 60)"
        fill="none"
        stroke={AREIA}
        strokeOpacity="0.08"
        strokeWidth="10"
      />
      {CENAS[id]}
    </svg>
  );
}
