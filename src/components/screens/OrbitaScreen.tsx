"use client";

import { useId, useRef } from "react";
import { InterestGraph } from "@/components/orbita/InterestGraph";
import { OrbitRadial, useOrbitRecenter } from "@/components/orbita/OrbitRadial";
import { useOrbitaProfiles } from "@/components/orbita/useOrbitaProfiles";
import { useProgressiveCount } from "@/components/orbita/useProgressiveCount";
import { ProfileCard } from "@/components/perfil/ProfileCard";
import { buttonClass } from "@/components/ui/Button";
import { ChallengeCard } from "@/components/ui/ChallengeCard";
import { SegmentedTabs, segmentTabId } from "@/components/ui/SegmentedTabs";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { INTENTION_LIST } from "@/lib/data/intentions";
import { activeFilterCount } from "@/lib/orbitaFilters";
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
  { id: "conexoes", label: "Conexões" },
  { id: "lista", label: "Lista" },
];

export function OrbitaScreen() {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const isMobile = device === "mobile";
  const { profiles, affinity } = useOrbitaProfiles();
  const filterCount = activeFilterCount(state.orbitaFilters);
  const byAffinity = state.orbitaSort === "afinidade";
  const clearAll = () => {
    dispatch({ type: "clearOrbitaFilters" });
    dispatch({ type: "setOrbitaFilter", filter: "all" });
  };
  const ids = useId();
  const panelId = `${ids}-panel`;
  const setMode = (mode: OrbitState["orbitaViewMode"]) => dispatch({ type: "setOrbitaViewMode", mode });

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className={`lg-header z-20 shrink-0 ${isMobile ? "px-4 pt-2 pb-3" : "px-5 pt-4 pb-3.5"}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1
              tabIndex={-1}
              data-focus-fallback
              className={`${isMobile ? "text-lg" : "text-xl"} flex items-center gap-2 font-bold tracking-tight whitespace-nowrap text-white`}
            >
              Sua Órbita
              <span className="rounded-full border border-white/20 bg-white/[0.12] px-2.5 py-0.5 font-sans text-xs font-semibold whitespace-nowrap text-white">
                {profiles.length}
                <span className={isMobile ? "sr-only" : ""}> perto</span>
              </span>
            </h1>
          </div>
          <SegmentedTabs
            items={VIEW_MODES}
            value={state.orbitaViewMode}
            onChange={setMode}
            label="Modo de visualização"
            idBase={ids}
            panelId={panelId}
            compact={isMobile}
          />
        </div>
        <p className="mt-1 text-xs leading-snug text-marfim-suave">
          {state.orbitaViewMode === "conexoes"
            ? "Linhas ligam cada pessoa aos assuntos e estilos de música que ela curte. Toque numa pessoa para ver as conexões; toque de novo para abrir o perfil."
            : byAffinity
              ? "Quem tem mais assuntos em comum com você fica mais perto do centro. O número na bolha mostra quantos."
              : state.orbitaViewMode === "radial"
                ? "Arraste o radar ou use Tab. A posição no radar não indica distância; as distâncias são aproximadas e simuladas."
                : "Pessoas por perto, da mais próxima à mais distante (distâncias aproximadas e simuladas)."}
        </p>

        <div className="mt-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: "openOrbitaFilters" })}
            aria-haspopup="dialog"
            aria-label={filterCount ? `Filtros, ${filterCount} ativos` : "Filtros"}
            className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition ${
              filterCount ? "lg-active-lens" : "lg-pill text-white"
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
              <circle cx="16" cy="6" r="2" />
              <circle cx="10" cy="12" r="2" />
              <circle cx="18" cy="18" r="2" />
            </svg>
            Filtros
            {filterCount > 0 && (
              <span
                className="flex h-4 min-w-4 items-center justify-center rounded-full bg-areia px-1 text-xs font-extrabold text-tinta"
                aria-hidden="true"
              >
                {filterCount}
              </span>
            )}
          </button>
          <ToggleChip
            pressed={byAffinity}
            onToggle={() => dispatch({ type: "setOrbitaSort", sort: byAffinity ? "proximidade" : "afinidade" })}
          >
            <span aria-hidden="true">✦</span> Afinidade
          </ToggleChip>
          <span className="h-5 w-px shrink-0 bg-white/15" aria-hidden="true" />
          <div
            role="group"
            aria-label="Filtrar por intenção"
            className="orbit-scroll -my-1 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1 pr-6 [mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)]"
          >
            {FILTERS.map((f) => (
              <ToggleChip
                key={f.id}
                pressed={state.orbitaFilter === f.id}
                onToggle={() => dispatch({ type: "setOrbitaFilter", filter: f.id })}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: f.color }} aria-hidden="true" />
                {f.label}
              </ToggleChip>
            ))}
          </div>
        </div>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={segmentTabId(ids, state.orbitaViewMode)}
        className="relative flex min-h-0 flex-1 flex-col"
      >
        {profiles.length === 0 ? (
          <EmptyState compact={isMobile} onClear={clearAll} onAdjust={() => dispatch({ type: "openOrbitaFilters" })} />
        ) : state.orbitaViewMode === "radial" ? (
          <OrbitRadial
            profiles={profiles}
            affinity={byAffinity ? affinity : undefined}
            centerOffsetY={isMobile ? 18 : 0}
            onCenterClick={() => dispatch({ type: "setTab", tab: "perfil" })}
            className="flex-1"
            style={{
              background: "radial-gradient(circle at center, #344252 0%, rgb(28 38 49 / 0) 70%)",
            }}
            overlay={<RadialOverlay compact={isMobile} count={profiles.length} onShowList={() => setMode("lista")} />}
          />
        ) : state.orbitaViewMode === "conexoes" ? (
          <InterestGraph
            profiles={profiles}
            compact={isMobile}
            centerOffsetY={isMobile ? 30 : 0}
            className="flex-1"
            style={{ background: "radial-gradient(circle at center, #2a3644 0%, rgb(28 38 49 / 0) 75%)" }}
          />
        ) : (
          <NearbyList profiles={profiles} compact={isMobile} />
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
        className="min-h-10 rounded-full px-4 text-xs font-semibold text-white hover:bg-white/10"
      >
        Ver {count} em lista
      </button>
      <button
        type="button"
        onClick={recenter}
        className="flex min-h-10 items-center gap-1.5 rounded-full px-4 text-xs font-semibold text-white hover:bg-white/10 active:scale-95"
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

function EmptyState({ compact, onClear, onAdjust }: { compact: boolean; onClear: () => void; onAdjust: () => void }) {
  return (
    <div className={`flex flex-1 items-center justify-center ${compact ? "p-5 pb-28" : "p-8"}`}>
      <ChallengeCard
        role="status"
        icon="🔭"
        eyebrow="Nenhum resultado"
        title="Ninguém por perto com esses filtros"
        className="max-w-sm"
        actions={
          <>
            <button type="button" onClick={onClear} className={buttonClass({ variant: "primario", size: "compacto" })}>
              Limpar filtros
            </button>
            <button type="button" onClick={onAdjust} className={buttonClass({ size: "compacto" })}>
              Ajustar filtros
            </button>
          </>
        }
      >
        Tente afrouxar algum grupo: cada filtro ativo precisa combinar ao mesmo tempo, e quem deixou um campo em branco
        fica de fora quando você filtra por ele.
      </ChallengeCard>
    </div>
  );
}

/** Mounts cards in batches as the user scrolls; off-screen cards also skip rendering via content-visibility. */
function NearbyList({ profiles, compact }: { profiles: Profile[]; compact: boolean }) {
  const { state, dispatch } = useOrbit();
  const scrollRef = useRef<HTMLDivElement>(null);
  const resetKey = `${profiles.length}:${profiles[0]?.id}:${profiles.at(-1)?.id}`;
  const { shown, sentinelRef, more } = useProgressiveCount(profiles.length, scrollRef, resetKey);
  return (
    <div
      ref={scrollRef}
      className={`orbit-scroll @container flex-1 overflow-y-auto ${compact ? "p-3.5 pb-24" : "p-5"}`}
    >
      <ul
        className={`grid gap-3 ${compact ? "grid-cols-1 @min-[360px]:grid-cols-2" : "grid-cols-2 gap-3.5 @min-[720px]:grid-cols-3 @min-[960px]:grid-cols-4"}`}
        aria-label="Pessoas por perto"
      >
        {profiles.slice(0, shown).map((p) => (
          <li key={p.id} className="flex [contain-intrinsic-size:auto_250px] [content-visibility:auto]">
            <ProfileCard
              profile={p}
              userTopics={state.user.topics}
              compact={compact}
              onOpen={() => dispatch({ type: "openProfile", id: p.id })}
            />
          </li>
        ))}
        {shown < profiles.length && (
          <li ref={sentinelRef} className="col-span-full flex justify-center py-2">
            <button type="button" onClick={more} className={buttonClass({ size: "compacto" })}>
              Mostrar mais ({shown} de {profiles.length})
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
