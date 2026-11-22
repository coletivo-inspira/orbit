"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar, RingedAvatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toasts";
import { INTENTIONS } from "@/lib/data/intentions";
import { PARK_BOTS } from "@/lib/data/park";
import { SIMULATED_PROFILES } from "@/lib/data/profiles";
import { Park2DEngine, type ActiveBotInfo, type Direction } from "@/lib/engines/park2d";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";

const CHAT_MAX_LENGTH = 75;

export function ParqueScreen() {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const showToast = useToast();
  const isMobile = device === "mobile";
  const showDpad = isMobile || state.showDesktopDpad;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Park2DEngine | null>(null);
  const [activeBot, setActiveBot] = useState<ActiveBotInfo | null>(null);
  const [chat, setChat] = useState("");

  // The engine runs outside React; read the latest values through a ref instead of restarting it.
  const live = useRef({ state, dispatch, showToast });
  useEffect(() => {
    live.current = { state, dispatch, showToast };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const engine = new Park2DEngine(canvas, wrap, {
      onActiveBotChange: setActiveBot,
      onToast: (msg, type) => live.current.showToast(msg, type),
      onFoundPacoca: () => {
        live.current.state = { ...live.current.state, foundPacoca: true };
        live.current.dispatch({ type: "foundPacoca" });
      },
      getFoundPacoca: () => live.current.state.foundPacoca,
      getPlayerLook: () => {
        const { firstName, avatar } = live.current.state.user;
        return { firstName, skin: avatar.skin, hair: avatar.hair };
      },
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const onChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!chat.trim()) return;
    engineRef.current?.say(chat);
    setChat("");
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const pressDpad = (dir: Direction, pressed: boolean) => engineRef.current?.setDpad(dir, pressed);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#1b2e1e]">
      <div ref={wrapRef} className="relative min-h-0 w-full flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="pixel-canvas block h-full w-full cursor-pointer touch-none"
          aria-label="Parque Central Orbit — sala 2D interativa"
        />

        <div className="pointer-events-none absolute top-3 right-3 left-3 z-10 flex items-start justify-between gap-2">
          <div className="lg-bar pointer-events-auto flex items-center gap-2 rounded-full px-3.5 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span className={`${isMobile ? "text-[11px]" : "text-xs"} font-bold text-white`}>Parque Central Orbit</span>
            <span className="text-[11px] font-semibold text-emerald-200">· {PARK_BOTS.length} online</span>
          </div>
          {!isMobile && (
            <div className="flex items-center gap-2">
              <div className="lg-bar rounded-full px-3.5 py-1.5 text-[11px] text-slate-100">
                🎮 <strong className="text-white">WASD</strong> / Setas ou{" "}
                <strong className="text-white">clique/arraste</strong> no chão
              </div>
              <button
                type="button"
                aria-pressed={state.showDesktopDpad}
                onClick={() => dispatch({ type: "toggleDesktopDpad" })}
                title="Mostrar/ocultar direcional na tela"
                className={`lg-pill pointer-events-auto rounded-full px-3 py-1.5 text-[11px] font-semibold text-white transition ${state.showDesktopDpad ? "lg-active-lens" : ""}`}
              >
                🕹️ D-Pad
              </button>
            </div>
          )}
        </div>

        {isMobile && (
          <div className="lg-bar pointer-events-none absolute top-[50px] left-3 z-10 rounded-full px-3 py-1 text-[10px] text-white/95">
            👆 Toque/arraste no chão ou use o direcional
          </div>
        )}

        {showDpad && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 select-none">
            <div className="lg-bar grid h-[108px] w-[108px] grid-cols-3 gap-1 rounded-[26px] p-1.5">
              <div />
              <DpadButton dir="up" label="Andar para cima" path="m18 15-6-6-6 6" onPress={pressDpad} />
              <div />
              <DpadButton dir="left" label="Andar para esquerda" path="m15 18-6-6 6-6" onPress={pressDpad} />
              <div className="m-1.5 rounded-full border border-white/20 bg-white/15" />
              <DpadButton dir="right" label="Andar para direita" path="m9 18 6-6-6-6" onPress={pressDpad} />
              <div />
              <DpadButton dir="down" label="Andar para baixo" path="m6 9 6 6 6-6" onPress={pressDpad} />
              <div />
            </div>
          </div>
        )}

        {activeBot && (
          <BotCard
            bot={activeBot}
            isMobile={isMobile}
            onOpenProfile={() => dispatch({ type: "openProfile", id: activeBot.id })}
            onContinue={() => engineRef.current?.cycleBotDialogue(activeBot.id)}
          />
        )}
      </div>

      <div
        className={`z-20 shrink-0 border-t border-white/15 backdrop-blur-2xl ${isMobile ? "bg-slate-950/75 px-3 pt-2 pb-[86px]" : "bg-slate-950/65 px-3 py-2"}`}
      >
        <form onSubmit={onChatSubmit} className="lg-pill flex h-10 items-center gap-2 rounded-full px-2">
          <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/35">
            <Avatar cfg={state.user.avatar} />
          </div>
          <input
            type="text"
            value={chat}
            maxLength={CHAT_MAX_LENGTH}
            onChange={(e) => setChat(e.target.value)}
            placeholder="Falar no Parque (aparece sobre seu boneco)..."
            aria-label="Mensagem no Parque"
            className="flex-1 bg-transparent px-1.5 py-1 text-xs text-white placeholder-slate-300/75 outline-none"
          />
          <button
            type="submit"
            className="lg-btn-primary shrink-0 rounded-full px-3.5 py-1 text-xs font-bold text-white active:scale-95"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}

function DpadButton({
  dir,
  label,
  path,
  onPress,
}: {
  dir: Direction;
  label: string;
  path: string;
  onPress: (dir: Direction, pressed: boolean) => void;
}) {
  const release = () => onPress(dir, false);
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPress(dir, true);
      }}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      className="pointer-events-auto flex touch-none items-center justify-center rounded-xl border border-white/25 bg-white/[0.12] text-white shadow-xs transition hover:bg-white/[0.24] active:bg-violet-400/60"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={path} />
      </svg>
    </button>
  );
}

function BotCard({
  bot,
  isMobile,
  onOpenProfile,
  onContinue,
}: {
  bot: ActiveBotInfo;
  isMobile: boolean;
  onOpenProfile: () => void;
  onContinue: () => void;
}) {
  const profile = SIMULATED_PROFILES.find((p) => p.id === bot.id);
  const intention = profile ? INTENTIONS[profile.primaryIntention] : INTENTIONS.troca;
  return (
    <div
      className={`lg-sheet pointer-events-auto absolute z-20 rounded-[22px] p-3.5 transition-all ${isMobile ? "right-3 bottom-[124px] left-3" : "right-4 bottom-4 w-[360px] max-w-[46%]"}`}
    >
      <div className="flex items-start gap-3">
        {profile && <RingedAvatar cfg={profile.avatar} color={intention.color} size={44} ring={2} halo={false} />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-white">
              <span>{bot.name}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                style={{ background: intention.bg, color: intention.color }}
              >
                {intention.emoji} {intention.short}
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenProfile}
              className="lg-pill shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
            >
              Ver Perfil
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-snug text-slate-100/95">&ldquo;{bot.line}&rdquo;</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-emerald-300/90">● Perto de você no Parque</span>
            <button
              type="button"
              onClick={onContinue}
              className="text-[10px] font-bold text-violet-200 transition hover:text-white"
            >
              Continuar papo →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
