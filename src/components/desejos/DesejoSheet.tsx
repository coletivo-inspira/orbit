"use client";

import { useId, useRef, type ReactNode } from "react";
import { Ilustracao } from "@/components/desejos/Ilustracao";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { CATEGORIAS, FAMILIAS } from "@/lib/desejos/categorias";
import type { CategoriaId } from "@/lib/desejos/types";
import { useDevice } from "@/lib/state/device";

/** Glossary sheet for one desire category, opened from the result screen. */
export function DesejoSheet({ id, onClose }: { id: CategoriaId; onClose: () => void }) {
  const { device } = useDevice();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const onKeyDown = useDialogFocus(dialogRef, titleRef, onClose);
  const isMobile = device === "mobile";
  const c = CATEGORIAS[id];

  return (
    <div
      onClick={onClose}
      className={`absolute inset-0 z-50 flex bg-tinta/75 ${isMobile ? "items-end p-2.5 pb-4" : "items-center justify-center p-6"}`}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={`lg-sheet relative flex w-full flex-col overflow-hidden outline-none ${isMobile ? "max-h-[94%] rounded-[32px]" : "max-h-[90%] max-w-[560px] rounded-[30px]"}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="lg-pill absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm text-white"
        >
          ✕
        </button>
        <div className="orbit-scroll flex-1 overflow-y-auto p-5">
          <div className="flex items-center gap-3.5 pr-10">
            <Ilustracao id={c.ilustracao} className="h-16 w-[86px] shrink-0 rounded-xl" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">{FAMILIAS[c.familia]}</p>
              <h2
                ref={titleRef}
                id={titleId}
                tabIndex={-1}
                className="font-sans text-lg leading-tight font-extrabold text-white"
              >
                {c.nome}
              </h2>
              {c.nomeOriginal !== c.nome && <p className="text-xs text-areia">Também chamado de {c.nomeOriginal}</p>}
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white">{c.resumo}</p>

          <Bloco titulo="O que é">
            <p>{c.oQueE}</p>
          </Bloco>

          {c.mitosEFatos.length > 0 && (
            <Bloco titulo="Mitos e fatos">
              <ul className="flex flex-col gap-2">
                {c.mitosEFatos.map((m) => (
                  <li key={m.mito} className="rounded-2xl border border-white/[0.12] bg-tinta p-3">
                    <p className="text-slate-300">
                      <strong className="text-areia">Mito:</strong> {m.mito}
                    </p>
                    <p className="mt-1">
                      <strong className="text-salvia">Fato:</strong> {m.fato}
                    </p>
                  </li>
                ))}
              </ul>
            </Bloco>
          )}

          <Bloco titulo="Como explorar com consentimento">
            <ul className="flex list-disc flex-col gap-1.5 pl-5">
              {c.comoExplorarComConsentimento.map((passo) => (
                <li key={passo}>{passo}</li>
              ))}
            </ul>
          </Bloco>

          {c.referencias.length > 0 && (
            <Bloco titulo="Referências">
              <ul className="flex list-disc flex-col gap-1 pl-4 text-xs">
                {c.referencias.map((r) => (
                  <li key={r.titulo}>
                    <span className="text-slate-300">
                      {r.autores} ({r.ano}).{" "}
                    </span>
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-areia underline underline-offset-2"
                      >
                        {r.titulo}
                      </a>
                    ) : (
                      r.titulo
                    )}
                  </li>
                ))}
              </ul>
            </Bloco>
          )}

          <p className="mt-5 rounded-2xl border border-salvia/40 bg-salvia/10 p-3 text-[11px] leading-relaxed text-salvia">
            Isto descreve o tema, não você. Ter um desejo não é transtorno, e não ter também está tudo bem.
          </p>
        </div>
      </div>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-4 border-t border-white/[0.12] pt-3.5 text-sm leading-[1.62] text-white">
      <h3 className="mb-2 font-sans text-[11px] font-bold tracking-wider text-slate-300 uppercase">{titulo}</h3>
      {children}
    </section>
  );
}
