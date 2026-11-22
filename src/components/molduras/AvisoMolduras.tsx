"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toasts";
import { getMoldura, type MolduraId } from "@/lib/molduras/catalogo";
import { useOrbit } from "@/lib/state/OrbitProvider";

/** Announces frames earned by activity. Mount once per app, inside the toast provider. */
export function AvisoMolduras() {
  const { state } = useOrbit();
  const showToast = useToast();
  const novas = state.moldurasNovas;
  const avisadas = useRef<MolduraId[] | null>(null);
  useEffect(() => {
    // Strict Mode replays effects; each batch is announced once.
    if (avisadas.current === novas) return;
    avisadas.current = novas;
    for (const id of novas) {
      showToast(`Nova moldura desbloqueada: ${getMoldura(id).nome} ✨ Escolha no Meu Hub.`, "success");
    }
  }, [novas, showToast]);
  return null;
}
