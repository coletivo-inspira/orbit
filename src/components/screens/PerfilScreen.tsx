"use client";

import { HubPreviewCard } from "@/components/perfil/HubPreviewCard";
import { AppBadgeIcon } from "@/components/ui/AppBadge";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toasts";
import { copyText } from "@/lib/clipboard";
import { EXTERNAL_APP_LIST, EXTERNAL_APPS, INTENTION_LIST, INTENTIONS } from "@/lib/data/intentions";
import { profileSlug } from "@/lib/data/user";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import { BIO_MAX_LENGTH } from "@/lib/state/reducer";
import type { AppId, IntentionId } from "@/lib/types";

export function usePrivacyToggle() {
  const { state, dispatch } = useOrbit();
  const showToast = useToast();
  return () => {
    dispatch({ type: "togglePrivacy" });
    showToast(
      state.user.isPublic ? "Perfil alterado para Modo Privado 🔒" : "Seu perfil agora está Público na Órbita 🌐",
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

  const toggleIntention = (id: IntentionId) => {
    if (u.intentions.includes(id) && u.intentions.length <= 1) {
      showToast("Mantenha pelo menos uma tag ativa no seu Hub.");
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
        ? `Selo do ${EXTERNAL_APPS[id].name} ativado no seu Hub!`
        : `Selo do ${EXTERNAL_APPS[id].name} ocultado.`,
      willBeActive ? "success" : "info",
    );
  };

  const copyLink = async () => {
    const ok = await copyText(`orbit.app/${profileSlug(u.handle)}`);
    showToast(ok ? "Link do seu Orbit copiado! 🔗" : "Não foi possível copiar o link.", ok ? "success" : "info");
  };

  return (
    <div className={`orbit-scroll h-full overflow-y-auto ${isMobile ? "p-3.5 pb-24" : "p-6"}`}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-4">
          <h1 className={`${isMobile ? "text-base" : "text-xl"} font-extrabold tracking-tight text-white`}>
            Meu Perfil Hub
          </h1>
          <p className="mt-0.5 text-xs text-slate-300/80">
            Centralize seus aplicativos, intenções e controle de privacidade em um só cartão.
          </p>
        </div>

        <div className={`grid items-start ${isMobile ? "grid-cols-1 gap-4" : "grid-cols-12 gap-5"}`}>
          <div className={`${isMobile ? "" : "sticky top-0 col-span-5"} flex flex-col gap-3`}>
            <div className="text-[11px] font-bold tracking-wider text-slate-300/75 uppercase">
              Prévia ao vivo do seu cartão
            </div>
            <HubPreviewCard user={u} />
          </div>

          <div className={`${isMobile ? "" : "col-span-7"} flex flex-col gap-3.5`}>
            <div className="lg-panel flex items-center justify-between gap-3 rounded-[22px] p-4">
              <div>
                <div className="text-sm font-bold text-white">Visibilidade do Perfil</div>
                <p className="mt-0.5 text-xs text-slate-300/80">
                  {u.isPublic
                    ? "Público: visível na Órbita e via link compartilhável."
                    : "Privado: apenas conexões aprovadas veem seus selos."}
                </p>
              </div>
              <Switch checked={u.isPublic} onChange={togglePrivacy} label="Perfil público" />
            </div>

            <div className="lg-panel rounded-[22px] p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label htmlFor="user-bio-input" className="text-sm font-bold text-white">
                  Sua Bio no Hub
                </label>
                <button
                  type="button"
                  onClick={copyLink}
                  className="lg-pill rounded-full px-3 py-1 text-[11px] font-bold text-white"
                >
                  🔗 Copiar Link
                </button>
              </div>
              <textarea
                id="user-bio-input"
                rows={2}
                maxLength={BIO_MAX_LENGTH}
                value={u.bio}
                onChange={(e) => dispatch({ type: "updateBio", bio: e.target.value })}
                placeholder="Conte um pouco sobre você..."
                className="w-full resize-none rounded-2xl border border-white/15 bg-slate-950/45 px-3.5 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-white/35"
              />
              <div className="mt-1 text-right text-[10px] text-slate-400">
                {u.bio.length}/{BIO_MAX_LENGTH}
              </div>
            </div>

            <div className="lg-panel rounded-[22px] p-4">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-sm font-bold text-white">O que você está buscando?</div>
                <span className="text-[10px] text-slate-300/75">★ = cor do anel na Órbita</span>
              </div>
              <p className="mb-3 text-xs text-slate-300/80">
                Ative suas tags ou clique na estrela para escolher a cor principal do seu anel.
              </p>
              <div className="flex flex-wrap gap-2">
                {INTENTION_LIST.map((it) => {
                  const selected = u.intentions.includes(it.id);
                  const isPrimary = u.primaryIntention === it.id;
                  return (
                    <div
                      key={it.id}
                      className="inline-flex items-center overflow-hidden rounded-full border backdrop-blur-md transition"
                      style={
                        selected
                          ? { background: it.bg, borderColor: it.border }
                          : { background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }
                      }
                    >
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleIntention(it.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${selected ? "text-white" : "text-slate-300 hover:text-white"}`}
                      >
                        <span>{it.emoji}</span>
                        <span>{it.label}</span>
                      </button>
                      <button
                        type="button"
                        aria-pressed={isPrimary}
                        onClick={() => setPrimary(it.id)}
                        title="Definir como anel principal na Órbita"
                        aria-label={`Definir ${it.label} como anel principal`}
                        className={`border-l border-white/15 px-2.5 py-1.5 text-xs transition ${isPrimary ? "bg-white/15 text-amber-200" : "text-slate-400 hover:text-amber-200"}`}
                      >
                        {isPrimary ? "★" : "☆"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg-panel rounded-[22px] p-4">
              <div className="text-sm font-bold text-white">Centralizador de Aplicativos & Redes</div>
              <p className="mt-0.5 mb-3 text-xs text-slate-300/80">
                Apps fechados (como Grindr e Scruff) funcionam como selos de presença ativa sem precisar de link
                externo.
              </p>
              <div className="flex flex-col gap-2.5">
                {EXTERNAL_APP_LIST.map((app) => {
                  const appState = u.apps[app.id];
                  return (
                    <div
                      key={app.id}
                      className={`rounded-2xl border p-3 transition ${
                        appState.active
                          ? "border-white/[0.18] bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                          : "border-white/[0.08] bg-white/[0.03] opacity-75"
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
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                              {app.name}
                              {app.noExternalLink && appState.active && (
                                <span className="rounded-full border border-emerald-300/30 bg-emerald-400/20 px-2 py-0.5 text-[9px] font-bold text-emerald-200">
                                  Ativo no app
                                </span>
                              )}
                            </div>
                            <div className="truncate text-[10px] text-slate-300/75">{app.desc}</div>
                          </div>
                        </div>
                        <Switch
                          size="sm"
                          checked={appState.active}
                          onChange={() => toggleApp(app.id)}
                          label={`Selo do ${app.name}`}
                          onClass="bg-violet-400/80"
                        />
                      </div>
                      {appState.active && !app.noExternalLink && (
                        <div className="mt-2.5 pl-10">
                          <input
                            type="text"
                            value={appState.handle}
                            maxLength={40}
                            onChange={(e) => dispatch({ type: "updateAppHandle", id: app.id, handle: e.target.value })}
                            placeholder={`Seu @usuário no ${app.name}`}
                            aria-label={`Seu usuário no ${app.name}`}
                            className="w-full rounded-xl border border-white/15 bg-slate-950/45 px-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none focus:border-white/35"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
