"use client";

import { useId, useState, type ReactNode } from "react";
import { Switch } from "@/components/ui/Switch";
import { GRAPH_DISPLAY_LIMITS, type GraphDisplay } from "@/lib/engines/graphDisplay";

export interface GraphFilterToggle {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
}

interface GraphSettingsPanelProps {
  display: GraphDisplay;
  onChange: (patch: Partial<GraphDisplay>) => void;
  onReset: () => void;
  /** Replays the layout from scratch, like Obsidian's "Animar". */
  onAnimate: () => void;
  /** Nodes pinned in the current view. */
  pinnedCount: number;
  onUnpinAll: () => void;
  search: string;
  onSearch: (value: string) => void;
  toggles: GraphFilterToggle[];
  compact: boolean;
  /** Phone placement: clears the floating nav by default. */
  compactBottom?: string;
  onClose: () => void;
}

/** Obsidian-style graph settings: filters, display and forces. Desktop and phone only (never the watch). */
export function GraphSettingsPanel({
  display,
  onChange,
  onReset,
  onAnimate,
  pinnedCount,
  onUnpinAll,
  search,
  onSearch,
  toggles,
  compact,
  compactBottom = "bottom-[84px]",
  onClose,
}: GraphSettingsPanelProps) {
  const uid = useId();
  return (
    <section
      data-graph-control
      aria-label="Configurações do grafo"
      className={`lg-sheet orbit-scroll absolute z-30 flex flex-col overflow-y-auto rounded-[22px] text-white ${
        compact ? `inset-x-2.5 ${compactBottom} max-h-[70%]` : "top-2.5 right-2.5 bottom-16 w-[268px]"
      }`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-white/[0.12] bg-tinta/95 px-3.5 py-2.5">
        <h2 className="text-xs font-extrabold">Configurações do grafo</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onReset}
            title="Restaurar padrão"
            aria-label="Restaurar configurações padrão"
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-white/10"
          >
            ↺
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações"
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      </div>

      <Group title="Filtros">
        <label htmlFor={`${uid}-search`} className="sr-only">
          Procurar no grafo
        </label>
        <input
          id={`${uid}-search`}
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Procurar…"
          className="w-full rounded-xl border border-white/20 bg-noite px-3 py-1.5 text-xs text-white placeholder-slate-300"
        />
        {toggles.map((t) => (
          <Row key={t.id} label={t.label}>
            <Switch size="sm" checked={t.checked} onChange={t.onToggle} label={t.label} />
          </Row>
        ))}
      </Group>

      <Group title="Tela">
        <Row label="Setas">
          <Switch
            size="sm"
            checked={display.arrows}
            onChange={() => onChange({ arrows: !display.arrows })}
            label="Setas"
          />
        </Row>
        <Slider
          label="Limite para mostrar nomes"
          hint={display.textFade < 0 ? "mais nomes" : display.textFade > 0 ? "só de perto" : "padrão"}
          value={display.textFade}
          limits={GRAPH_DISPLAY_LIMITS.textFade}
          onChange={(v) => onChange({ textFade: v })}
        />
        <Slider
          label="Tamanho dos nós"
          value={display.nodeSize}
          limits={GRAPH_DISPLAY_LIMITS.nodeSize}
          onChange={(v) => onChange({ nodeSize: v })}
        />
        <Slider
          label="Grossura das linhas"
          value={display.linkWidth}
          limits={GRAPH_DISPLAY_LIMITS.linkWidth}
          onChange={(v) => onChange({ linkWidth: v })}
        />
        <Row label="Fixar nós ao arrastar">
          <Switch
            size="sm"
            checked={display.pinOnDrag}
            onChange={() => onChange({ pinOnDrag: !display.pinOnDrag })}
            label="Fixar nós ao arrastar"
          />
        </Row>
        <p className="-mt-1 text-[10px] leading-snug text-slate-300">
          Arraste para organizar: o nó fica onde você soltar (📌). Dois cliques nele, ou “Soltar”, devolvem à física.
        </p>
        <div className="mt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onUnpinAll}
            disabled={pinnedCount === 0}
            className="lg-pill rounded-full px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
          >
            Soltar todos{pinnedCount ? ` (${pinnedCount})` : ""}
          </button>
          <button
            type="button"
            onClick={onAnimate}
            className="lg-btn-primary rounded-full px-3.5 py-1.5 text-[11px] font-bold"
          >
            Animar
          </button>
        </div>
      </Group>

      <Group title="Forças" defaultOpen={!compact}>
        <Slider
          label="Força centrípeta"
          value={display.center}
          limits={GRAPH_DISPLAY_LIMITS.center}
          onChange={(v) => onChange({ center: v })}
        />
        <Slider
          label="Força de repulsão"
          value={display.repel}
          limits={GRAPH_DISPLAY_LIMITS.repel}
          onChange={(v) => onChange({ repel: v })}
        />
        <Slider
          label="Força das linhas"
          value={display.link}
          limits={GRAPH_DISPLAY_LIMITS.link}
          onChange={(v) => onChange({ link: v })}
        />
        <Slider
          label="Distância das linhas"
          value={display.distance}
          limits={GRAPH_DISPLAY_LIMITS.distance}
          onChange={(v) => onChange({ distance: v })}
        />
      </Group>
    </section>
  );
}

function Group({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="border-b border-white/[0.09] px-3.5 py-2 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 py-1 text-left text-xs font-bold"
      >
        <span className={`text-[9px] transition-transform ${open ? "rotate-90" : ""}`} aria-hidden="true">
          ▶
        </span>
        {title}
      </button>
      <div id={id} hidden={!open} className="flex flex-col gap-2.5 pt-1.5 pb-1.5">
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px] text-slate-200">
      <span>{label}</span>
      {children}
    </div>
  );
}

function Slider({
  label,
  hint,
  value,
  limits,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  limits: { min: number; max: number; step: number };
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex items-center justify-between gap-2 text-[11px] text-slate-200">
        <span>{label}</span>
        <span className="font-mono text-[10px] text-slate-300">{hint ?? value.toFixed(2)}</span>
      </label>
      <input
        id={id}
        type="range"
        min={limits.min}
        max={limits.max}
        step={limits.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-areia"
      />
    </div>
  );
}
