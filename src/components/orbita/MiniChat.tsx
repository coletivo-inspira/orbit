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

const QUICK_REPLIES = ["Oi! 👋", "Tudo bem por aí?", "Curti seu perfil ✨", "Bora conversar no Parque? 🌳"];

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
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const counterId = useId();
  // On the phone, focusing the field would pop the keyboard over the conversation before it is read.
  const onKeyDown = useDialogFocus(dialogRef, isMobile ? titleRef : inputRef, onClose);
  const avatarSize = isMobile ? 76 : 96;

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

  const say = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    dispatch({ type: "recordLine", id: p.id, from: "me", text });
    setDraft("");
    setStatus(`Seu balão agora diz: ${text.slice(0, MINI_CHAT_MAX_LENGTH)}`);
  };
  const send = (e: FormEvent) => {
    e.preventDefault();
    say(draft);
  };
  const left = MINI_CHAT_MAX_LENGTH - draft.length;

  return (
    <div
      ref={overlayRef}
      onClick={onClose}
      className={`absolute inset-0 z-50 flex justify-center bg-tinta/80 backdrop-blur-sm ${isMobile ? "items-end p-2 pb-3" : "items-center p-6"}`}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="lg-sheet orbit-scroll flex max-h-full w-full max-w-[440px] flex-col overflow-y-auto rounded-[28px] outline-none"
      >
        <div className="flex items-center gap-2.5 border-b border-white/[0.12] px-4 py-3">
          <RingedAvatar cfg={p.avatar} photo={p.photo} color={intention.color} online={p.online} size={40} halo={false}>
            {p.online && (
              <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-noite bg-emerald-400" />
            )}
          </RingedAvatar>
          <div className="min-w-0 flex-1">
            <h2
              ref={titleRef}
              id={titleId}
              tabIndex={-1}
              className="truncate text-sm font-bold text-white outline-none"
            >
              Você e {p.name}
            </h2>
            <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-300">
              <span style={{ color: intention.text }}>
                {intention.emoji} {intention.label}
              </span>
              <span aria-hidden="true">·</span>
              <span>📍 {p.dist}</span>
              {p.online && <span>· online</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: "openProfile", id: p.id })}
            className="lg-pill shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold text-white"
          >
            Perfil
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar mini chat"
            className="lg-pill flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm text-white"
          >
            ✕
          </button>
        </div>

        <div ref={stageRef} className="grid grid-cols-2 items-stretch gap-3 px-4 pt-4 pb-2">
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
            avatar={
              <RingedAvatar
                cfg={p.avatar}
                photo={p.photo}
                color={intention.color}
                online={p.online}
                size={avatarSize}
              />
            }
          />
        </div>

        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-white/[0.12] bg-tinta/95 px-3 pt-2.5 pb-3">
          <div
            role="group"
            aria-label="Respostas rápidas"
            className={`flex gap-1.5 ${isMobile ? "orbit-scroll -mx-3 overflow-x-auto px-3 pb-0.5" : "flex-wrap"}`}
          >
            {QUICK_REPLIES.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => say(text)}
                className="lg-pill shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap text-white"
              >
                {text}
              </button>
            ))}
          </div>
          <form
            onSubmit={send}
            className="lg-pill flex h-11 items-center gap-2 rounded-full pr-1.5 pl-4 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-marfim"
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              maxLength={MINI_CHAT_MAX_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Sua fala (troca o seu balão)…"
              aria-label={`Responder para ${p.name}. Sua nova fala substitui a anterior.`}
              aria-describedby={counterId}
              enterKeyHint="send"
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-slate-300 focus-visible:outline-none"
            />
            <span
              id={counterId}
              className={`shrink-0 text-[10px] tabular-nums ${left <= 10 ? "text-amber-200" : "text-slate-300"} ${draft ? "" : "invisible"}`}
            >
              {left}
              <span className="sr-only"> caracteres restantes</span>
            </span>
            <button
              type="submit"
              disabled={!draft.trim()}
              className="lg-btn-primary shrink-0 rounded-full px-4 py-1.5 text-xs font-bold disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
          <p role="status" aria-live="polite" className="sr-only">
            {status}
          </p>
          {p.inPark && (
            <button
              type="button"
              onClick={() => dispatch({ type: "setTab", tab: "parque" })}
              className="lg-pill rounded-full px-4 py-2 text-xs font-bold text-white"
            >
              🌳 {p.name} está no Parque · conversar lá
            </button>
          )}
          <SecurityNote />
        </div>
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
    <section aria-label="Privacidade da conversa" className="px-1 text-[11px] leading-relaxed text-slate-300">
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
          <strong className="font-bold text-white">Só as 2 últimas falas ficam visíveis.</strong> O registro
          criptografado só é aberto em caso de denúncia ou ordem judicial.{" "}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((o) => !o)}
            className="font-bold text-areia underline underline-offset-2"
          >
            {open ? "Esconder detalhes" : "Saiba mais"}
          </button>
        </span>
      </p>
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
