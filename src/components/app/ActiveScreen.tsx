"use client";

import { ComunidadeScreen } from "@/components/screens/ComunidadeScreen";
import { OrbitaScreen } from "@/components/screens/OrbitaScreen";
import { ParqueScreen } from "@/components/screens/ParqueScreen";
import { PerfilScreen } from "@/components/screens/PerfilScreen";
import { useOrbit } from "@/lib/state/OrbitProvider";

export function ActiveScreen() {
  const { state } = useOrbit();
  switch (state.activeTab) {
    case "orbita":
      return <OrbitaScreen />;
    case "parque":
      return <ParqueScreen />;
    case "comunidade":
      return <ComunidadeScreen />;
    case "perfil":
      return <PerfilScreen />;
  }
}

export function AmbientOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="ambient-orb absolute -top-20 -left-16 h-72 w-72 rounded-full bg-violet-400/20 blur-[80px]" />
      <div
        className="ambient-orb absolute top-1/3 -right-20 h-72 w-72 rounded-full bg-cyan-300/15 blur-[85px]"
        style={{ animationDelay: "-5s" }}
      />
      <div
        className="ambient-orb absolute -bottom-24 left-1/4 h-64 w-80 rounded-full bg-indigo-400/15 blur-[90px]"
        style={{ animationDelay: "-9s" }}
      />
    </div>
  );
}
