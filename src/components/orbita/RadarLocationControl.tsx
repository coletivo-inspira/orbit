"use client";

import { useEffect, useId, useRef, useState } from "react";
import { requestDeviceLocation, resetToDefaultLocation, useUserLocation } from "@/lib/geo/userLocation";
import { buttonClass } from "@/components/ui/Button";

const LABEL = {
  padrao: "Savassi, BH",
  buscando: "Localizando…",
  aparelho: "Perto de você",
  negada: "Savassi, BH",
  indisponivel: "Savassi, BH",
} as const;

/**
 * Where the map is centered, and the explicit opt-in to center it on the device: the browser is
 * only asked after the user reads what happens with the position and taps "Usar minha localização".
 */
export function RadarLocationControl({ compact }: { compact: boolean }) {
  const { status } = useUserLocation();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative z-10 flex flex-col items-end">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="lg-glass flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-white"
      >
        <span aria-hidden="true">📍</span>
        <span className={compact ? "max-w-[112px] truncate" : ""}>{LABEL[status]}</span>
        <span className="sr-only">: onde o mapa está centralizado. Abrir opções de localização</span>
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Localização no mapa"
          className="lg-glass absolute top-full right-0 mt-2 w-[min(280px,calc(100vw-40px))] rounded-cartao p-3.5 text-left"
        >
          {status === "aparelho" ? (
            <p className="text-xs leading-relaxed text-marfim-suave">
              O mapa está centralizado perto de você, com a posição arredondada (uns 100 m). Ela fica só neste aparelho,
              não é salva nem enviada, e some quando você recarrega a página.
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-marfim-suave">
              {status === "negada"
                ? "O navegador não deu acesso à localização. Para usar, permita a localização para este site nas configurações do navegador."
                : status === "indisponivel"
                  ? "Não deu para saber sua localização agora."
                  : "O mapa começa na Savassi, em Belo Horizonte."}{" "}
              Se quiser, centralize no lugar onde você está: o navegador vai pedir permissão. A posição é arredondada
              (uns 100 m), fica só neste aparelho e nunca é enviada.
            </p>
          )}
          <p className="mt-2 text-xs leading-snug text-marfim-apagado">
            As pessoas no mapa são simuladas: cada uma aparece num ponto aproximado, na distância dela, nunca no lugar
            exato.
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={close} className={buttonClass({ size: "compacto" })}>
              Agora não
            </button>
            {status === "aparelho" ? (
              <button
                type="button"
                onClick={() => {
                  resetToDefaultLocation();
                  close();
                }}
                className={buttonClass({ variant: "primario", size: "compacto" })}
              >
                Voltar para a Savassi
              </button>
            ) : (
              <button
                type="button"
                disabled={status === "buscando"}
                onClick={() => {
                  requestDeviceLocation();
                  close();
                }}
                className={buttonClass({ variant: "primario", size: "compacto", className: "disabled:opacity-60" })}
              >
                Usar minha localização
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
