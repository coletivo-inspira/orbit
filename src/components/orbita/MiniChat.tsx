"use client";

import { useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { MolduraDoUsuario } from "@/components/molduras/MolduraAvatar";
import { Avatar, RingedAvatar } from "@/components/ui/Avatar";
import { prefersReducedMotion } from "@/lib/a11y/motion";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { MINI_CHAT_MAX_LENGTH } from "@/lib/conversas";
import { INTENTIONS } from "@/lib/data/intentions";
import type { Point } from "@/lib/data/park";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { Profile } from "@/lib/types";

/** Comic-strip chat: both avatars side by side, each with only their last line. */
export function MiniChat({
  profile: p,
  origin,
  onClose,
}: {
  profile: Profile;
  origin: Point | null;
  onClose: () => void;
}) {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const isMobile = device === "mobile";
  const conversation = state.conversations[p.id] ?? { mine: null, theirs: null };
  const intention = INTENTIONS[p.primaryIntention];
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const onKeyDown = useDialogFocus(dialogRef, titleRef, onClose);
  const avatarSize = isMobile ? 104 : 120;

  // Grows out of the bubble that was tapped; the studio may scale the device, so convert viewport px to local px.
  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const stage = stageRef.current;
    if (!overlay || !stage || typeof stage.animate !== "function") return;
    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
    if (prefersReducedMotion() || !origin) return;
    const box = overlay.getBoundingClientRect();
    const ratio = overlay.offsetWidth ? box.width / overlay.offsetWidth : 1;
    const s = stage.getBoundingClientRect();
    const dx = (origin.x - (s.left + s.width / 2)) / ratio;
    const dy = (origin.y - (s.top + s.height / 2)) / ratio;
    stage.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(0.22)`, opacity: 0.4 },
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
      ],
      { duration: 460, easing: "cubic-bezier(0.22, 1.25, 0.36, 1)" },
    );
  }, [origin]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    dispatch({ type: "recordLine", id: p.id, from: "me", text });
    setDraft("");
    setStatus(`Seu balão agora diz: ${text.slice(0, MINI_CHAT_MAX_LENGTH)}`);
  };

  return (
    <div
      ref={overlayRef}
      onClick={onClose}
      className={`absolute inset-0 z-50 flex items-center justify-center bg-tinta/85 ${isMobile ? "p-3 pb-6" : "p-6"}`}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="orbit-scroll flex max-h-full w-full max-w-[440px] flex-col gap-3 overflow-y-auto outline-none"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 ref={titleRef} id={titleId} tabIndex={-1} className="text-base font-bold text-white outline-none">
            Você e {p.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar mini chat"
            className="lg-pill flex h-8 w-8 items-center justify-center rounded-full text-sm text-white"
          >
            ✕
          </button>
        </div>

        <div ref={stageRef} className="grid grid-cols-2 items-stretch gap-3 pt-1">
          <ComicSpeaker
            label="Você"
            line={conversation.mine}
            emptyNote="Você ainda não falou"
            delay={180}
            avatar={
              <MolduraDoUsuario size={avatarSize} sombra="0 14px 30px rgba(0,0,0,0.5)">
                <Avatar cfg={state.user.avatar} />
              </MolduraDoUsuario>
            }
          />
          <ComicSpeaker
            label={p.name}
            line={conversation.theirs}
            emptyNote="Ainda não respondeu"
            delay={300}
            avatar={<RingedAvatar cfg={p.avatar} photo={p.photo} color={intention.color} size={avatarSize} ring={3} />}
          />
        </div>

        <form
          onSubmit={send}
          className="lg-pill mt-1 flex h-11 items-center gap-2 rounded-full pr-1.5 pl-4 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-marfim"
        >
          <input
            type="text"
            value={draft}
            maxLength={MINI_CHAT_MAX_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Responder (troca o seu balão)…"
            aria-label={`Responder para ${p.name}. Sua nova fala substitui a anterior.`}
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-slate-300 focus-visible:outline-none"
          />
          <button type="submit" className="lg-btn-primary shrink-0 rounded-full px-4 py-1.5 text-xs font-bold">
            Enviar
          </button>
        </form>
        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: "openProfile", id: p.id })}
            className="lg-pill flex-1 rounded-full px-4 py-2 text-xs font-bold text-white"
          >
            Ver perfil
          </button>
          {p.inPark && (
            <button
              type="button"
              onClick={() => dispatch({ type: "setTab", tab: "parque" })}
              className="lg-pill flex-1 rounded-full px-4 py-2 text-xs font-bold text-white"
            >
              🌳 Conversar no Parque
            </button>
          )}
        </div>

        <SecurityNote />
      </div>
    </div>
  );
}

function ComicSpeaker({
  label,
  line,
  emptyNote,
  delay,
  avatar,
}: {
  label: string;
  line: string | null;
  emptyNote: string;
  delay: number;
  avatar: React.ReactNode;
}) {
  return (
    <div className="grid grid-rows-[1fr_auto_auto] justify-items-center gap-3">
      <p
        key={line ?? "vazio"}
        className={`hq-speech hq-speech-pop flex min-h-[64px] w-full items-center justify-center self-end rounded-[20px] px-3 py-2.5 text-center text-sm leading-snug font-semibold ${
          line ? "hq-speech-filled text-tinta" : "hq-speech-empty"
        }`}
        style={{ animationDelay: `${delay}ms` }}
      >
        {line ? `“${line}”` : <span className="sr-only">{emptyNote}</span>}
      </p>
      <div className="relative" aria-hidden="true">
        {avatar}
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="rounded-full border border-white/25 bg-noite px-2.5 py-0.5 text-[11px] font-extrabold text-white">
          {label}
        </span>
        <span className={`min-h-[15px] text-[10px] text-slate-300 ${line ? "invisible" : ""}`} aria-hidden="true">
          {emptyNote}
        </span>
      </div>
    </div>
  );
}

function SecurityNote() {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  return (
    <section
      aria-label="Privacidade da conversa"
      className="lg-panel rounded-[20px] p-3 text-[11px] leading-relaxed text-slate-300"
    >
      <p className="flex items-start gap-2">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-areia"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <span>
          <strong className="font-bold text-white">Você só vê as 2 últimas falas.</strong> O Orbit guarda um registro
          criptografado que ninguém lê no dia a dia, aberto só em caso de denúncia ou ordem judicial.
        </span>
      </p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((o) => !o)}
        className="mt-1.5 ml-6 font-bold text-areia underline underline-offset-2"
      >
        {open ? "Esconder detalhes" : "Saiba mais"}
      </button>
      <ul id={detailsId} hidden={!open} className="mt-2 ml-6 flex list-disc flex-col gap-1.5 pl-3">
        <li>
          <strong className="text-white">O que você vê:</strong> só a última fala de cada um. Não existe histórico para
          rolar.
        </li>
        <li>
          <strong className="text-white">O que fica guardado:</strong> a conversa completa, criptografada (AES-256), por
          um prazo limitado definido na política de privacidade.
        </li>
        <li>
          <strong className="text-white">Quando é aberto:</strong> para apurar uma denúncia feita por alguém da conversa
          ou por ordem judicial. Cada acesso fica registrado.
        </li>
        <li>
          <strong className="text-white">Não é ponta a ponta:</strong> o Orbit precisa conseguir abrir o registro nesses
          casos, então não prometemos criptografia de ponta a ponta.
        </li>
        <li>
          <strong className="text-white">Modo Explorar:</strong> esta demonstração não tem servidor. O registro é
          cifrado só na memória deste aparelho e some quando você fecha a aba.
        </li>
      </ul>
    </section>
  );
}
