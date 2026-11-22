"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Ilustracao } from "@/components/desejos/Ilustracao";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toasts";
import { CATEGORIAS } from "@/lib/desejos/categorias";
import { NENHUMA, NIVEIS_INTENSIDADE, PERGUNTAS, RESPOSTAS_RAPIDAS } from "@/lib/desejos/perguntas";
import {
  contarRespondidas,
  MINIMO_RESPONDIDAS,
  passoAnterior,
  proximoPasso,
  respostaValida,
  resultadoOrdenado,
} from "@/lib/desejos/pontuacao";
import type { CategoriaId, NivelIntensidade, Pergunta, Resposta } from "@/lib/desejos/types";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";

export const FRASE_RESULTADO =
  "Isto mostra o que despertou mais curiosidade nas suas respostas de hoje. Desejos mudam com o tempo e o contexto.";

export function DesejosScreen() {
  const { state } = useOrbit();
  const { device } = useDevice();
  const isMobile = device === "mobile";
  return (
    <div className={`orbit-scroll h-full overflow-y-auto ${isMobile ? "p-3.5 pb-24" : "p-6"}`}>
      <div className="mx-auto max-w-3xl">
        {state.desejosTela === "intro" && <Intro isMobile={isMobile} />}
        {state.desejosTela === "quiz" && <Quiz key={state.desejos.passo} isMobile={isMobile} />}
        {state.desejosTela === "resultado" && <Resultado isMobile={isMobile} />}
      </div>
    </div>
  );
}

function Cabecalho({ isMobile, children }: { isMobile: boolean; children?: ReactNode }) {
  const { dispatch } = useOrbit();
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1
          tabIndex={-1}
          data-focus-fallback
          className={`${isMobile ? "text-lg" : "text-2xl"} font-bold tracking-tight text-white`}
        >
          Desejos
        </h1>
        <span className="rounded-full border border-areia/50 bg-areia/15 px-2.5 py-0.5 text-[11px] font-bold text-areia">
          18+ · privado
        </span>
        {children}
      </div>
      <button
        type="button"
        onClick={() => dispatch({ type: "setTab", tab: "perfil" })}
        className="lg-pill rounded-full px-3 py-1.5 text-[11px] font-semibold text-white"
      >
        ← Meu Hub
      </button>
    </div>
  );
}

