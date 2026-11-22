import type { ReactNode } from "react";

export const DEVICE_SPECS = {
  desktop: { frameW: 1290, frameH: 790, label: "Computador · 1160×720" },
  mobile: { frameW: 430, frameH: 840, label: "Celular · 390×800 (9:16)" },
  watch: { frameW: 325, frameH: 520, label: "Apple Watch · 45mm" },
} as const;

export function LaptopFrame({ children }: { children: ReactNode }) {
  return (
    <div className="laptop-shell">
      <div className="laptop-lid">
        <div className="laptop-camera" />
        <div className="laptop-screen">{children}</div>
      </div>
      <div className="laptop-base">
        <div className="laptop-notch" />
      </div>
    </div>
  );
}

export function BrowserBar({ peopleCount, parkCount }: { peopleCount: number; parkCount: number }) {
  return (
    <div className="relative z-20 flex h-10 shrink-0 items-center justify-between border-b border-white/[0.11] bg-white/[0.04] px-4 backdrop-blur-2xl">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/85 shadow-inner" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300/85 shadow-inner" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/85 shadow-inner" />
        <div className="ml-3 flex items-center gap-1.5 rounded-full border border-white/[0.13] bg-white/[0.07] px-3.5 py-1 text-[11px] text-slate-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
          Orbit · Modo Explorar (demonstração)
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1 text-[11px] text-slate-200/80">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        <span>
          {peopleCount} pessoas na sua órbita · {parkCount} no Parque
        </span>
      </div>
    </div>
  );
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="phone-shell">
      <div className="phone-btn-left-1" />
      <div className="phone-btn-left-2" />
      <div className="phone-btn-right" />
      <div className="phone-screen">{children}</div>
    </div>
  );
}

export function PhoneStatusBar() {
  return (
    <div
      aria-hidden="true"
      className="relative z-20 flex h-11 shrink-0 items-center justify-between bg-transparent px-6 pt-2"
    >
      <span className="text-xs font-bold tracking-tight text-white/95">16:36</span>
      <div className="flex h-[26px] w-[104px] items-center justify-end rounded-full border border-white/15 bg-black/95 pr-2.5 shadow-lg">
        <span className="h-2.5 w-2.5 rounded-full border border-white/20 bg-tinta" />
      </div>
      <div className="flex items-center gap-1.5 text-white/95">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M2 18h3v-4H2v4zm5 0h3v-7H7v7zm5 0h3V7h-3v11zm5 0h3V3h-3v15z" />
        </svg>
        <div className="flex h-2.5 w-5 items-center rounded-[3px] border border-white/75 p-[1.5px]">
          <div className="h-full w-full rounded-[1px] bg-emerald-300" />
        </div>
      </div>
    </div>
  );
}

export function WatchFrame({ children }: { children: ReactNode }) {
  return (
    <div className="watch-assembly">
      <div className="watch-band-top" />
      <div className="watch-case">
        <div className="watch-crown" title="Digital Crown" />
        <div className="watch-side-btn" title="Botão Lateral" />
        <div className="watch-screen">{children}</div>
      </div>
      <div className="watch-band-bottom" />
    </div>
  );
}
