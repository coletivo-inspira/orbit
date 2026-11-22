"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { WorldMapPicker } from "@/components/parque/WorldMapPicker";
import { Avatar, RingedAvatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toasts";
import { prefersReducedMotion } from "@/lib/a11y/motion";
import { INTENTIONS } from "@/lib/data/intentions";
import { loadRoomMap } from "@/lib/data/park-rooms";
import { findCityRoom, type ParkRoomDefinition } from "@/lib/data/parkRooms";
import { SIMULATED_PROFILES } from "@/lib/data/profiles";
import {
  Park2DEngine,
  type ActiveBotInfo,
  type Direction,
  type Proximity,
  type RosterEntry,
} from "@/lib/engines/park2d";
import { CentralParkScene } from "@/lib/engines/scenes/centralPark";
import { ClayCityScene } from "@/lib/engines/scenes/clayCity";
import type { ParkScene } from "@/lib/engines/scenes/types";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import { CloseButton } from "@/components/ui/Button";

const CHAT_MAX_LENGTH = 75;

const PROXIMITY_LABEL: Record<Proximity, string> = {
  perto: "Perto de você",
  caminho: "A alguns passos",
  longe: "Mais longe",
};

export function ParqueScreen() {
  const { state } = useOrbit();
  if (!state.parkRoomId) return <WorldMapPicker />;
  return <ParkRoom key={state.parkRoomId} room={findCityRoom(state.parkRoomId)} />;
}

/** Loads the room's scene: the pilot park right away, a city room from its OpenStreetMap snapshot. */
function ParkRoom({ room }: { room: ParkRoomDefinition | null }) {
  const { dispatch } = useOrbit();
  const [scene, setScene] = useState<ParkScene | null>(() => (room ? null : new CentralParkScene()));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!room) return;
    let alive = true;
    loadRoomMap(room.id)
      .then((data) => alive && setScene(new ClayCityScene(room, data)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [room, attempt]);

  if (scene) return <ParkRoomView scene={scene} room={room} />;
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 bg-tinta px-6 text-center">
      <div className="clay-loader h-14 w-14 rounded-full" aria-hidden="true" />
      <div role="status" aria-live="polite" className="flex flex-col gap-1">
        <h1 className="text-sm font-bold text-white">
          {failed ? "Não deu para abrir essa sala agora." : `Modelando ${room?.city} em massinha…`}
        </h1>
        <p className="text-xs text-marfim-suave">
          {failed ? "Verifique sua conexão e tente de novo." : "Ruas, quadras e árvores vêm do mapa real da região."}
        </p>
      </div>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        {failed && (
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((a) => a + 1);
            }}
            className="lg-btn-primary rounded-full px-4 min-h-9 py-1.5 text-xs font-bold"
          >
            Tentar de novo
          </button>
        )}
        <button
          type="button"
          onClick={() => dispatch({ type: "leaveParkRoom" })}
          className="lg-pill rounded-full px-4 min-h-9 py-1.5 text-xs font-bold text-white"
        >
          ← Voltar ao mapa-múndi
        </button>
      </div>
    </div>
  );
}

