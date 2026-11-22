"use client";

import { MolduraAvatar } from "@/components/molduras/MolduraAvatar";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toasts";
import { INTENTIONS } from "@/lib/data/intentions";
import { MOLDURAS, RARIDADE_LABEL, type Moldura, type Raridade } from "@/lib/molduras/catalogo";
import { CONQUISTAS, conquistaDe, molduraVisivel, progresso, type ContextoConquistas } from "@/lib/molduras/conquistas";
import { ORBIT_PLUS } from "@/lib/molduras/config";
import { useOrbit } from "@/lib/state/OrbitProvider";

const RARIDADE_CLASSE: Record<Raridade, string> = {
  comum: "border-white/25 text-slate-300",
  rara: "border-sky-300/50 text-sky-200",
  epica: "border-fuchsia-300/50 text-fuchsia-200",
  lendaria: "border-amber-300/60 text-amber-200",
};

/** Gallery of collectible frames for the user's own avatar ring. */
export function MolduraPicker({ compact }: { compact: boolean }) {
  const { state, dispatch } = useOrbit();
  const showToast = useToast();
  const cor = (INTENTIONS[state.user.primaryIntention] ?? INTENTIONS.troca).color;
  const { ativa, desbloqueadas } = state.molduras;
  const visiveis = MOLDURAS.filter((m) => molduraVisivel(m));
  const ctx: ContextoConquistas = {
    foundPacoca: state.foundPacoca,
    conversations: state.conversations,
    posts: state.posts,
    desejosConcluido: state.desejos.concluido,
    sentTaps: state.sentTaps,
    topicos: state.user.topics.length,
    parkRoomId: state.parkRoomId,
    desbloqueadas,
  };
  const total = visiveis.filter((m) => desbloqueadas.includes(m.id)).length;

  const usar = (m: Moldura) => {
    dispatch({ type: "usarMoldura", id: m.id });
    showToast(`Moldura ${m.nome} no seu avatar.`, "success");
  };
  const desbloquearPlus = (m: Moldura) => {
    dispatch({ type: "desbloquearOrbitPlus", id: m.id });
    showToast(`${ORBIT_PLUS.nome} simulado: ${m.nome} desbloqueada sem cobrança.`, "success");
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-relaxed text-slate-300">
        A moldura envolve o anel do seu avatar no radar, nas Conexões, no mini chat e no cartão. Você ganha novas
        molduras usando o app.{" "}
        {ORBIT_PLUS.modo === "simulado" && (
          <>
            As marcadas como <strong className="text-amber-200">{ORBIT_PLUS.nome}</strong> mostram como seria um extra
            pago. {ORBIT_PLUS.aviso}
          </>
        )}
      </p>
      <p className="text-[11px] font-semibold text-areia" aria-live="polite">
        {total} de {visiveis.length} molduras desbloqueadas
      </p>
      <ul className={`grid gap-2.5 ${compact ? "grid-cols-2" : "grid-cols-3"}`}>
        {visiveis.map((m) => {
          const liberada = desbloqueadas.includes(m.id);
          const emUso = ativa === m.id;
          const conquista = conquistaDe(m);
          const prog = conquista ? progresso(conquista, ctx) : null;
          const plus = m.desbloqueio.tipo === "orbitPlus";
          return (
            <li
              key={m.id}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center ${
                emUso ? "border-areia/70 bg-areia/10" : "border-white/[0.12] bg-tinta/60"
              }`}
            >
              <div className={`relative mt-1.5 mb-1 ${liberada ? "" : "opacity-55 grayscale-[0.6]"}`}>
                <MolduraAvatar molduraId={m.id} cor={cor} size={52}>
                  <Avatar cfg={state.user.avatar} />
                </MolduraAvatar>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white">{m.nome}</div>
                <div className="mt-1 flex flex-wrap justify-center gap-1">
                  <span
                    className={`rounded-full border px-1.5 py-px text-[10px] font-bold ${RARIDADE_CLASSE[m.raridade]}`}
                  >
                    {RARIDADE_LABEL[m.raridade]}
                  </span>
                  {plus && (
                    <span className="rounded-full bg-amber-200 px-1.5 py-px text-[10px] font-extrabold text-tinta">
                      {ORBIT_PLUS.nome}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[10px] leading-snug text-slate-300">{m.descricao}</p>
              </div>
              <div className="mt-auto w-full">
                {liberada ? (
                  <button
                    type="button"
                    aria-pressed={emUso}
                    onClick={() => !emUso && usar(m)}
                    aria-label={emUso ? `${m.nome}, em uso` : `Usar a moldura ${m.nome}`}
                    className={`w-full rounded-full px-3 py-1.5 text-[11px] font-bold ${
                      emUso ? "lg-active-lens cursor-default" : "lg-pill text-white"
                    }`}
                  >
                    {emUso ? "✓ Em uso" : "Usar"}
                  </button>
                ) : plus && ORBIT_PLUS.modo === "simulado" ? (
                  <button
                    type="button"
                    onClick={() => desbloquearPlus(m)}
                    aria-label={`Desbloquear ${m.nome} com ${ORBIT_PLUS.nome} simulado, sem cobrança`}
                    className="w-full rounded-full bg-amber-200 px-3 py-1.5 text-[11px] font-extrabold text-tinta"
                  >
                    Desbloquear (simulação)
                  </button>
                ) : conquista && prog ? (
                  <div className="text-left">
                    <p className="text-[10px] leading-snug text-white">
                      <span aria-hidden="true">🔒 </span>
                      <span className="sr-only">Bloqueada. </span>
                      {CONQUISTAS[conquista].titulo}
                    </p>
                    <div
                      role="progressbar"
                      aria-label={`Progresso: ${CONQUISTAS[conquista].titulo}`}
                      aria-valuemin={0}
                      aria-valuemax={prog.meta}
                      aria-valuenow={prog.atual}
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"
                    >
                      <div
                        className="h-full rounded-full bg-areia"
                        style={{ width: `${(prog.atual / prog.meta) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-slate-300">
                      {prog.atual} de {prog.meta}
                    </p>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
