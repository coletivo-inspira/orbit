"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ActiveScreen, AmbientOrbs } from "@/components/app/ActiveScreen";
import { NAV_ITEMS } from "@/components/app/navigation";
import { DeviceModals } from "@/components/modals/DeviceModals";
import { RingedAvatar } from "@/components/ui/Avatar";
import { OrbitSignature } from "@/components/ui/OrbitLogo";
import { ToastViewport } from "@/components/ui/Toasts";
import { INTENTIONS } from "@/lib/data/intentions";
import { useOrbit } from "@/lib/state/OrbitProvider";

export function DesktopLayout({ topBar, showStudioLink = false }: { topBar?: ReactNode; showStudioLink?: boolean }) {
  const { state, dispatch } = useOrbit();
  const primary = INTENTIONS[state.user.primaryIntention];

  return (
    <div data-device-root className="relative flex h-full w-full flex-col overflow-hidden bg-tinta">
      <AmbientOrbs />
      {topBar}
      <div className="relative z-10 flex min-h-0 flex-1 gap-3 p-3">
        <aside className="lg-bar flex w-[228px] shrink-0 flex-col justify-between rounded-[24px] p-3.5">
          <div>
            <OrbitSignature
              className="mb-5 px-2"
              subtitle={<span className="mt-1 text-[11px] font-medium text-slate-300">Hub social · Modo Explorar</span>}
            />
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
                        : "border border-transparent text-slate-300 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={active ? "text-areia" : "text-slate-300"}>{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    {item.badge && (
                      <span className="presenca-chip rounded-full px-2 py-0.5 text-[10px] font-bold">
                        {item.badge}
                        <span className="sr-only"> online</span>
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
                <span aria-hidden="true">🖥️📱⌚</span> Estúdio multi-dispositivo
              </Link>
            )}
            <button
              type="button"
              onClick={() => dispatch({ type: "setTab", tab: "perfil" })}
              className="lg-pill flex cursor-pointer items-center gap-2.5 rounded-2xl p-2.5 text-left"
            >
              <RingedAvatar cfg={state.user.avatar} color={primary.color} size={36} ring={2} halo={false} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-white">{state.user.name}</div>
                <div className="flex items-center gap-1 text-[11px] text-slate-300">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${state.user.isPublic ? "bg-salvia" : "bg-amber-300"}`}
                    aria-hidden="true"
                  />
                  <span>{state.user.isPublic ? "Público (simulado)" : "Privado (simulado)"}</span>
                </div>
              </div>
            </button>
          </div>
        </aside>

        <main className="relative h-full min-w-0 flex-1 overflow-hidden rounded-[24px] border border-white/[0.12] bg-tinta">
          <ActiveScreen />
        </main>

        <DeviceModals />
        <ToastViewport className="absolute right-6 bottom-6 items-end" />
      </div>
    </div>
  );
}
