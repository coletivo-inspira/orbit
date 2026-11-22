"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AppTile } from "@/components/ui/AppBadge";
import { RingedAvatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toasts";
import { copyText } from "@/lib/clipboard";
import { activeAppIds, COMMUNITY_CATEGORIES, EXTERNAL_APPS, INTENTIONS } from "@/lib/data/intentions";
import { SIMULATED_PROFILES } from "@/lib/data/profiles";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import { COMMENT_MAX_LENGTH } from "@/lib/state/reducer";
import type { AppId, CommunityPost, Profile } from "@/lib/types";

/** Profile / article sheets rendered inside the current device screen. */
export function DeviceModals() {
  const { state, dispatch } = useOrbit();
  const close = () => dispatch({ type: "closeModals" });
  const open = Boolean(state.selectedProfileId || state.selectedArticleId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "closeModals" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dispatch]);

  const profile = state.selectedProfileId
    ? SIMULATED_PROFILES.find((p) => p.id === state.selectedProfileId)
    : undefined;
  const post = state.selectedArticleId ? state.posts.find((p) => p.id === state.selectedArticleId) : undefined;

  return (
    <div className={`absolute inset-0 z-40 ${open ? "" : "pointer-events-none"}`}>
      {profile && <ProfileSheet profile={profile} onClose={close} />}
      {post && <ArticleSheet post={post} onClose={close} />}
    </div>
  );
}

