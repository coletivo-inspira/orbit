"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { OrbitRadial, useOrbitRecenter } from "@/components/orbita/OrbitRadial";
import { AppTile } from "@/components/ui/AppBadge";
import { RingedAvatar } from "@/components/ui/Avatar";
import { rovingIndex } from "@/lib/a11y/roving";
import { activeAppIds, EXTERNAL_APPS, INTENTION_LIST, INTENTIONS } from "@/lib/data/intentions";
import { SIMULATED_PROFILES } from "@/lib/data/profiles";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { OrbitaFilter, OrbitState } from "@/lib/state/reducer";
import type { Profile } from "@/lib/types";

const FILTERS: { id: OrbitaFilter; label: string; color: string }[] = [
  { id: "all", label: "Todos", color: "#f5f0e7" },
  ...INTENTION_LIST.map((i) => ({ id: i.id, label: i.short, color: i.color })),
];

const VIEW_MODES: { id: OrbitState["orbitaViewMode"]; label: string }[] = [
  { id: "radial", label: "Radar" },
  { id: "lista", label: "Lista" },
];

export function filterProfiles(filter: OrbitaFilter): Profile[] {
  return filter === "all" ? SIMULATED_PROFILES : SIMULATED_PROFILES.filter((p) => p.intentions.includes(filter));
}

export function OrbitaScreen() {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const isMobile = device === "mobile";
  const profiles = filterProfiles(state.orbitaFilter);
  const ids = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabId = (mode: string) => `${ids}-tab-${mode}`;
  const panelId = `${ids}-panel`;
  const activeIndex = VIEW_MODES.findIndex((m) => m.id === state.orbitaViewMode);
  const setMode = (mode: OrbitState["orbitaViewMode"]) => dispatch({ type: "setOrbitaViewMode", mode });

  const onTabKeyDown = (e: KeyboardEvent) => {
    const next = rovingIndex(e.key, activeIndex, VIEW_MODES.length);
    if (next === null) return;
    e.preventDefault();
    setMode(VIEW_MODES[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className={`lg-header z-20 shrink-0 ${isMobile ? "px-4 pt-2 pb-3" : "px-5 pt-4 pb-3.5"}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1
              tabIndex={-1}
              data-focus-fallback
              className={`${isMobile ? "text-lg" : "text-xl"} flex items-center gap-2 font-bold tracking-tight text-white`}
            >
              Sua Órbita
              <span className="rounded-full border border-white/20 bg-white/[0.12] px-2.5 py-0.5 font-sans text-[11px] font-semibold text-white">
                {profiles.length} perto
              </span>
            </h1>
          </div>
          <div
            className="flex shrink-0 items-center rounded-full border border-white/25 bg-tinta p-1"
            role="tablist"
            aria-label="Modo de visualização"
          >
            {VIEW_MODES.map((mode, i) => {
              const selected = state.orbitaViewMode === mode.id;
              return (
                <button
                  key={mode.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  id={tabId(mode.id)}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={panelId}
                  tabIndex={selected ? 0 : -1}
                  onKeyDown={onTabKeyDown}
                  onClick={() => setMode(mode.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    selected ? "lg-active-lens" : "border border-transparent text-slate-300 hover:text-white"
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-slate-300">
          {state.orbitaViewMode === "radial"
            ? "Arraste o radar ou use Tab. A posição no radar não indica distância; as distâncias são aproximadas e simuladas."
            : "Todas as pessoas por perto, com nome, intenção e distância aproximada (simulada)."}
        </p>

        <div role="group" aria-label="Filtrar por intenção" className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
                    ? "lg-active-lens"
                    : "border border-white/[0.14] bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] hover:text-white"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: f.color }} aria-hidden="true" />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(state.orbitaViewMode)}
        className="relative flex min-h-0 flex-1 flex-col"
      >
        {state.orbitaViewMode === "radial" ? (
          <OrbitRadial
            profiles={profiles}
            centerOffsetY={isMobile ? 18 : 0}
            onCenterClick={() => dispatch({ type: "setTab", tab: "perfil" })}
            className="flex-1"
            style={{
              background: "radial-gradient(circle at center, #344252 0%, rgb(28 38 49 / 0) 70%)",
            }}
            overlay={<RadialOverlay compact={isMobile} count={profiles.length} onShowList={() => setMode("lista")} />}
          />
        ) : (
          <div className={`orbit-scroll @container flex-1 overflow-y-auto ${isMobile ? "p-3.5 pb-24" : "p-5"}`}>
            <ul
              className={`grid gap-3 ${isMobile ? "grid-cols-1 @min-[360px]:grid-cols-2" : "grid-cols-2 gap-3.5 @min-[720px]:grid-cols-3 @min-[960px]:grid-cols-4"}`}
              aria-label="Pessoas por perto"
            >
              {profiles.map((p) => (
                <li key={p.id} className="flex">
                  <NearbyCard
                    profile={p}
                    compact={isMobile}
                    onOpen={() => dispatch({ type: "openProfile", id: p.id })}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function RadialOverlay({ compact, count, onShowList }: { compact: boolean; count: number; onShowList: () => void }) {
  const recenter = useOrbitRecenter();
  return (
    <div
      className={`lg-bar absolute z-20 flex items-center gap-1 rounded-full p-1 ${compact ? "right-3.5 bottom-[88px] left-3.5 justify-between" : "right-4 bottom-4"}`}
    >
      <button
        type="button"
        onClick={onShowList}
        className="rounded-full px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10"
      >
        Ver {count} em lista
      </button>
      <button
        type="button"
        onClick={recenter}
        className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 active:scale-95"
      >
        <svg
          className="h-3.5 w-3.5 text-areia"
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
    </div>
  );
}

function NearbyCard({ profile: p, compact, onOpen }: { profile: Profile; compact: boolean; onOpen: () => void }) {
  const intention = INTENTIONS[p.primaryIntention];
  const apps = activeAppIds(p.apps);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="lg-panel group flex w-full flex-col gap-2.5 rounded-[22px] p-3.5 text-left transition-colors hover:border-white/30"
    >
      <div className="flex items-center gap-2.5">
        <RingedAvatar cfg={p.avatar} color={intention.color} size={48} halo={false}>
          {p.online && (
            <span className="absolute right-0.5 bottom-0.5 h-3 w-3 rounded-full border-2 border-noite bg-emerald-400" />
          )}
        </RingedAvatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white">
            {p.name}, {p.age}
          </div>
          <div className="flex flex-wrap items-center gap-x-1 text-[11px] text-slate-300">
            <span>📍 {p.dist}</span>
            {p.online && <span>· online</span>}
            {p.inPark && <span className="font-semibold text-salvia">· no Parque</span>}
          </div>
        </div>
      </div>
      <div
        className="inline-flex items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
        style={{ background: intention.bg, color: intention.color, border: `1px solid ${intention.border}` }}
      >
        {intention.emoji} {intention.label}
      </div>
      {!compact && <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-300">{p.bio}</p>}
      <div className="mt-auto flex items-center gap-1.5 border-t border-white/[0.09] pt-2">
        {apps.slice(0, 4).map((id) => (
          <AppTile key={id} appId={id} />
        ))}
        {apps.length > 4 && <span className="text-[10px] text-slate-300">+{apps.length - 4}</span>}
        <span className="sr-only">Selos: {apps.map((id) => EXTERNAL_APPS[id].name).join(", ")}</span>
      </div>
    </button>
  );
}
