"use client";

import { OrbitRadial, useOrbitRecenter } from "@/components/orbita/OrbitRadial";
import { AppTile } from "@/components/ui/AppBadge";
import { RingedAvatar } from "@/components/ui/Avatar";
import { activeAppIds, INTENTION_LIST, INTENTIONS } from "@/lib/data/intentions";
import { SIMULATED_PROFILES } from "@/lib/data/profiles";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { OrbitaFilter } from "@/lib/state/reducer";
import type { Profile } from "@/lib/types";

const FILTERS: { id: OrbitaFilter; label: string; color: string }[] = [
  { id: "all", label: "Todos", color: "#e2e8f0" },
  ...INTENTION_LIST.map((i) => ({ id: i.id, label: i.short, color: i.color })),
];

export function filterProfiles(filter: OrbitaFilter): Profile[] {
  return filter === "all" ? SIMULATED_PROFILES : SIMULATED_PROFILES.filter((p) => p.intentions.includes(filter));
}

export function OrbitaScreen() {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const isMobile = device === "mobile";
  const profiles = filterProfiles(state.orbitaFilter);

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className={`lg-header z-20 shrink-0 ${isMobile ? "px-4 pt-2 pb-3" : "px-5 pt-4 pb-3.5"}`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1
              className={`${isMobile ? "text-base" : "text-lg"} flex items-center gap-2 font-extrabold tracking-tight text-white`}
            >
              Sua Órbita
              <span className="rounded-full border border-white/20 bg-white/[0.12] px-2.5 py-0.5 text-[11px] font-semibold text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                {profiles.length} perto
              </span>
            </h1>
            {!isMobile && (
              <p className="mt-0.5 text-xs text-slate-300/80">
                Arraste o radar para explorar conexões ao seu redor · Anel luminoso indica a intenção principal
              </p>
            )}
          </div>
          <div
            className="lg-pill flex shrink-0 items-center rounded-full p-1"
            role="tablist"
            aria-label="Modo de visualização"
          >
            {(["radial", "lista"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={state.orbitaViewMode === mode}
                onClick={() => dispatch({ type: "setOrbitaViewMode", mode })}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                  state.orbitaViewMode === mode ? "lg-active-lens text-white" : "text-slate-300 hover:text-white"
                }`}
              >
                {mode === "radial" ? "Órbita" : "Lista"}
              </button>
            ))}
          </div>
        </div>

        <div className="orbit-scroll mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => {
            const active = state.orbitaFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => dispatch({ type: "setOrbitaFilter", filter: f.id })}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  active
                    ? "lg-active-lens text-white"
                    : "border border-white/[0.11] bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] hover:text-white"
                }`}
              >
                <span className="h-2 w-2 rounded-full shadow-sm" style={{ background: f.color }} />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {state.orbitaViewMode === "radial" ? (
        <OrbitRadial
          profiles={profiles}
          centerOffsetY={isMobile ? 18 : 0}
          onCenterClick={() => dispatch({ type: "setTab", tab: "perfil" })}
          className="flex-1"
          style={{
            background:
              "radial-gradient(circle at center, rgba(167,139,250,0.14) 0%, rgba(15,23,42,0.22) 55%, rgba(7,10,18,0.45) 100%)",
          }}
          overlay={<RadialOverlay compact={isMobile} />}
        />
      ) : (
        <div className={`orbit-scroll flex-1 overflow-y-auto ${isMobile ? "p-3.5 pb-24" : "p-5"}`}>
          <div className={`grid ${isMobile ? "grid-cols-2 gap-3" : "grid-cols-3 gap-3.5 lg:grid-cols-4"}`}>
            {profiles.map((p) => (
              <NearbyCard
                key={p.id}
                profile={p}
                compact={isMobile}
                onOpen={() => dispatch({ type: "openProfile", id: p.id })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RadialOverlay({ compact }: { compact: boolean }) {
  const recenter = useOrbitRecenter();
  return (
    <>
      <button
        type="button"
        onClick={recenter}
        className={`lg-pill lg-sheen absolute ${compact ? "right-3.5 bottom-[88px]" : "right-4 bottom-4"} z-20 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-white active:scale-95`}
      >
        <svg
          className="h-3.5 w-3.5 text-violet-200"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
        </svg>
        Centralizar
      </button>
      {!compact && (
        <div className="lg-pill pointer-events-none absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] text-slate-200">
          <span className="text-violet-200">✦</span> Arraste para navegar · Toque em uma bolha para ver selos e perfil
        </div>
      )}
    </>
  );
}

function NearbyCard({ profile: p, compact, onOpen }: { profile: Profile; compact: boolean; onOpen: () => void }) {
  const intention = INTENTIONS[p.primaryIntention];
  const apps = activeAppIds(p.apps);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="lg-panel lg-sheen group flex flex-col gap-2.5 rounded-[22px] p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-white/30"
    >
      <div className="flex items-center gap-2.5">
        <RingedAvatar cfg={p.avatar} color={intention.color} size={48} halo={false}>
          {p.online && (
            <span className="absolute right-0.5 bottom-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-400" />
          )}
        </RingedAvatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white">
            {p.name}, {p.age}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-300/80">
            <span>📍 {p.dist}</span>
            {p.inPark && <span className="font-semibold text-emerald-300">· Parque</span>}
          </div>
        </div>
      </div>
      <div
        className="inline-flex items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-md"
        style={{ background: intention.bg, color: intention.color, border: `1px solid ${intention.border}` }}
      >
        {intention.emoji} {intention.short}
      </div>
      {!compact && <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-300/85">{p.bio}</p>}
      <div className="mt-auto flex items-center gap-1.5 border-t border-white/[0.09] pt-2">
        {apps.slice(0, 4).map((id) => (
          <AppTile key={id} appId={id} />
        ))}
        {apps.length > 4 && <span className="text-[10px] text-slate-300">+{apps.length - 4}</span>}
      </div>
    </button>
  );
}
