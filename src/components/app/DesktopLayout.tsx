"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ActiveScreen, AmbientOrbs } from "@/components/app/ActiveScreen";
import { NAV_ITEMS } from "@/components/app/navigation";
import { DeviceModals } from "@/components/modals/DeviceModals";
import { RingedAvatar } from "@/components/ui/Avatar";
import { OrbitMark } from "@/components/ui/OrbitLogo";
import { ToastViewport } from "@/components/ui/Toasts";
import { INTENTIONS } from "@/lib/data/intentions";
import { useOrbit } from "@/lib/state/OrbitProvider";

export function DesktopLayout({ topBar, showStudioLink = false }: { topBar?: ReactNode; showStudioLink?: boolean }) {
  const { state, dispatch } = useOrbit();
  const primary = INTENTIONS[state.user.primaryIntention];

  return (
    <div className="app-ambient-bg relative flex h-full w-full flex-col overflow-hidden">
      <AmbientOrbs />
      {topBar}
      <div className="relative z-10 flex min-h-0 flex-1 gap-3 p-3">
        <aside className="lg-bar flex w-[228px] shrink-0 flex-col justify-between rounded-[24px] p-3.5">
          <div>
            <div className="mb-5 flex items-center gap-2.5 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/30 bg-gradient-to-br from-violet-400/60 via-indigo-400/50 to-cyan-300/50 shadow-[0_8px_20px_rgba(99,102,241,0.3),inset_0_1px_0_rgba(255,255,255,0.5)]">
                <OrbitMark />
              </div>
              <div>
                <div className="text-base leading-none font-extrabold tracking-tight text-white">Orbit</div>
                <div className="mt-0.5 text-[10px] font-medium text-slate-300/90">Liquid Glass Hub</div>
              </div>
            </div>
            <nav className="flex flex-col gap-1.5" aria-label="Navegação principal">
              {NAV_ITEMS.map((item) => {
                const active = state.activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => dispatch({ type: "setTab", tab: item.id })}
                    className={`lg-sheen relative flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      active
                        ? "lg-active-lens text-white"
                        : "border border-transparent text-slate-300/85 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={active ? "text-white" : "text-slate-300/80"}>{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    {item.badge && (
                      <span className="rounded-full border border-emerald-300/35 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-col gap-2">
            {showStudioLink && (
              <Link
                href="/studio"
                className="lg-pill rounded-2xl px-3 py-2 text-center text-[11px] font-semibold text-slate-200 hover:text-white"
              >
                🖥️📱⌚ Estúdio multi-dispositivo
              </Link>
            )}
            <button
              type="button"
              onClick={() => dispatch({ type: "setTab", tab: "perfil" })}
              className="lg-pill lg-sheen flex cursor-pointer items-center gap-2.5 rounded-2xl p-2.5 text-left"
            >
              <RingedAvatar cfg={state.user.avatar} color={primary.color} size={36} ring={2} halo={false} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-white">{state.user.name}</div>
                <div className="flex items-center gap-1 text-[10px] text-slate-300/85">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${state.user.isPublic ? "bg-emerald-300" : "bg-amber-300"}`}
                  />
                  <span>{state.user.isPublic ? "Perfil Público" : "Privado"}</span>
                </div>
              </div>
            </button>
          </div>
        </aside>

        <main className="relative h-full min-w-0 flex-1 overflow-hidden rounded-[24px] border border-white/[0.12] bg-slate-950/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl">
          <ActiveScreen />
        </main>

        <DeviceModals />
        <ToastViewport className="absolute right-6 bottom-6 items-end" />
      </div>
    </div>
  );
}
