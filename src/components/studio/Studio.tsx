"use client";

import Link from "next/link";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DesktopLayout } from "@/components/app/DesktopLayout";
import { MobileLayout } from "@/components/app/MobileLayout";
import { WatchLayout } from "@/components/app/WatchLayout";
import {
  BrowserBar,
  DEVICE_SPECS,
  LaptopFrame,
  PhoneFrame,
  PhoneStatusBar,
  WatchFrame,
} from "@/components/studio/DeviceFrames";
import { OrbitLogo } from "@/components/ui/OrbitLogo";
import { ToastProvider } from "@/components/ui/Toasts";
import { PARK_BOTS } from "@/lib/data/park";
import { ORBIT_PROFILES } from "@/lib/data/profiles";
import { DeviceProvider } from "@/lib/state/device";
import { OrbitProvider, useOrbit } from "@/lib/state/OrbitProvider";
import type { DeviceKind, TabId } from "@/lib/types";

const HINTS: Record<DeviceKind, string> = {
  desktop: "Dica: arraste a Órbita, use WASD/clique no Parque 2D e edite seus selos no Meu Hub.",
  mobile: "Dica: navegue pela cápsula flutuante abaixo e use o direcional ou toque no chão do Parque 2D.",
  watch: "Dica: arraste a colmeia radial no relógio, toque em uma bolha para acenar ou use os pontos abaixo.",
};

const DOCK: { id: DeviceKind; label: string; title: string; icon: React.ReactNode }[] = [
  {
    id: "desktop",
    label: "Desktop",
    title: "Modo Computador (Notebook)",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M2 20h20" />
      </>
    ),
  },
  {
    id: "mobile",
    label: "Celular",
    title: "Modo Celular (Smartphone 9:16)",
    icon: (
      <>
        <rect x="6" y="2" width="12" height="20" rx="3" />
        <path d="M11 18h2" />
      </>
    ),
  },
  {
    id: "watch",
    label: "Relógio",
    title: "Modo Relógio (Apple Watch)",
    icon: (
      <>
        <rect x="6.5" y="6" width="11" height="12" rx="3.5" />
        <path d="M9 6V3h6v3" />
        <path d="M9 18v3h6v-3" />
        <circle cx="12" cy="12" r="1.5" />
      </>
    ),
  },
];

const QUICK_NAV: { tab: TabId; label: string }[] = [
  { tab: "orbita", label: "Órbita" },
  { tab: "parque", label: "Parque 2D" },
  { tab: "interesse", label: "Interesse" },
  { tab: "comunidade", label: "Comunidade" },
  { tab: "perfil", label: "Meu Hub" },
  { tab: "desejos", label: "Desejos" },
];

/** Presentation studio: the same app session rendered inside laptop, phone and watch frames. */
export function Studio() {
  return (
    <OrbitProvider>
      <ToastProvider>
        <StudioContent />
      </ToastProvider>
    </OrbitProvider>
  );
}