function ProfileSheet({ profile: p, onClose }: { profile: Profile; onClose: () => void }) {
  const { dispatch } = useOrbit();
  const { device } = useDevice();
  const showToast = useToast();
  const primary = INTENTIONS[p.primaryIntention] ?? INTENTIONS.troca;
  const apps = activeAppIds(p.apps);

  const wave = () => {
    onClose();
    showToast(`Você acenou para ${p.name}! 👋`, "success");
  };

  const onBadge = async (appId: AppId) => {
    const app = EXTERNAL_APPS[appId];
    const handle = p.apps[appId]?.handle ?? "";
    if (!handle) {
      showToast(`${p.name} confirmou presença ativa no ${app.name}! ✨`, "success");
      return;
    }
    const ok = await copyText(handle);
    showToast(ok ? `${handle} (${app.name}) copiado!` : handle, ok ? "success" : "info");
  };

  if (device === "watch") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Perfil de ${p.name}`}
        className="lg-sheet absolute inset-0 z-50 flex flex-col justify-between p-4"
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="lg-pill flex h-6 w-6 items-center justify-center rounded-full text-xs text-white"
          >
            ✕
          </button>
          <span className="text-[10px] font-bold text-slate-300">📍 {p.dist}</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <RingedAvatar cfg={p.avatar} color={primary.color} size={56} />
          <div className="mt-1.5 text-sm font-extrabold text-white">
            {p.name}, {p.age}
          </div>
          <span
            className="mt-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold"
            style={{ background: primary.bg, color: primary.color }}
          >
            {primary.emoji} {primary.label}
          </span>
          <div className="mt-2.5 flex items-center justify-center gap-1.5">
            {apps.map((id) => (
              <AppTile key={id} appId={id} className="h-6 w-6 rounded-lg" iconClassName="h-3.5 w-3.5" />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={wave}
          className="lg-btn-primary w-full rounded-full py-2.5 text-xs font-extrabold text-white active:scale-95"
        >
          Acenar 👋
        </button>
      </div>
    );
  }

  const isMobile = device === "mobile";
  return (
    <div
      onClick={onClose}
      className={`absolute inset-0 z-50 flex bg-slate-950/60 backdrop-blur-md ${isMobile ? "items-end p-2.5 pb-4" : "items-center justify-center p-6"}`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Perfil de ${p.name}`}
        onClick={(e) => e.stopPropagation()}
        className={`lg-sheet relative w-full overflow-hidden p-5 ${isMobile ? "rounded-[32px]" : "max-w-[430px] rounded-[30px]"}`}
      >
        <div
          className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full opacity-25 blur-3xl"
          style={{ background: primary.color }}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="lg-pill absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-sm text-white"
        >
          ✕
        </button>

        <div className="flex items-center gap-3.5">
          <RingedAvatar cfg={p.avatar} color={primary.color} size={64}>
            {p.online && (
              <span className="absolute right-0.5 bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
            )}
          </RingedAvatar>
          <div>
            <h3 className="text-lg leading-tight font-extrabold text-white">
              {p.name}, {p.age}
            </h3>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-300/85">
              <span>📍 {p.dist}</span>
              <span>·</span>
              <span className={p.online ? "font-semibold text-emerald-300" : "text-slate-400"}>
                {p.online ? "Online agora" : "Visto há pouco"}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-200/90">{p.bio}</p>

        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {p.intentions.map((id) => {
            const it = INTENTIONS[id];
            return (
              <span
                key={id}
                className="rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-md"
                style={{ background: it.bg, color: it.color, border: `1px solid ${it.border}` }}
              >
                {it.emoji} {it.label}
              </span>
            );
          })}
        </div>

        <div className="mt-4 border-t border-white/[0.12] pt-3.5">
          <div className="mb-2 text-[10px] font-bold tracking-wider text-slate-300/75 uppercase">
            Presença em outros aplicativos
          </div>
          <div className="flex flex-wrap gap-2">
            {apps.map((id) => {
              const handle = p.apps[id]?.handle ?? "";
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onBadge(id)}
                  className="lg-pill inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-left"
                >
                  <AppTile appId={id} className="h-5 w-5 rounded-md" />
                  <span className="text-[11px] font-bold text-white">{EXTERNAL_APPS[id].name}</span>
                  <span className={`text-[10px] ${handle ? "text-violet-200" : "text-emerald-200"}`}>
                    {handle || "Ativo"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`mt-5 grid gap-2.5 ${p.inPark ? "grid-cols-2" : "grid-cols-1"}`}>
          <button
            type="button"
            onClick={wave}
            className="lg-btn-primary rounded-full px-4 py-2.5 text-xs font-extrabold text-white active:scale-95"
          >
            Mandar um oi 👋
          </button>
          {p.inPark && (
            <button
              type="button"
              onClick={() => dispatch({ type: "setTab", tab: "parque" })}
              className="lg-pill rounded-full border-emerald-300/35 px-4 py-2.5 text-xs font-extrabold text-emerald-200 active:scale-95"
            >
              🌳 Ir pro Parque
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ArticleSheet({ post, onClose }: { post: CommunityPost; onClose: () => void }) {
  const { dispatch } = useOrbit();
  const { device } = useDevice();
  const showToast = useToast();
  const [comment, setComment] = useState("");
  const isMobile = device === "mobile";
  const category = COMMUNITY_CATEGORIES[post.category];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    dispatch({ type: "addComment", id: post.id, text: comment });
    setComment("");
    showToast("Comentário publicado na comunidade! 💬", "success");
  };

  const share = async () => {
    const ok = await copyText(`${window.location.origin}/comunidade/${post.id}`);
    showToast(ok ? "Link público do artigo copiado! 🔗" : "Não foi possível copiar o link.", ok ? "success" : "info");
  };

  return (
    <div
      onClick={onClose}
      className={`absolute inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md ${isMobile ? "p-2.5" : "p-6"}`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={post.title}
        onClick={(e) => e.stopPropagation()}
        className={`lg-sheet flex w-full flex-col overflow-hidden rounded-[30px] ${isMobile ? "max-h-[92%]" : "max-h-[88%] max-w-[620px]"}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.12] px-5 py-4">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${category.badge}`}>
            {category.label}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="lg-pill flex h-8 w-8 items-center justify-center rounded-full text-sm text-white"
          >
            ✕
          </button>
        </div>

        <div className="orbit-scroll flex-1 overflow-y-auto p-5">
          <h2 className={`${isMobile ? "text-base" : "text-xl"} leading-snug font-extrabold text-white`}>
            {post.title}
          </h2>
          <div className="mt-1.5 mb-4 text-xs text-slate-300/80">
            {post.author} · {post.date}
          </div>
          <div className="space-y-3 text-xs leading-relaxed text-slate-100/95 sm:text-[13px]">
            {post.content.map((par, i) => (
              <p key={i}>{par}</p>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-white/[0.12] pt-4">
            <button
              type="button"
              aria-pressed={post.liked}
              onClick={() => dispatch({ type: "togglePostLike", id: post.id })}
              className={`lg-pill flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${post.liked ? "border-rose-300/45 text-rose-200" : "text-slate-100"}`}
            >
              {post.liked ? "❤️ Curtido" : "🤍 Curtir"} ({post.likes})
            </button>
            <button
              type="button"
              onClick={share}
              className="lg-pill rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-100"
            >
              🔗 Compartilhar
            </button>
          </div>

          <div className="mt-5">
            <div className="mb-2.5 text-xs font-bold text-white">Comentários ({post.comments.length})</div>
            <div className="space-y-2.5">
              {post.comments.map((c, i) => (
                <div key={i} className="rounded-2xl border border-white/[0.11] bg-white/[0.06] p-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-violet-200">{c.author}</span>
                    <span className="text-slate-400">{c.time}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-100/90">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="flex shrink-0 items-center gap-2 border-t border-white/[0.12] bg-slate-950/45 p-3.5"
        >
          <input
            type="text"
            value={comment}
            maxLength={COMMENT_MAX_LENGTH}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Escreva um comentário..."
            aria-label="Novo comentário"
            className="flex-1 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-xs text-white placeholder-slate-300/75 outline-none focus:border-white/35"
          />
          <button type="submit" className="lg-btn-primary shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white">
            Publicar
          </button>
        </form>
      </div>
    </div>
  );
}
