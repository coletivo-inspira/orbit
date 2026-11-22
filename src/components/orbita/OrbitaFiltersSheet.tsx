"use client";

import { useId, useRef, type ReactNode } from "react";
import { useOrbitaProfiles } from "@/components/orbita/useOrbitaProfiles";
import { Switch } from "@/components/ui/Switch";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import {
  BODY_TYPES,
  CONDOM_USE,
  GENDERS,
  LOOKING_FOR,
  MEET_PLACES,
  ORIENTATIONS,
  POSITIONS,
  RELATIONSHIPS,
  SPORTS,
  TOPICS,
  TRIBES,
  type Option,
} from "@/lib/data/profileOptions";
import {
  activeFilterCount,
  RANGE_LIMITS,
  toggleInList,
  type ListFilterKey,
  type BodyTypeFilter,
  type NumberRange,
  type OrbitaFilters,
  type OrbitaSort,
  type PhotoFilterId,
  type RangeFilterKey,
} from "@/lib/orbitaFilters";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { GenderId } from "@/lib/types";

const TRANS_GENDERS: GenderId[] = ["homem-trans", "mulher-trans", "travesti"];

const SORTS: Option<OrbitaSort>[] = [
  { id: "proximidade", label: "Proximidade" },
  { id: "afinidade", label: "Afinidade (assuntos)" },
];

const NSFW: Option<OrbitaFilters["nsfw"]>[] = [
  { id: "any", label: "Tanto faz" },
  { id: "sim", label: "Aceita" },
  { id: "nao", label: "Não aceita" },
];

const BODY_TYPE_OPTIONS: Option<BodyTypeFilter>[] = [...BODY_TYPES, { id: "nao-informado", label: "Não informado" }];

const PHOTOS: Option<PhotoFilterId>[] = [
  { id: "tem-fotos", label: "Tem fotos" },
  { id: "rosto", label: "Tem fotos do rosto" },
  { id: "album", label: "Tem álbum" },
];

const TESTED: Option<string>[] = [
  { id: "any", label: "Qualquer" },
  { id: "3", label: "Até 3 meses" },
  { id: "6", label: "Até 6 meses" },
  { id: "12", label: "Até 12 meses" },
];