function Intro({ isMobile }: { isMobile: boolean }) {
  const { state, dispatch } = useOrbit();
  const [adulto, setAdulto] = useState(false);
  const checkId = useId();
  const respondidas = contarRespondidas(state.desejos.respostas);
  const retomar = respondidas > 0 || state.desejos.passo > 0;

  const avisos: [string, string][] = [
    ["18+", "Só para maiores de 18 anos. Se não for o seu caso, volte ao Hub."],
    ["Privado", "Suas respostas ficam só neste aparelho. Nada aparece no perfil sem você escolher, um por um."],
    ["Pule à vontade", "Toda pergunta tem “pular”, e dá para voltar ou parar quando quiser."],
    ["Uns 5 minutos", `${PERGUNTAS.length} perguntas curtas: cenas, uma régua de interesse e sim/talvez/não.`],
    ["Não é diagnóstico", "É um convite para se conhecer, não um rótulo nem avaliação de saúde."],
  ];

  return (
    <>
      <Cabecalho isMobile={isMobile} />
      <div className="lg-panel overflow-hidden rounded-[28px]">
        <div className="grid grid-cols-3 gap-1.5 bg-tinta p-3" aria-hidden="true">
          <Ilustracao id="jantar" className="w-full rounded-xl" />
          <Ilustracao id="mascaras" className="w-full rounded-xl" />
          <Ilustracao id="floresta" className="w-full rounded-xl" />
        </div>
        <div className="p-5">
          <h2 className={`${isMobile ? "text-base" : "text-xl"} font-bold text-white`}>
            O que desperta a sua curiosidade?
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            Um quiz visual sobre desejos, sem nada explícito. No fim, você vê barras de 0 a 100% por tema, com uma
            explicação de cada um.
          </p>
          <dl className="mt-4 grid gap-2.5">
            {avisos.map(([titulo, texto]) => (
              <div key={titulo} className="rounded-2xl border border-white/[0.12] bg-tinta/60 px-3.5 py-2.5">
                <dt className="text-xs font-bold text-areia">{titulo}</dt>
                <dd className="mt-0.5 text-xs leading-relaxed text-white">{texto}</dd>
              </div>
            ))}
          </dl>
          <label htmlFor={checkId} className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-white">
            <input
              id={checkId}
              type="checkbox"
              checked={adulto}
              onChange={(e) => setAdulto(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#dec9a8]"
            />
            Tenho 18 anos ou mais e quero continuar.
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!adulto}
              onClick={() => dispatch({ type: "setDesejosTela", tela: "quiz" })}
              className="lg-btn-primary rounded-full px-5 py-2.5 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {retomar ? `Continuar (pergunta ${state.desejos.passo + 1} de ${PERGUNTAS.length})` : "Começar"}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "setTab", tab: "perfil" })}
              className="lg-pill rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Quiz({ isMobile }: { isMobile: boolean }) {
  const { state, dispatch } = useOrbit();
  const { passo, respostas } = state.desejos;
  const pergunta = PERGUNTAS[passo];
  const resposta = respostas[pergunta.id];
  const respondida = respostaValida(pergunta, resposta);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const tituloId = useId();

  useEffect(() => {
    tituloRef.current?.focus({ preventScroll: true });
  }, []);

  const avancar = () => {
    const next = proximoPasso(passo, respostas);
    if (next >= PERGUNTAS.length) dispatch({ type: "concluirDesejos" });
    else dispatch({ type: "irParaPergunta", passo: next });
  };
  const pular = () => {
    dispatch({ type: "limparRespostaDesejo", perguntaId: pergunta.id });
    const semEsta = Object.fromEntries(Object.entries(respostas).filter(([id]) => id !== pergunta.id));
    const next = proximoPasso(passo, semEsta);
    if (next >= PERGUNTAS.length) dispatch({ type: "concluirDesejos" });
    else dispatch({ type: "irParaPergunta", passo: next });
  };
  const voltar = () => {
    if (passo === 0) dispatch({ type: "setDesejosTela", tela: "intro" });
    else dispatch({ type: "irParaPergunta", passo: passoAnterior(passo, respostas) });
  };
  const responder = (r: Resposta) => dispatch({ type: "responderDesejo", perguntaId: pergunta.id, resposta: r });
  const progresso = Math.round((passo / PERGUNTAS.length) * 100);

  return (
    <>
      <Cabecalho isMobile={isMobile} />
      <section aria-labelledby={tituloId} className="lg-panel rounded-[28px] p-5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
          <span>
            Pergunta {passo + 1} de {PERGUNTAS.length}
          </span>
          <span>{TIPO_ROTULO[pergunta.tipo]}</span>
        </div>
        <div
          role="progressbar"
          aria-label="Progresso do quiz"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progresso}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
        >
          <div className="h-full rounded-full bg-areia transition-all" style={{ width: `${progresso}%` }} />
        </div>

        <h2
          ref={tituloRef}
          id={tituloId}
          tabIndex={-1}
          className={`mt-4 ${isMobile ? "text-base" : "text-xl"} leading-snug font-bold text-white`}
        >
          {pergunta.enunciado}
        </h2>

        <div className="mt-4">
          {pergunta.tipo === "cenas" && (
            <Cenas pergunta={pergunta} resposta={resposta} onResponder={responder} isMobile={isMobile} />
          )}
          {pergunta.tipo === "intensidade" && (
            <Regua pergunta={pergunta} resposta={resposta} onResponder={responder} labelledBy={tituloId} />
          )}
          {pergunta.tipo === "rapida" && <Rapida resposta={resposta} onResponder={responder} labelledBy={tituloId} />}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/[0.12] pt-4">
          <button
            type="button"
            onClick={voltar}
            className="lg-pill rounded-full px-4 py-2 text-xs font-semibold text-white"
          >
            ← Voltar
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={pular}
              className="lg-pill rounded-full px-4 py-2 text-xs font-semibold text-white"
            >
              Pular
            </button>
            <button
              type="button"
              onClick={avancar}
              disabled={!respondida}
              className="lg-btn-primary rounded-full px-5 py-2 text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {passo === PERGUNTAS.length - 1 ? "Ver resultado" : "Próxima →"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

const TIPO_ROTULO: Record<Pergunta["tipo"], string> = {
  cenas: "Escolha uma cena",
  intensidade: "Régua de interesse",
  rapida: "Resposta rápida",
};

function Cenas({
  pergunta,
  resposta,
  onResponder,
  isMobile,
}: {
  pergunta: Extract<Pergunta, { tipo: "cenas" }>;
  resposta: Resposta | undefined;
  onResponder: (r: Resposta) => void;
  isMobile: boolean;
}) {
  const colunas = isMobile || pergunta.opcoes.length === 2 ? "grid-cols-2" : "grid-cols-4";
  return (
    <div>
      <ul className={`grid gap-2.5 ${colunas}`}>
        {pergunta.opcoes.map((o) => {
          const escolhida = resposta === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                aria-pressed={escolhida}
                onClick={() => onResponder(o.id)}
                className={`flex h-full w-full flex-col overflow-hidden rounded-2xl border text-left transition ${
                  escolhida ? "border-areia bg-areia/15" : "border-white/[0.14] bg-tinta hover:border-white/40"
                }`}
              >
                <Ilustracao id={o.ilustracao} className="w-full" />
                <span className="flex flex-1 items-start gap-1.5 p-2.5 text-xs leading-snug font-semibold text-white">
                  <span aria-hidden="true" className={escolhida ? "text-areia" : "text-transparent"}>
                    ✓
                  </span>
                  {o.rotulo}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        aria-pressed={resposta === NENHUMA}
        onClick={() => onResponder(NENHUMA)}
        className={`mt-2.5 w-full rounded-full border px-4 py-2 text-xs font-semibold transition ${
          resposta === NENHUMA
            ? "border-areia bg-areia/15 text-white"
            : "border-white/[0.14] text-slate-300 hover:text-white"
        }`}
      >
        Nenhuma dessas
      </button>
    </div>
  );
}

/** Four tappable levels drawn as a ruler; a draggable slider was ruled out by the methodology. */
function Regua({
  pergunta,
  resposta,
  onResponder,
  labelledBy,
}: {
  pergunta: Extract<Pergunta, { tipo: "intensidade" }>;
  resposta: Resposta | undefined;
  onResponder: (r: Resposta) => void;
  labelledBy: string;
}) {
  return (
    <div>
      <Ilustracao id={pergunta.ilustracao} className="mx-auto w-full max-w-[260px] rounded-2xl" />
      <div role="radiogroup" aria-labelledby={labelledBy} className="relative mt-4">
        <div className="absolute top-[22px] right-[12.5%] left-[12.5%] h-0.5 bg-white/20" aria-hidden="true" />
        <div className="relative grid grid-cols-4 gap-1">
          {NIVEIS_INTENSIDADE.map((rotulo, nivel) => {
            const marcado = resposta === nivel;
            return (
              <button
                key={rotulo}
                type="button"
                role="radio"
                aria-checked={marcado}
                onClick={() => onResponder(nivel as NivelIntensidade)}
                className="group flex flex-col items-center gap-1.5 rounded-2xl py-1"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                    marcado
                      ? "border-areia bg-areia text-tinta"
                      : "border-white/40 bg-noite text-slate-300 group-hover:border-white/70"
                  }`}
                >
                  {nivel}
                </span>
                <span className={`text-[11px] font-semibold ${marcado ? "text-white" : "text-slate-300"}`}>
                  {rotulo}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Rapida({
  resposta,
  onResponder,
  labelledBy,
}: {
  resposta: Resposta | undefined;
  onResponder: (r: Resposta) => void;
  labelledBy: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid grid-cols-3 gap-2">
      {RESPOSTAS_RAPIDAS.map((r) => {
        const marcado = resposta === r.id;
        return (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={marcado}
            onClick={() => onResponder(r.id)}
            className={`rounded-2xl border py-4 text-sm font-bold transition ${
              marcado
                ? "border-areia bg-areia/15 text-white"
                : "border-white/[0.14] bg-tinta text-slate-300 hover:text-white"
            }`}
          >
            {r.rotulo}
          </button>
        );
      })}
    </div>
  );
}

function Resultado({ isMobile }: { isMobile: boolean }) {
  const { state, dispatch } = useOrbit();
  const showToast = useToast();
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const tituloId = useId();
  const resultado = resultadoOrdenado(state.desejos.respostas);
  const publicos = state.desejosPublicos;

  const togglePublico = (id: CategoriaId) => {
    const vaiMostrar = !publicos.includes(id);
    dispatch({ type: "toggleDesejoPublico", id });
    showToast(
      vaiMostrar
        ? `${CATEGORIAS[id].nome} aparece na prévia do seu cartão (simulação local).`
        : `${CATEGORIAS[id].nome} saiu do seu cartão.`,
      vaiMostrar ? "success" : "info",
    );
  };

  const apagar = () => {
    if (!confirmarApagar) {
      setConfirmarApagar(true);
      return;
    }
    dispatch({ type: "apagarDesejos" });
    showToast("Respostas e escolhas de Desejos apagadas deste aparelho.", "info");
  };

  return (
    <>
      <Cabecalho isMobile={isMobile} />
      <section className="lg-panel rounded-[28px] p-5" aria-labelledby={tituloId}>
        <h2 id={tituloId} className={`${isMobile ? "text-base" : "text-xl"} font-bold text-white`}>
          Seu resultado de hoje
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">{FRASE_RESULTADO}</p>
        <p className="mt-2 rounded-2xl border border-salvia/40 bg-salvia/10 px-3 py-2 text-xs leading-relaxed text-salvia">
          Nada é público por padrão. Use “Mostrar no perfil” para escolher, um por um, o que aparece no seu cartão.
          {!state.user.isPublic && " Seu perfil está privado: só conexões aprovadas veriam."}
        </p>

        <ul className="mt-4 flex flex-col gap-2.5">
          {resultado.map((r) => {
            const c = CATEGORIAS[r.id];
            const semDados = r.pct === null;
            const publico = publicos.includes(r.id);
            return (
              <li key={r.id} className="rounded-2xl border border-white/[0.12] bg-tinta p-3">
                <div className="flex items-center gap-3">
                  <Ilustracao id={c.ilustracao} className="h-12 w-16 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-bold text-white">
                        {c.nome}
                        {c.nomeOriginal !== c.nome && (
                          <span className="ml-1.5 text-[11px] font-semibold text-slate-300">{c.nomeOriginal}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm font-extrabold text-areia">{semDados ? "—" : `${r.pct}%`}</span>
                    </div>
                    <div
                      role="meter"
                      aria-label={`${c.nome}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={r.pct ?? 0}
                      aria-valuetext={semDados ? "sem dados suficientes" : `${r.pct}%`}
                      className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"
                    >
                      <div className="h-full rounded-full bg-areia" style={{ width: `${r.pct ?? 0}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      {semDados ? "Sem dados suficientes: responda mais perguntas deste tema." : c.resumo}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pl-[76px]">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "abrirDesejo", id: r.id })}
                    className="lg-pill rounded-full px-3 py-1 text-[11px] font-semibold text-white"
                  >
                    Entender este tema
                  </button>
                  {!semDados && (
                    <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-300">
                      Mostrar no perfil
                      <Switch
                        size="sm"
                        checked={publico}
                        onChange={() => togglePublico(r.id)}
                        label={`Mostrar ${c.nome} no perfil`}
                      />
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-300">
          <strong className="text-white">Como calculamos:</strong> cada resposta vale pontos para os temas ligados a ela
          (régua 0 a 3, sim/talvez/não 2/1/0, cena escolhida 2). O percentual é o total obtido dividido pelo máximo
          possível nas perguntas que você respondeu. Perguntas puladas não contam, os temas não somam 100% e um tema com
          menos de {MINIMO_RESPONDIDAS} respostas fica sem percentual.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.12] pt-4">
          <button
            type="button"
            onClick={() => dispatch({ type: "refazerDesejos" })}
            className="lg-btn-primary rounded-full px-5 py-2.5 text-xs font-extrabold"
          >
            Refazer
          </button>
          <button
            type="button"
            onClick={apagar}
            className="lg-pill rounded-full px-5 py-2.5 text-xs font-semibold text-white"
          >
            {confirmarApagar ? "Toque de novo para apagar tudo" : "Apagar minhas respostas"}
          </button>
        </div>
      </section>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-300">
        Ter um desejo não é transtorno. Se algum tema te traz sofrimento, vale conversar com um profissional de saúde.{" "}
        <button
          type="button"
          onClick={() => dispatch({ type: "setTab", tab: "comunidade" })}
          className="font-semibold text-areia underline underline-offset-2"
        >
          Ir para Saúde
        </button>
      </p>
    </>
  );
}
