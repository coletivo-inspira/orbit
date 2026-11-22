import { CATEGORIAS } from "@/lib/desejos/categorias";
import type { DesejoPublico } from "@/lib/desejos/perfis";

/** Compact read-only bars for desires someone chose to show on a profile or card. */
export function BarrasDesejos({ desejos }: { desejos: DesejoPublico[] }) {
  return (
    <ul className="flex flex-col gap-1.5" aria-label="Desejos escolhidos para o perfil">
      {desejos.map((d) => {
        const c = CATEGORIAS[d.id];
        return (
          <li key={d.id} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2 text-xs">
            <span className="truncate font-semibold text-white">{c.nome}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <span className="block h-full rounded-full bg-areia" style={{ width: `${d.pct}%` }} />
            </span>
            <span className="font-bold text-areia">{d.pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}
