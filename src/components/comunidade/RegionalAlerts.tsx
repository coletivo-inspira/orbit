"use client";

import { ExternalLinkIcon } from "@/components/comunidade/ExternalLinkIcon";
import { REGION_LIST, REGIONS, regionalAlerts } from "@/lib/data/regions";
import { useOrbit } from "@/lib/state/OrbitProvider";

export function RegionalAlerts({ compact = false }: { compact?: boolean }) {
  const { state, dispatch } = useOrbit();
  const region = REGIONS[state.regionId];
  const alerts = regionalAlerts(region.id);

  return (
    <section aria-label="Alertas de saúde na sua região">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-sans text-sm font-extrabold text-white">📍 Na sua região</h2>
        <label className="lg-pill flex items-center gap-1.5 rounded-full py-1 pr-2 pl-3 text-[11px] font-semibold text-slate-100">
          <span className="sr-only">Escolher região</span>
          <select
            value={region.id}
            onChange={(e) => dispatch({ type: "setRegion", regionId: e.target.value })}
            className="cursor-pointer appearance-none bg-transparent pr-1 font-bold text-white outline-none"
          >
            {REGION_LIST.map((r) => (
              <option key={r.id} value={r.id} className="bg-tinta text-white">
                {r.city}, {r.uf}
              </option>
            ))}
          </select>
          <span aria-hidden className="text-slate-300">
            ▾
          </span>
        </label>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-slate-300">
        Você escolhe a região — o Orbit não usa GPS.{" "}
        <strong className="font-semibold text-amber-100">Alertas de exemplo (simulados):</strong> confirme sempre na
        fonte oficial.
      </p>

      <div className="orbit-scroll -mx-1 mt-2.5 flex snap-x gap-3 overflow-x-auto px-1 pb-1.5">
        {alerts.map((alert) => (
          <article
            key={alert.id}
            className={`lg-panel flex shrink-0 snap-start flex-col gap-2 rounded-[20px] p-3.5 ${compact ? "w-[244px]" : "w-[264px]"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-lg leading-none" aria-hidden>
                {alert.emoji}
              </span>
              <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-100 uppercase">
                Exemplo · simulado
              </span>
            </div>
            <h3 className="font-sans text-sm leading-snug font-bold text-white">{alert.title}</h3>
            <p className="text-[11px] leading-relaxed text-slate-300">{alert.text}</p>
            <ul className="mt-auto space-y-1 border-t border-white/[0.1] pt-2">
              {alert.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-areia underline-offset-2 hover:underline"
                  >
                    {source.label}
                    <ExternalLinkIcon className="h-2.5 w-2.5" />
                    <span className="sr-only">(abre em nova aba)</span>
                  </a>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