function ParkRoomView({ scene, room }: { scene: ParkScene; room: ParkRoomDefinition | null }) {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const showToast = useToast();
  const isMobile = device === "mobile";
  const showDpad = isMobile || state.showDesktopDpad;
  const ids = useId();
  const title = room ? room.name : "Parque Central Orbit";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Park2DEngine | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const peopleToggleRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardHadFocus = useRef(false);
  const pendingFocusBot = useRef<string | null>(null);
  const [activeBot, setActiveBot] = useState<ActiveBotInfo | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [peopleOpen, setPeopleOpen] = useState(!isMobile);
  const [chat, setChat] = useState("");
  const [announcement, setAnnouncement] = useState("");

  // The engine runs outside React; read the latest values through a ref instead of restarting it.
  const live = useRef({ state, dispatch, showToast });
  useEffect(() => {
    live.current = { state, dispatch, showToast };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const engine = new Park2DEngine(canvas, wrap, scene, {
      onActiveBotChange: setActiveBot,
      onRosterChange: setRoster,
      reducedMotion: prefersReducedMotion,
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
    if (!document.activeElement || document.activeElement === document.body) headingRef.current?.focus();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [scene]);

  // A card opened from the people list takes focus; a card that vanishes while focused hands focus to a stable control.
  useEffect(() => {
    if (activeBot && pendingFocusBot.current === activeBot.id) {
      pendingFocusBot.current = null;
      continueRef.current?.focus();
      return;
    }
    if (!activeBot && cardHadFocus.current) {
      cardHadFocus.current = false;
      const active = document.activeElement;
      if (!active || active === document.body || !active.isConnected) {
        (peopleToggleRef.current ?? canvasRef.current)?.focus();
      }
    }
  }, [activeBot]);

  // What the person nearby says becomes their balloon on the Órbita.
  const activeId = activeBot?.id;
  const activeLine = activeBot?.line;
  useEffect(() => {
    if (activeId && activeLine) dispatch({ type: "recordLine", id: activeId, from: "them", text: activeLine });
  }, [activeId, activeLine, dispatch]);

  const onChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    const message = chat.trim();
    if (!message) return;
    engineRef.current?.say(message);
    if (activeBot) {
      dispatch({ type: "recordLine", id: activeBot.id, from: "me", text: message });
      engineRef.current?.cycleBotDialogue(activeBot.id);
    }
    setChat("");
    setAnnouncement(`Mensagem enviada no Parque (simulação): ${message}`);
  };

  const talkTo = (id: string) => {
    pendingFocusBot.current = id;
    if (isMobile) setPeopleOpen(false);
    engineRef.current?.talkTo(id);
  };

  const endConversation = () => {
    engineRef.current?.endConversation();
    cardHadFocus.current = false;
    (peopleToggleRef.current ?? canvasRef.current)?.focus();
  };

  const pressDpad = (dir: Direction, pressed: boolean) => engineRef.current?.setDpad(dir, pressed);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden" style={{ background: scene.background }}>
      <div ref={wrapRef} className="relative min-h-0 w-full flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="application"
          aria-roledescription="mapa"
          aria-label={room ? `Mapa da sala ${room.name}, ${room.city}` : "Mapa do Parque Central Orbit"}
          aria-describedby={`${ids}-controls`}
          className="pixel-canvas block h-full w-full cursor-pointer touch-none outline-offset-[-4px]"
        />

        <div className="pointer-events-none absolute top-3 right-3 left-3 z-10 flex flex-col items-start gap-2">
          <div className="flex w-full flex-wrap items-start justify-between gap-2">
            <div className="lg-bar pointer-events-auto flex min-w-0 items-center gap-2 rounded-full py-1 pr-3.5 pl-1">
              <button
                type="button"
                onClick={() => dispatch({ type: "leaveParkRoom" })}
                aria-label="Voltar ao mapa-múndi"
                title="Voltar ao mapa-múndi"
                className="lg-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-full after:absolute after:-inset-1 after:content-[''] text-sm text-white"
              >
                <span aria-hidden="true">🌍</span>
              </button>
              <h1
                ref={headingRef}
                tabIndex={-1}
                data-focus-fallback
                className={`${isMobile ? "text-[12px]" : "text-sm"} min-w-0 truncate font-bold tracking-tight text-white`}
              >
                {room && <span aria-hidden="true">{room.flag} </span>}
                {title}
              </h1>
              <span className="presenca-chip shrink-0 rounded-full px-2 py-0.5 text-xs font-bold">
                {scene.bots.length} online
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                ref={peopleToggleRef}
                type="button"
                aria-expanded={peopleOpen}
                aria-controls={`${ids}-people`}
                onClick={() => setPeopleOpen((o) => !o)}
                className="lg-bar pointer-events-auto rounded-full px-3 min-h-9 py-1.5 text-xs font-semibold text-white"
              >
                👥 Pessoas ({roster.length || scene.bots.length})
              </button>
              {!isMobile && (
                <button
                  type="button"
                  aria-pressed={state.showDesktopDpad}
                  onClick={() => dispatch({ type: "toggleDesktopDpad" })}
                  className={`lg-bar pointer-events-auto rounded-full px-3 min-h-9 py-1.5 text-xs font-semibold text-white ${state.showDesktopDpad ? "lg-active-lens" : ""}`}
                >
                  🕹️ Direcional
                </button>
              )}
            </div>
          </div>
          <p id={`${ids}-controls`} className="lg-bar rounded-full px-3 py-1 text-xs text-white">
            {isMobile
              ? "Toque no chão ou use o direcional"
              : "Foque o mapa e use WASD/setas, clique no chão ou use a lista de pessoas"}
          </p>
        </div>

        {room && (
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-2 bottom-1.5 z-10 rounded-full bg-marfim px-2 py-0.5 text-xs font-semibold text-tinta"
          >
            Mapa © OpenStreetMap<span className="sr-only"> (abre em nova aba)</span>
          </a>
        )}

        {peopleOpen && (
          <PeopleList
            id={`${ids}-people`}
            roster={roster}
            isMobile={isMobile}
            activeId={activeBot?.id ?? null}
            onTalk={talkTo}
            onProfile={(id) => dispatch({ type: "openProfile", id })}
          />
        )}

        {showDpad && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 select-none">
            <div
              role="group"
              aria-label="Direcional"
              className="lg-bar grid h-[108px] w-[108px] grid-cols-3 gap-1 rounded-cartao p-1.5"
            >
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
          <div
            ref={cardRef}
            onFocusCapture={() => (cardHadFocus.current = true)}
            onBlurCapture={(e) => {
              if (!cardRef.current?.contains(e.relatedTarget as Node | null)) cardHadFocus.current = false;
            }}
          >
            <BotCard
              bot={activeBot}
              isMobile={isMobile}
              continueRef={continueRef}
              onOpenProfile={() => dispatch({ type: "openProfile", id: activeBot.id })}
              onContinue={() => engineRef.current?.cycleBotDialogue(activeBot.id)}
              onEnd={endConversation}
            />
          </div>
        )}
      </div>

      <div className={`lg-glass lg-glass-footer z-20 shrink-0 ${isMobile ? "px-3 pt-2 pb-[86px]" : "px-3 py-2"}`}>
        <form
          onSubmit={onChatSubmit}
          className="lg-pill flex h-11 items-center gap-2 rounded-full px-2 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-marfim"
        >
          <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/35" aria-hidden="true">
            <Avatar cfg={state.user.avatar} />
          </div>
          <input
            type="text"
            value={chat}
            maxLength={CHAT_MAX_LENGTH}
            onChange={(e) => setChat(e.target.value)}
            placeholder="Falar no Parque (aparece sobre seu boneco)..."
            aria-label="Mensagem no Parque"
            className="min-w-0 flex-1 bg-transparent px-1.5 py-1 text-sm text-white placeholder-marfim-apagado focus-visible:outline-none"
          />
          <button
            type="submit"
            className="lg-btn-primary min-h-8 shrink-0 rounded-full px-4 text-xs font-bold active:scale-95"
          >
            Enviar
          </button>
        </form>
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    </div>
  );
}