function StudioContent() {
  const { dispatch } = useOrbit();
  const [device, setDevice] = useState<DeviceKind>("mobile");
  const stageRef = useRef<HTMLElement>(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      const spec = DEVICE_SPECS[device];
      const availW = Math.max(240, stage.clientWidth - 20);
      const availH = Math.max(240, stage.clientHeight - 16);
      const next = Math.min(availW / spec.frameW, availH / spec.frameH, 1.05);
      scaleRef.current = next;
      setScale(next);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [device]);

  const switchDevice = useCallback(
    (next: DeviceKind) => {
      dispatch({ type: "closeModals" });
      setDevice(next);
    },
    [dispatch],
  );

  const getScale = useCallback(() => scaleRef.current, []);
  const deviceValue = useMemo(
    () => ({ device, getScale, requestDevice: switchDevice }),
    [device, getScale, switchDevice],
  );

  const navigateQuick = (tab: TabId) => {
    dispatch({ type: "setTab", tab });
    if (device !== "watch") return;
    if (tab === "orbita") dispatch({ type: "setWatchPage", page: 0 });
    else if (tab === "parque") dispatch({ type: "setWatchPage", page: 1 });
    else if (tab === "perfil") dispatch({ type: "setWatchPage", page: 2 });
    else switchDevice("mobile");
  };

  return (
    <div className="studio-bg flex h-dvh w-screen overflow-hidden select-none">
      <aside className="lg-bar z-30 flex h-full w-16 shrink-0 flex-col items-center justify-between rounded-none border-y-0 border-l-0 py-4 sm:w-[78px]">
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: "resetHome" })}
            aria-label="Orbit — voltar ao início"
            title="Orbit — Início"
            className="lg-pill flex h-12 w-12 items-center justify-center rounded-2xl transition-transform active:scale-95"
          >
            <OrbitLogo className="h-8 w-8 text-areia" />
          </button>
          <span className="font-display text-[11px] font-bold tracking-wide text-marfim">Orbit</span>
        </div>

        <fieldset className="flex flex-col items-center gap-3">
          <legend className="sr-only">Dispositivo</legend>
          {DOCK.map((d) => {
            const active = d.id === device;
            return (
              <label key={d.id} title={d.title} className="flex cursor-pointer flex-col items-center gap-1">
                <input
                  type="radio"
                  name="studio-device"
                  value={d.id}
                  checked={active}
                  onChange={() => switchDevice(d.id)}
                  className="peer sr-only"
                />
                <span
                  className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-marfim ${
                    active
                      ? "lg-active-lens text-white"
                      : "border border-white/[0.14] bg-white/[0.04] text-slate-300 hover:bg-white/[0.10] hover:text-white"
                  }`}
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {d.icon}
                  </svg>
                </span>
                <span className="text-[9px] font-semibold tracking-wider text-slate-300 uppercase">{d.label}</span>
              </label>
            );
          })}
        </fieldset>

        <div className="flex flex-col items-center gap-1">
          <span className="presenca-chip rounded-full px-2 py-0.5 text-[9px] font-bold">MVP</span>
          <span className="text-[9px] text-slate-300">v0.1</span>
        </div>
      </aside>

      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex shrink-0 items-center justify-between px-4 pt-3 pb-1 sm:px-6">
          <div className="lg-bar flex items-center gap-2.5 rounded-full px-3.5 py-1.5">
            <span className="h-2 w-2 rounded-full bg-areia" aria-hidden="true" />
            <span className="text-xs font-semibold text-white">{DEVICE_SPECS[device].label}</span>
            <span className="hidden text-white/30 md:inline" aria-hidden="true">
              |
            </span>
            <span className="hidden text-xs text-slate-300 md:inline">
              Moldura em {Math.round(scale * 100)}% · alvos e gestos diferem do aparelho real
            </span>
          </div>
          <div className="flex items-center gap-2">
            <nav
              aria-label="Ir direto para"
              className="lg-bar hidden items-center gap-1 rounded-full px-2 py-1 sm:flex"
            >
              <span className="pr-1 pl-2 text-[11px] text-slate-300" aria-hidden="true">
                Ir direto:
              </span>
              {QUICK_NAV.map((q) => (
                <button
                  key={q.tab}
                  type="button"
                  onClick={() => navigateQuick(q.tab)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-100 transition hover:bg-white/15"
                >
                  {q.label}
                </button>
              ))}
            </nav>
            <Link href="/" className="lg-bar rounded-full px-3 py-1.5 text-[11px] font-semibold text-white">
              Abrir app →
            </Link>
          </div>
        </header>

        <section ref={stageRef} className="relative flex flex-1 items-center justify-center overflow-hidden p-3 sm:p-5">
          <div className="device-scaler" style={{ transform: `scale(${scale.toFixed(4)})` }}>
            <DeviceProvider value={deviceValue}>
              {device === "desktop" && (
                <LaptopFrame>
                  <DesktopLayout
                    topBar={<BrowserBar peopleCount={ORBIT_PROFILES.length} parkCount={PARK_BOTS.length} />}
                  />
                </LaptopFrame>
              )}
              {device === "mobile" && (
                <PhoneFrame>
                  <MobileLayout statusBar={<PhoneStatusBar />} homeIndicator />
                </PhoneFrame>
              )}
              {device === "watch" && (
                <WatchFrame>
                  <WatchLayout />
                </WatchFrame>
              )}
            </DeviceProvider>
          </div>
        </section>

        <footer className="z-20 flex shrink-0 items-center justify-center px-4 pt-0.5 pb-2.5">
          <p className="lg-bar rounded-full px-4 py-1.5 text-center text-[11px] text-white">{HINTS[device]}</p>
        </footer>
      </div>
    </div>
  );
}
