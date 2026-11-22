"use client";

import { memo, useState } from "react";
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
    <g fill="rgba(196, 181, 253, 0.34)">
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

  const focus = selected ? project(selected.center.lat, selected.center.lon) : null;
  const k = focus ? ZOOM : 1;
  const tx = focus ? Math.max(MAP_W - MAP_W * k, Math.min(0, MAP_W / 2 - focus.x * k)) : 0;
  const ty = focus ? Math.max(MAP_H - MAP_H * k, Math.min(0, MAP_H / 2 - focus.y * k)) : 0;
  const enter = (id: string) => dispatch({ type: "enterParkRoom", id });

  return (
    <div className="flex h-full w-full flex-col bg-[#0b101d]">
      <div className={`lg-header shrink-0 ${isMobile ? "px-4 pt-2.5 pb-3" : "px-6 pt-5 pb-3.5"}`}>
        <h1 className={`${isMobile ? "text-base" : "text-xl"} font-extrabold tracking-tight text-white`}>
          Parque pelo mundo
        </h1>
        <p className="mt-0.5 text-xs text-slate-300/80">
          Escolha um ponto no mapa-múndi: cada sala é uma miniatura de massinha feita com as ruas reais da região.
        </p>
      </div>

      <div className={`orbit-scroll flex-1 overflow-y-auto ${isMobile ? "p-3.5 pb-28" : "p-6"}`}>
        <div
          className={`mx-auto grid max-w-5xl gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"}`}
        >
          <div className="lg-panel relative overflow-hidden rounded-[26px] p-2">
            <svg
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              className="block h-auto w-full"
              role="img"
              aria-label="Mapa-múndi com as salas do Parque"
            >
              <g style={{ transform: `translate(${tx}px, ${ty}px) scale(${k})`, transition: "transform 700ms ease" }}>
                <LandDots />
                {CITY_ROOMS.map((room) => {
                  const p = project(room.center.lat, room.center.lon);
                  const active = room.id === selectedId;
                  return (
                    <g
                      key={room.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${room.name}, ${room.city}`}
                      onClick={() => setSelectedId(room.id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedId(room.id)}
                      className="cursor-pointer outline-none"
                      style={{
                        transform: `translate(${p.x}px, ${p.y}px) scale(${1 / k})`,
                        transition: "transform 700ms ease",
                      }}
                    >
                      <circle r={9} fill="transparent" />
                      <circle
                        r={active ? 6.5 : 5}
                        className="animate-ping"
                        fill="rgba(244, 114, 182, 0.25)"
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      />
                      <circle
                        r={active ? 4.2 : 3.2}
                        fill={active ? "#f472b6" : "#c4b5fd"}
                        stroke="#fff"
                        strokeWidth={1.2}
                      />
                      {active && (
                        <text y={-9} textAnchor="middle" fontSize={7} fontWeight={800} fill="#fff">
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
                className="lg-pill absolute top-3 right-3 rounded-full px-3 py-1 text-[11px] font-bold text-white"
              >
                Ver o mundo
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {selected ? (
              <SelectedRoom room={selected} onEnter={() => enter(selected.id)} />
            ) : (
              <div className="lg-panel rounded-[24px] p-4 text-xs leading-relaxed text-slate-200/90">
                <span className="font-bold text-white">Toque num ponto do mapa</span> ou escolha uma sala na lista. Você
                entra no lugar de verdade: as quadras, ruas, praças e árvores num raio de 100 m vêm do OpenStreetMap.
              </div>
            )}

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
                    onClick={() => setSelectedId(room.id)}
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
    <div className="lg-sheet rounded-[24px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-violet-200/90">
            {room.flag} {room.city}, {room.country}
          </div>
          <h2 className="mt-0.5 text-base font-extrabold text-white">{room.name}</h2>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200">
          ● {room.botCount} online
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-snug text-slate-200/90">{room.blurb}</p>
      <button
        type="button"
        onClick={onEnter}
        className="lg-btn-primary mt-3 w-full rounded-full py-2.5 text-xs font-extrabold text-white active:scale-[0.98]"
      >
        Entrar na sala →
      </button>
      <p className="mt-2 text-center text-[10px] text-slate-400">
        Mapa real de 200 × 200 m · ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          OpenStreetMap
        </a>
      </p>
    </div>
  );
}

function RoomRow({
  emoji,
  title,
  subtitle,
  online,
  active = false,
  onClick,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  online: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-[20px] px-3 py-2.5 text-left transition ${
        active ? "lg-active-lens" : "border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1]"
      }`}
    >
      <span className="lg-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-lg">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-white">{title}</span>
        <span className="block truncate text-[11px] text-slate-300/80">{subtitle}</span>
      </span>
      <span className="shrink-0 text-[10px] font-semibold text-emerald-200">● {online}</span>
    </button>
  );
}
