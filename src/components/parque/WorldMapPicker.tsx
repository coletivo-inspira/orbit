"use client";

import { memo, useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/a11y/motion";
import { PARK_BOTS } from "@/lib/data/park";
import { CENTRAL_PARK_ID, CITY_ROOMS, type ParkRoomDefinition } from "@/lib/data/parkRooms";
import WORLD_LAND from "@/lib/data/worldLand.json";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";

const MAP_W = 360;
const MAP_H = WORLD_LAND.rows.length * WORLD_LAND.step;
const ZOOM = 3.2;

function project(lat: number, lon: number) {
  return { x: lon + 180, y: WORLD_LAND.latTop - lat };
}

const LandDots = memo(function LandDots() {
  const dots: { x: number; y: number }[] = [];
  WORLD_LAND.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] === "#") dots.push({ x: c * WORLD_LAND.step + WORLD_LAND.step / 2, y: r * WORLD_LAND.step });
    }
  });
  return (
    <g fill="rgb(222 201 168 / 30%)">
      {dots.map((d) => (
        <circle key={`${d.x},${d.y}`} cx={d.x} cy={d.y} r={0.95} />
      ))}
    </g>
  );
});

/** Entry of the Parque: a dotted world map where each pin is a room built from the real streets around it. */
export function WorldMapPicker() {
  const { dispatch } = useOrbit();
  const { device } = useDevice();
  const isMobile = device === "mobile";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = CITY_ROOMS.find((r) => r.id === selectedId) ?? null;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Coming back from a room, the button that was focused is gone: land on the heading instead of <body>.
  useEffect(() => {
    if (!document.activeElement || document.activeElement === document.body) headingRef.current?.focus();
  }, []);

  const focus = selected ? project(selected.center.lat, selected.center.lon) : null;
  const k = focus ? ZOOM : 1;
  const tx = focus ? Math.max(MAP_W - MAP_W * k, Math.min(0, MAP_W / 2 - focus.x * k)) : 0;
  const ty = focus ? Math.max(MAP_H - MAP_H * k, Math.min(0, MAP_H / 2 - focus.y * k)) : 0;
  const enter = (id: string) => dispatch({ type: "enterParkRoom", id });
  const select = (id: string, fromList: boolean) => {
    setSelectedId(id);
    if (fromList && isMobile) {
      mapRef.current?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className={`lg-header shrink-0 ${isMobile ? "px-4 pt-2.5 pb-3" : "px-6 pt-5 pb-3.5"}`}>
        <h1
          ref={headingRef}
          tabIndex={-1}
          data-focus-fallback
          className={`${isMobile ? "text-base" : "text-xl"} font-extrabold tracking-tight text-white`}
        >
          Parque pelo mundo
        </h1>
        <p className="mt-0.5 text-xs text-marfim-suave">
          Escolha um ponto no mapa-múndi: cada sala é uma miniatura de massinha feita com as ruas reais da região.
        </p>
      </div>

      <div className={`orbit-scroll flex-1 overflow-y-auto ${isMobile ? "p-3.5 pb-28" : "p-6"}`}>
        <div
          className={`mx-auto grid max-w-5xl gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"}`}
        >
          <div
            ref={mapRef}
            className={`lg-panel relative scroll-mt-3 self-start overflow-hidden rounded-cartao p-2 ${isMobile ? "" : "sticky top-0"}`}
          >
            {/* Pointer shortcut only: the room list below is the accessible way to pick a room. */}
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="block h-auto w-full" aria-hidden="true">
              <g style={{ transform: `translate(${tx}px, ${ty}px) scale(${k})`, transition: "transform 700ms ease" }}>
                <LandDots />
                {CITY_ROOMS.map((room) => {
                  const p = project(room.center.lat, room.center.lon);
                  const active = room.id === selectedId;
                  return (
                    <g
                      key={room.id}
                      onClick={() => select(room.id, false)}
                      className="cursor-pointer"
                      style={{
                        transform: `translate(${p.x}px, ${p.y}px) scale(${1 / k})`,
                        transition: "transform 700ms ease",
                      }}
                    >
                      <circle r={5} fill="transparent" />
                      <circle
                        r={active ? 6.5 : 5}
                        className="animate-ping"
                        fill="rgb(222 201 168 / 28%)"
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      />
                      <circle
                        r={active ? 4.2 : 3.2}
                        fill={active ? "#a87356" : "#dec9a8"}
                        stroke="#f5f0e7"
                        strokeWidth={1.2}
                      />
                      {active && (
                        <text
                          y={-9}
                          textAnchor="middle"
                          fontSize={7}
                          fontWeight={800}
                          fill="#f5f0e7"
                          stroke="#1c2631"
                          strokeWidth={2}
                          paintOrder="stroke"
                        >
                          {room.flag} {room.city}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
            {selected && (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="lg-pill absolute top-3 right-3 rounded-full bg-tinta px-3 min-h-9 py-1.5 text-xs font-bold text-white"
              >
                Ver o mundo
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {selected ? (
              <SelectedRoom room={selected} onEnter={() => enter(selected.id)} />
            ) : (
              <div className="lg-glass-tint rounded-cartao p-4 text-xs leading-relaxed text-marfim-suave">
                <span className="font-bold text-white">Toque num ponto do mapa</span> ou escolha uma sala na lista. Você
                entra no lugar de verdade: as quadras, ruas, praças e árvores num raio de 100 m vêm do OpenStreetMap.
              </div>
            )}
            <p role="status" aria-live="polite" className="sr-only">
              {selected ? `${selected.name}, ${selected.city}, selecionada. Use o botão Entrar na sala.` : ""}
            </p>

            <h2 className="sr-only">Salas</h2>
            <ul className="flex flex-col gap-2">
              <li>
                <RoomRow
                  emoji="🌳"
                  title="Parque Central Orbit"
                  subtitle="Sala original · fonte, Café Orbit e o gato Paçoca"
                  online={PARK_BOTS.length}
                  onClick={() => enter(CENTRAL_PARK_ID)}
                />
              </li>
              {CITY_ROOMS.map((room) => (
                <li key={room.id}>
                  <RoomRow
                    emoji={room.flag}
                    title={room.name}
                    subtitle={`${room.city}, ${room.country}`}
                    online={room.botCount}
                    active={room.id === selectedId}
                    onClick={() => select(room.id, true)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectedRoom({ room, onEnter }: { room: ParkRoomDefinition; onEnter: () => void }) {
  return (
    <section aria-label={`Sala ${room.name}`} className="lg-sheet rounded-cartao p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-areia">
            <span aria-hidden="true">{room.flag} </span>
            {room.city}, {room.country}
          </div>
          <h2 className="mt-0.5 text-base font-extrabold text-white">{room.name}</h2>
        </div>
        <span className="presenca-chip shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold">
          {room.botCount} online
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-snug text-marfim-suave">{room.blurb}</p>
      <button
        type="button"
        onClick={onEnter}
        className="lg-btn-primary mt-3 w-full rounded-full py-2.5 text-xs font-extrabold active:scale-[0.98]"
      >
        Entrar na sala →
      </button>
      <p className="mt-2 text-center text-xs text-marfim-suave">
        Mapa real de 200 × 200 m · ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-areia underline"
        >
          OpenStreetMap<span className="sr-only"> (abre em nova aba)</span>
        </a>
      </p>
    </section>
  );
}

function RoomRow({
  emoji,
  title,
  subtitle,
  online,
  active,
  onClick,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  online: number;
  /** Omitted for rows that enter right away instead of selecting. */
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-cartao px-3 py-2.5 text-left transition ${
        active ? "lg-active-lens" : "border border-white/[0.14] bg-white/[0.06] hover:bg-white/[0.12]"
      }`}
    >
      <span
        className="lg-pill flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
        aria-hidden="true"
      >
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-white">{title}</span>
        <span className="block truncate text-xs text-marfim-suave">{subtitle}</span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-salvia">
        {online}
        <span className="sr-only"> pessoas online</span>
      </span>
    </button>
  );
}