function PeopleList({
  id,
  roster,
  isMobile,
  activeId,
  onTalk,
  onProfile,
}: {
  id: string;
  roster: RosterEntry[];
  isMobile: boolean;
  activeId: string | null;
  onTalk: (id: string) => void;
  onProfile: (id: string) => void;
}) {
  return (
    <section
      id={id}
      aria-label="Pessoas no Parque"
      className={`lg-bar orbit-scroll absolute z-20 overflow-y-auto rounded-cartao p-2 ${
        isMobile ? "top-[124px] right-3 left-3 max-h-[42%]" : "top-[92px] right-3 max-h-[60%] w-[300px]"
      }`}
    >
      <ul className="flex flex-col gap-1">
        {roster.map((r) => {
          const profile = SIMULATED_PROFILES.find((p) => p.id === r.id);
          const intention = profile ? INTENTIONS[profile.primaryIntention] : null;
          return (
            <li
              key={r.id}
              className={`flex items-center gap-2 rounded-full px-2 py-1.5 ${r.id === activeId ? "bg-white/10" : ""}`}
            >
              {profile && intention && (
                <RingedAvatar cfg={profile.avatar} color={intention.color} size={30} ring={2} halo={false} />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-white">{r.name}</div>
                <div className="text-xs text-marfim-suave">
                  {r.proximity === "perto" ? (
                    <span className="presenca-chip rounded-full px-1.5 font-semibold whitespace-nowrap">
                      {PROXIMITY_LABEL[r.proximity]}
                    </span>
                  ) : (
                    PROXIMITY_LABEL[r.proximity]
                  )}
                  {intention && ` · ${intention.short}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onTalk(r.id)}
                className="lg-pill rounded-full px-2.5 min-h-9 py-1.5 text-xs font-bold text-white"
              >
                Conversar<span className="sr-only"> com {r.name}</span>
              </button>
              <button
                type="button"
                onClick={() => onProfile(r.id)}
                className="lg-pill rounded-full px-2.5 min-h-9 py-1.5 text-xs font-bold text-white"
              >
                Perfil<span className="sr-only"> de {r.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
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
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (!e.repeat) onPress(dir, true);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    release();
  };
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
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={release}
      className="pointer-events-auto flex touch-none items-center justify-center rounded-full border border-white/25 bg-white/[0.12] text-white transition hover:bg-white/[0.24] active:bg-areia/50"
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
  continueRef,
  onOpenProfile,
  onContinue,
  onEnd,
}: {
  bot: ActiveBotInfo;
  isMobile: boolean;
  continueRef: React.RefObject<HTMLButtonElement | null>;
  onOpenProfile: () => void;
  onContinue: () => void;
  onEnd: () => void;
}) {
  const profile = SIMULATED_PROFILES.find((p) => p.id === bot.id);
  const intention = profile ? INTENTIONS[profile.primaryIntention] : INTENTIONS.troca;
  return (
    <section
      aria-label={`Conversa com ${bot.name}`}
      className={`lg-sheet pointer-events-auto absolute z-30 rounded-cartao p-3.5 ${isMobile ? "right-3 bottom-[124px] left-3" : "right-4 bottom-4 w-[380px] max-w-[46%]"}`}
    >
      <div className="flex items-start gap-3">
        {profile && <RingedAvatar cfg={profile.avatar} color={intention.color} size={44} ring={2} halo={false} />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold text-white">
              <span>{bot.name}</span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-bold"
                style={{ background: intention.bg, color: intention.text }}
              >
                {intention.emoji} {intention.short}
              </span>
            </div>
            <CloseButton onClose={onEnd} label={`Encerrar conversa com ${bot.name}`} size="compacto" />
          </div>
          <p className="mt-1.5 text-sm leading-snug text-white" aria-live="polite">
            &ldquo;{bot.line}&rdquo;
          </p>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="presenca-chip rounded-full px-2 py-0.5 text-xs font-semibold">Perto no Parque</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenProfile}
                className="lg-pill rounded-full px-2.5 min-h-9 py-1.5 text-xs font-bold text-white"
              >
                Ver perfil
              </button>
              <button
                ref={continueRef}
                type="button"
                onClick={onContinue}
                className="lg-btn-primary rounded-full px-3 min-h-9 py-1.5 text-xs font-bold"
              >
                Continuar papo →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
