"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { TapIcon } from "@/components/interesse/TapIcon";
import { ProfileImage } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toasts";
import { rovingIndex } from "@/lib/a11y/roving";
import { formatAgo, PROFILE_VIEWS, RECEIVED_TAPS, type InteresseTab, type InterestEvent } from "@/lib/interesse";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";

const TABS: { id: InteresseTab; label: string; events: InterestEvent[] }[] = [
  { id: "visualizacoes", label: "Visualizações", events: PROFILE_VIEWS },
  { id: "toques", label: "Toques", events: RECEIVED_TAPS },
];

/** Who viewed the user's profile and who tapped them. Simulated data, no paywall. */
export function InteresseScreen() {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const showToast = useToast();
  const isMobile = device === "mobile";
  const ids = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabId = (tab: InteresseTab) => `${ids}-tab-${tab}`;
  const panelId = `${ids}-panel`;
  const activeIndex = TABS.findIndex((t) => t.id === state.interesseTab);
  const active = TABS[activeIndex];
  const setTab = (tab: InteresseTab) => dispatch({ type: "setInteresseTab", tab });

  const onTabKeyDown = (e: KeyboardEvent) => {
    const next = rovingIndex(e.key, activeIndex, TABS.length);
    if (next === null) return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  const tapBack = (event: InterestEvent) => {
    dispatch({ type: "tapProfile", id: event.profile.id });
    showToast(`Você tocou de volta em ${event.profile.name}. (simulação)`, "success");
  };

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className={`lg-header z-20 shrink-0 ${isMobile ? "px-4 pt-2" : "px-5 pt-4"}`}>
        <h1
          tabIndex={-1}
          data-focus-fallback
          className={`${isMobile ? "text-lg" : "text-xl"} font-bold tracking-tight text-white`}
        >
          Interesse
        </h1>
        <div role="tablist" aria-label="Tipo de interesse" className="mt-2 flex justify-center gap-8">
          {TABS.map((tab, i) => {
            const selected = tab.id === state.interesseTab;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                id={tabId(tab.id)}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                onKeyDown={onTabKeyDown}
                onClick={() => setTab(tab.id)}
                className={`border-b-2 px-1 pb-2 text-base font-bold transition ${
                  selected ? "border-areia text-white" : "border-transparent text-slate-300 hover:text-white"
                }`}
              >
                {tab.label} {tab.events.length}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(active.id)}
        className={`orbit-scroll @container min-h-0 flex-1 overflow-y-auto ${isMobile ? "p-2.5 pb-24" : "p-5"}`}
      >
        <p className="mb-2.5 px-1 text-[11px] leading-snug text-slate-300">
          {active.id === "visualizacoes"
            ? "Quem abriu seu perfil recentemente."
            : "Quem te deu um toque. Toque de volta para mostrar interesse."}{" "}
          Dados simulados; distâncias aproximadas.
        </p>
        <ul
          className={`grid gap-2 ${isMobile ? "grid-cols-2" : "grid-cols-2 @min-[560px]:grid-cols-3 @min-[820px]:grid-cols-4 @min-[1100px]:grid-cols-5"}`}
          aria-label={active.label}
        >
          {active.events.map((event) => (
            <InterestCard
              key={event.profile.id}
              event={event}
              tapped={state.sentTaps.includes(event.profile.id)}
              showTap={active.id === "toques"}
              onOpen={() => dispatch({ type: "openProfile", id: event.profile.id })}
              onTapBack={() => tapBack(event)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function InterestCard({
  event,
  tapped,
  showTap,
  onOpen,
  onTapBack,
}: {
  event: InterestEvent;
  tapped: boolean;
  showTap: boolean;
  onOpen: () => void;
  onTapBack: () => void;
}) {
  const p = event.profile;
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onOpen}
        className="group relative block aspect-square w-full overflow-hidden rounded-[18px] border border-white/[0.12] bg-noite text-left"
      >
        <ProfileImage cfg={p.avatar} photo={p.photo} />
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-tinta/95 via-tinta/40 to-transparent"
          aria-hidden="true"
        />
        <span className="absolute right-2.5 bottom-2 left-2.5 flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 truncate text-[13px] font-bold text-white">
            {p.online && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />}
            <span className="truncate">
              {p.name}, {p.age}
            </span>
            {p.online && <span className="sr-only">, online</span>}
          </span>
          <span className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-200">
            <span>{formatAgo(event.minutesAgo)}</span>
            <span>{p.dist}</span>
          </span>
        </span>
      </button>
      {showTap && (
        <button
          type="button"
          onClick={() => !tapped && onTapBack()}
          aria-disabled={tapped}
          aria-label={tapped ? `Você já tocou de volta em ${p.name}` : `Tocar de volta em ${p.name}`}
          title={tapped ? "Tocado de volta" : "Tocar de volta"}
          className={`lg-pill absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full aria-disabled:cursor-default ${
            tapped ? "text-areia" : "text-white hover:text-areia"
          }`}
        >
          <TapIcon className="h-5 w-5" filled={tapped} />
        </button>
      )}
    </li>
  );
}