/** Advanced Órbita filters: bottom sheet on mobile, side panel on desktop. Changes apply live. */
export function OrbitaFiltersSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const { profiles } = useOrbitaProfiles();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const ids = useId();
  const onKeyDown = useDialogFocus(dialogRef, titleRef, onClose);
  const isMobile = device === "mobile";
  const f = state.orbitaFilters;
  const count = activeFilterCount(f);
  const update = (patch: Partial<OrbitaFilters>) => dispatch({ type: "updateOrbitaFilters", patch });
  const toggle = <K extends ListFilterKey>(key: K, value: OrbitaFilters[K][number]) =>
    update({ [key]: toggleInList(f[key] as OrbitaFilters[K][number][], value) } as Partial<OrbitaFilters>);
  const onlyTrans = f.genders.length === TRANS_GENDERS.length && TRANS_GENDERS.every((g) => f.genders.includes(g));

  const chips = <K extends ListFilterKey>(
    key: K,
    options: Option<OrbitaFilters[K][number]>[],
    highlight?: string[],
  ) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <ToggleChip
          key={o.id}
          pressed={(f[key] as string[]).includes(o.id)}
          highlight={highlight?.includes(o.id)}
          onToggle={() => toggle(key, o.id)}
        >
          {o.label}
        </ToggleChip>
      ))}
    </div>
  );

  return (
    <div
      onClick={onClose}
      className={`absolute inset-0 z-50 flex bg-tinta/75 ${isMobile ? "items-end" : "justify-end p-4"}`}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={`lg-sheet flex w-full flex-col overflow-hidden outline-none ${
          isMobile ? "max-h-[90%] rounded-t-[30px] border-b-0" : "h-full max-w-[420px] rounded-[30px]"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.12] px-5 py-4">
          <div>
            <h2 ref={titleRef} id={titleId} tabIndex={-1} className="text-lg font-bold tracking-tight text-white">
              Filtros
            </h2>
            <p className="text-[11px] text-slate-300" aria-live="polite">
              {profiles.length} {profiles.length === 1 ? "pessoa combina" : "pessoas combinam"}
              {count > 0 && ` · ${count} ${count === 1 ? "filtro ativo" : "filtros ativos"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar filtros"
            className="lg-pill flex h-8 w-8 items-center justify-center rounded-full text-sm text-white"
          >
            ✕
          </button>
        </div>

        <div className="orbit-scroll flex-1 overflow-y-auto px-5 py-4">
          <Group title="Ordenar por">
            <Segmented
              name={`${ids}-sort`}
              legend="Ordenar por"
              options={SORTS}
              value={state.orbitaSort}
              onChange={(sort) => dispatch({ type: "setOrbitaSort", sort })}
            />
          </Group>

          <Group title="Básico">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-white">Só quem está online</span>
              <Switch
                size="sm"
                checked={f.onlineOnly}
                onChange={() => update({ onlineOnly: !f.onlineOnly })}
                label="Só quem está online"
              />
            </div>
            <RangeField label="Idade" rangeKey="age" value={f.age} onChange={(age) => update({ age })} />
          </Group>

          <Group title="Identidade de gênero">
            <div>
              <ToggleChip pressed={onlyTrans} onToggle={() => update({ genders: onlyTrans ? [] : [...TRANS_GENDERS] })}>
                <span aria-hidden="true">🏳️‍⚧️</span> Só pessoas trans e travestis
              </ToggleChip>
            </div>
            {chips("genders", GENDERS)}
          </Group>

          <Group title="Orientação sexual">{chips("orientations", ORIENTATIONS)}</Group>
          <Group title="Tribos" note="Rótulos que a própria pessoa escolheu.">
            {chips("tribes", TRIBES)}
          </Group>
          <Group title="O que busca">{chips("lookingFor", LOOKING_FOR)}</Group>
          <Group title="Posição" note="Campo opcional: só aparece quem preencheu.">
            {chips("positions", POSITIONS)}
          </Group>
          <Group title="Esportes">{chips("sports", SPORTS)}</Group>

          <Group title="Corpo" note="Perfis sem altura ou peso ficam de fora quando você usa esse filtro.">
            <RangeField label="Altura" rangeKey="height" value={f.height} onChange={(height) => update({ height })} />
            <RangeField label="Peso" rangeKey="weight" value={f.weight} onChange={(weight) => update({ weight })} />
          </Group>

          <Group title="Tipo de corpo" note="Como a própria pessoa se descreve.">
            {chips("bodyTypes", BODY_TYPE_OPTIONS)}
          </Group>

          <Group title="Fotos" note="Só aparece quem tem tudo o que você marcar. Álbuns são privados.">
            {chips("photos", PHOTOS)}
          </Group>

          <Group title="Relacionamento">{chips("relationships", RELATIONSHIPS)}</Group>
          <Group title="Onde prefere encontrar">{chips("meetAt", MEET_PLACES)}</Group>

          <Group title="Fotos NSFW" note="Só a preferência declarada para conversas privadas. O Orbit não exibe nudez.">
            <Segmented
              name={`${ids}-nsfw`}
              legend="Aceita fotos NSFW"
              options={NSFW}
              value={f.nsfw}
              onChange={(nsfw) => update({ nsfw })}
            />
          </Group>

          <Group
            title="Saúde sexual"
            note="Autodeclarado e opcional. Status sorológico não vira filtro, para não alimentar estigma: aparece só no perfil de quem quis contar."
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-white">Usa PrEP</span>
              <Switch
                size="sm"
                checked={f.prepOnly}
                onChange={() => update({ prepOnly: !f.prepOnly })}
                label="Só quem usa PrEP"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-white">Preservativo</p>
              {chips(
                "condom",
                CONDOM_USE.filter((c) => c.id !== "prefiro-nao-dizer"),
              )}
            </div>
            <Segmented
              name={`${ids}-tested`}
              legend="Testagem recente"
              showLegend
              options={TESTED}
              value={f.testedWithinMonths === null ? "any" : String(f.testedWithinMonths)}
              onChange={(v) => update({ testedWithinMonths: v === "any" ? null : Number(v) })}
            />
          </Group>

          <Group title="Assuntos" note="Destacados: assuntos que você também marcou no seu Hub.">
            {chips("topics", TOPICS, state.user.topics)}
          </Group>
        </div>

        <div
          className={`flex shrink-0 items-center gap-2.5 border-t border-white/[0.12] bg-tinta px-5 py-3.5 ${isMobile ? "pb-6" : ""}`}
        >
          <button
            type="button"
            aria-disabled={count === 0}
            onClick={() => count > 0 && dispatch({ type: "clearOrbitaFilters" })}
            className="lg-pill rounded-full px-4 py-2.5 text-xs font-bold text-white aria-disabled:cursor-default aria-disabled:opacity-50"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="lg-btn-primary flex-1 rounded-full px-4 py-2.5 text-xs font-extrabold active:scale-95"
          >
            Ver {profiles.length} {profiles.length === 1 ? "pessoa" : "pessoas"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="border-b border-white/[0.08] py-3.5 first:pt-0 last:border-b-0">
      <h3 id={id} className="font-sans text-[11px] font-bold tracking-wider text-slate-300 uppercase">
        {title}
      </h3>
      {note && <p className="mt-0.5 text-[11px] leading-snug text-slate-300">{note}</p>}
      <div className="mt-2.5 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Segmented<T extends string>({
  name,
  legend,
  showLegend = false,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  showLegend?: boolean;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className={showLegend ? "mb-1.5 text-xs font-semibold text-white" : "sr-only"}>{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const checked = o.id === value;
          return (
            <label
              key={o.id}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-semibold transition has-[:focus-visible]:[outline:3px_solid_var(--foco)] has-[:focus-visible]:[outline-offset:3px] ${
                checked
                  ? "lg-active-lens"
                  : "border border-white/[0.14] bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] hover:text-white"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.id}
                checked={checked}
                onChange={() => onChange(o.id)}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function RangeField({
  label,
  rangeKey,
  value,
  onChange,
}: {
  label: string;
  rangeKey: RangeFilterKey;
  value: NumberRange;
  onChange: (value: NumberRange) => void;
}) {
  const limits = RANGE_LIMITS[rangeKey];
  const min = value.min ?? limits.min;
  const max = value.max ?? limits.max;
  const summary =
    value.min === null && value.max === null
      ? "Qualquer"
      : `${min}${value.max === null ? "+" : `–${max}`} ${limits.unit}`;
  const set = (nextMin: number, nextMax: number) =>
    onChange({
      min: nextMin <= limits.min ? null : nextMin,
      max: nextMax >= limits.max ? null : nextMax,
    });
  const slider = "h-1.5 w-full cursor-pointer accent-areia";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-white">{label}</span>
        <span className="text-[11px] font-semibold text-areia" aria-hidden="true">
          {summary}
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-[10px] text-slate-300">
          Mín. {min}
          <input
            type="range"
            min={limits.min}
            max={limits.max}
            step={limits.step}
            value={min}
            aria-valuetext={`${min} ${limits.unit}`}
            aria-label={`Mínimo de ${label.toLowerCase()}`}
            onChange={(e) => set(Math.min(Number(e.target.value), max), max)}
            className={slider}
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-slate-300">
          Máx. {max}
          {value.max === null ? "+" : ""}
          <input
            type="range"
            min={limits.min}
            max={limits.max}
            step={limits.step}
            value={max}
            aria-valuetext={value.max === null ? `${max} ${limits.unit} ou mais` : `${max} ${limits.unit}`}
            aria-label={`Máximo de ${label.toLowerCase()}`}
            onChange={(e) => set(min, Math.max(Number(e.target.value), min))}
            className={slider}
          />
        </label>
      </div>
    </div>
  );
}
