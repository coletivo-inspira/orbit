"use client";

import { useId, useRef, type ReactNode } from "react";
import { HubPreviewCard } from "@/components/perfil/HubPreviewCard";
import { AppBadgeIcon } from "@/components/ui/AppBadge";
import { Switch } from "@/components/ui/Switch";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { useToast } from "@/components/ui/Toasts";
import { prefersReducedMotion } from "@/lib/a11y/motion";
import { EXTERNAL_APP_LIST, EXTERNAL_APPS, INTENTION_LIST, INTENTIONS } from "@/lib/data/intentions";
import { labelOf, TOPICS } from "@/lib/data/profileOptions";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import { BIO_MAX_LENGTH, TOPICS_MAX } from "@/lib/state/reducer";
import type { AppId, IntentionId, TopicId } from "@/lib/types";

export function usePrivacyToggle() {
  const { state, dispatch } = useOrbit();
  const showToast = useToast();
  return () => {
    dispatch({ type: "togglePrivacy" });
    showToast(
      state.user.isPublic
        ? "Simulação: prévia marcada como Privada (só neste navegador) 🔒"
        : "Simulação: prévia marcada como Pública (só neste navegador) 🌐",
    );
  };
}

export function PerfilScreen() {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const showToast = useToast();
  const togglePrivacy = usePrivacyToggle();
  const isMobile = device === "mobile";
  const u = state.user;
  const ids = useId();
  const previewRef = useRef<HTMLHeadingElement>(null);
  const sectionRefs = useRef<Record<string, HTMLHeadingElement | null>>({});
  const bioCountId = `${ids}-bio-count`;
  const bioAtLimit = u.bio.length >= BIO_MAX_LENGTH;

  const goTo = (el: HTMLElement | null) => {
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
  };
  const showPreview = () => goTo(previewRef.current);

  const toggleIntention = (id: IntentionId) => {
    if (u.intentions.includes(id) && u.intentions.length <= 1) {
      showToast("Mantenha pelo menos uma intenção ativa no seu Hub.");
      return;
    }
    dispatch({ type: "toggleIntention", id });
  };

  const setPrimary = (id: IntentionId) => {
    dispatch({ type: "setPrimaryIntention", id });
    showToast(`Anel principal atualizado para ${INTENTIONS[id].label} ★`, "success");
  };

  const toggleApp = (id: AppId) => {
    const willBeActive = !u.apps[id].active;
    dispatch({ type: "toggleApp", id });
    showToast(
      willBeActive
        ? `Selo do ${EXTERNAL_APPS[id].name} ativado na prévia.`
        : `Selo do ${EXTERNAL_APPS[id].name} ocultado da prévia.`,
      willBeActive ? "success" : "info",
    );
  };

  const toggleTopic = (id: TopicId) => {
    if (!u.topics.includes(id) && u.topics.length >= TOPICS_MAX) {
      showToast(`Escolha até ${TOPICS_MAX} assuntos. Tire um para incluir ${labelOf(TOPICS, id)}.`);
      return;
    }
    dispatch({ type: "toggleTopic", id });
  };

  const sections = [
    { id: "cartao", label: "Seu cartão" },
    { id: "intencoes", label: "Intenções e selos" },
    { id: "assuntos", label: "Assuntos" },
    { id: "visibilidade", label: "Visibilidade" },
  ];

  const sectionHeading = (id: string, label: string) => (
    <h2
      id={`${ids}-${id}`}
      ref={(el) => {
        sectionRefs.current[id] = el;
      }}
      tabIndex={-1}
      className="text-base font-bold tracking-tight text-white"
    >
      {label}
    </h2>
  );

  const backToPreview = (
    <button
      type="button"
      onClick={showPreview}
      className="lg-btn-primary self-start rounded-full px-3.5 py-1.5 text-xs font-bold"
    >
      Ver prévia do cartão ↑
    </button>
  );

  return (
    <div className={`orbit-scroll h-full overflow-y-auto ${isMobile ? "p-3.5 pb-24" : "p-6"}`}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              tabIndex={-1}
              data-focus-fallback
              className={`${isMobile ? "text-lg" : "text-2xl"} font-bold tracking-tight text-white`}
            >
              Meu Perfil Hub
            </h1>
            <span className="rounded-full border border-areia/50 bg-areia/15 px-2.5 py-0.5 text-[11px] font-bold text-areia">
              Modo Explorar · simulação local
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Ainda não há contas nem link público: tudo o que você muda aqui fica só neste navegador e aparece na prévia
            do cartão. O Modo Explorar precisa de conexão e ainda não funciona offline.
          </p>
          <nav aria-label="Seções do Perfil Hub" className="mt-3 flex flex-wrap gap-1.5">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(s.id === "cartao" ? previewRef.current : sectionRefs.current[s.id])}
                className="lg-pill rounded-full px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        <div className={`grid items-start ${isMobile ? "grid-cols-1 gap-5" : "grid-cols-12 gap-5"}`}>
          <section
            aria-labelledby={`${ids}-cartao`}
            className={`${isMobile ? "" : "sticky top-0 col-span-5"} flex flex-col gap-3`}
          >
            {sectionHeading("cartao", "Seu cartão")}
            <HubPreviewCard user={u} headingRef={previewRef} headingId={`${ids}-preview`} />
            <Panel>
              <label htmlFor={`${ids}-bio`} className="text-sm font-bold text-white">
                Sua bio no cartão
              </label>
              <textarea
                id={`${ids}-bio`}
                rows={3}
                maxLength={BIO_MAX_LENGTH}
                value={u.bio}
                aria-describedby={bioCountId}
                onChange={(e) => dispatch({ type: "updateBio", bio: e.target.value })}
                placeholder="Conte um pouco sobre você..."
                className="mt-2 w-full resize-none rounded-2xl border border-white/20 bg-tinta px-3.5 py-2.5 text-sm text-white placeholder-slate-300"
              />
              <p
                id={bioCountId}
                aria-live="polite"
                className={`mt-1 text-right text-[11px] ${bioAtLimit ? "font-bold text-areia" : "text-slate-300"}`}
              >
                {bioAtLimit
                  ? `Limite de ${BIO_MAX_LENGTH} caracteres atingido.`
                  : `${u.bio.length} de ${BIO_MAX_LENGTH} caracteres`}
              </p>
            </Panel>
          </section>

          <div className={`${isMobile ? "" : "col-span-7"} flex flex-col gap-5`}>
            <section aria-labelledby={`${ids}-intencoes`} className="flex flex-col gap-3">
              {sectionHeading("intencoes", "Intenções e selos")}
              <Panel>
                <h3 className="font-sans text-sm font-bold text-white">O que você está buscando?</h3>
                <p className="mt-0.5 mb-3 text-xs text-slate-300">
                  Ative suas intenções. A estrela ★ escolhe a <strong className="text-white">intenção principal</strong>
                  , que vira a cor do anel do seu avatar na Órbita.
                </p>
                <ul className="flex flex-wrap gap-2">
                  {INTENTION_LIST.map((it) => {
                    const selected = u.intentions.includes(it.id);
                    const isPrimary = u.primaryIntention === it.id;
                    return (
                      <li
                        key={it.id}
                        className="inline-flex items-center overflow-hidden rounded-full border transition"
                        style={
                          selected
                            ? { background: it.bg, borderColor: it.border }
                            : { background: "rgb(245 240 231 / 5%)", borderColor: "rgb(245 240 231 / 18%)" }
                        }
                      >
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleIntention(it.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${selected ? "text-white" : "text-slate-300 hover:text-white"}`}
                        >
                          <span aria-hidden="true">{it.emoji}</span>
                          <span>{it.label}</span>
                        </button>
                        <button
                          type="button"
                          aria-pressed={isPrimary}
                          onClick={() => setPrimary(it.id)}
                          aria-label={`${it.label} como intenção principal`}
                          className={`border-l border-white/15 px-2.5 py-1.5 text-xs transition ${isPrimary ? "bg-white/15 text-areia" : "text-slate-300 hover:text-areia"}`}
                        >
                          {isPrimary ? "★" : "☆"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Panel>

              <Panel>
                <h3 className="font-sans text-sm font-bold text-white">Selos de outros aplicativos</h3>
                <p className="mt-0.5 mb-3 text-xs text-slate-300">
                  Autodeclarados. <strong className="text-white">Selo de presença</strong> só indica conta ativa (sem
                  link). <strong className="text-white">Selo com @</strong> mostra seu usuário e pode levar ao app.
                </p>
                <ul className="flex flex-col gap-2.5">
                  {EXTERNAL_APP_LIST.map((app) => {
                    const appState = u.apps[app.id];
                    return (
                      <li
                        key={app.id}
                        className={`rounded-2xl border p-3 transition ${
                          appState.active ? "border-white/[0.2] bg-tinta" : "border-white/[0.1] bg-tinta/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow"
                              style={{ background: app.bg, color: app.textColor }}
                            >
                              <AppBadgeIcon appId={app.id} className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-white">
                                {app.name}
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${app.noExternalLink ? "presenca-chip" : "border border-areia/50 text-areia"}`}
                                >
                                  {app.noExternalLink ? "Selo de presença" : "Selo com @"}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-300">
                                {appState.active ? "Aparece na prévia" : "Oculto"}
                              </div>
                            </div>
                          </div>
                          <Switch
                            size="sm"
                            checked={appState.active}
                            onChange={() => toggleApp(app.id)}
                            label={`Selo do ${app.name}`}
                          />
                        </div>
                        {appState.active && !app.noExternalLink && (
                          <div className="mt-2.5 pl-10">
                            <input
                              type="text"
                              value={appState.handle}
                              maxLength={40}
                              onChange={(e) =>
                                dispatch({ type: "updateAppHandle", id: app.id, handle: e.target.value })
                              }
                              placeholder={`Seu @usuário no ${app.name}`}
                              aria-label={`Seu usuário no ${app.name}`}
                              className="w-full rounded-xl border border-white/20 bg-noite px-3 py-1.5 text-sm text-white placeholder-slate-300"
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Panel>
              {backToPreview}
            </section>

            <section aria-labelledby={`${ids}-assuntos`} className="flex flex-col gap-3">
              {sectionHeading("assuntos", "Assuntos")}
              <Panel>
                <h3 className="font-sans text-sm font-bold text-white">Sobre o que você gosta de trocar ideia?</h3>
                <p className="mt-0.5 mb-3 text-xs text-slate-300">
                  Na Órbita, quem marcou os mesmos assuntos mostra “Em comum” e sobe para o centro quando você ordena
                  por <strong className="text-white">Afinidade</strong>.
                </p>
                <div role="group" aria-label="Seus assuntos" className="flex flex-wrap gap-1.5">
                  {TOPICS.map((topic) => (
                    <ToggleChip
                      key={topic.id}
                      pressed={u.topics.includes(topic.id)}
                      onToggle={() => toggleTopic(topic.id)}
                    >
                      {topic.label}
                    </ToggleChip>
                  ))}
                </div>
                <p className="mt-2 text-right text-[11px] text-slate-300" aria-live="polite">
                  {u.topics.length} de {TOPICS_MAX} assuntos
                </p>
              </Panel>
              {backToPreview}
            </section>

            <section aria-labelledby={`${ids}-visibilidade`} className="flex flex-col gap-3">
              {sectionHeading("visibilidade", "Visibilidade")}
              <Panel>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-white">
                      Perfil {u.isPublic ? "público" : "privado"}{" "}
                      <span className="font-semibold text-areia">(simulação local)</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-300">
                      {u.isPublic
                        ? "Com contas reais, apareceria na Órbita para outras pessoas."
                        : "Com contas reais, só conexões aprovadas veriam seus selos."}{" "}
                      No Modo Explorar, muda apenas a prévia neste navegador.
                    </p>
                  </div>
                  <Switch checked={u.isPublic} onChange={togglePrivacy} label="Perfil público (simulação local)" />
                </div>
              </Panel>
              {backToPreview}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="lg-panel rounded-[22px] p-4">{children}</div>;
}
