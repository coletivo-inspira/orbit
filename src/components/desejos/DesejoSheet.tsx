"use client";

import { useId, useRef, type ReactNode } from "react";
import { Ilustracao } from "@/components/desejos/Ilustracao";
import { CloseButton } from "@/components/ui/Button";
import { SectionLabel, Sheet, SheetBody, SheetHeader } from "@/components/ui/Sheet";
import { CATEGORIAS, FAMILIAS } from "@/lib/desejos/categorias";
import type { CategoriaId } from "@/lib/desejos/types";
import { useDevice } from "@/lib/state/device";

/** Glossary sheet for one desire category, opened from the result screen. */
export function DesejoSheet({ id, onClose }: { id: CategoriaId; onClose: () => void }) {
  const { device } = useDevice();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const isMobile = device === "mobile";
  const c = CATEGORIAS[id];

  return (
    <Sheet
      labelledBy={titleId}
      initialFocusRef={titleRef}
      onClose={onClose}
      placement={isMobile ? "baixo" : "centro"}
      maxWidth="max-w-[560px]"
    >
      <SheetHeader className="items-center">
        <Ilustracao id={c.ilustracao} className="h-14 w-[76px] shrink-0 rounded-cartao" />
        <div className="min-w-0 flex-1">
          <SectionLabel as="p">{FAMILIAS[c.familia]}</SectionLabel>
          <h2 ref={titleRef} id={titleId} tabIndex={-1} className="text-lg leading-tight font-extrabold text-white">
            {c.nome}
          </h2>
          {c.nomeOriginal !== c.nome && <p className="text-xs text-areia">Também chamado de {c.nomeOriginal}</p>}
        </div>
        <CloseButton onClose={onClose} />
      </SheetHeader>
      <SheetBody className="pt-3">
        <p className="mt-3 text-sm leading-relaxed text-white">{c.resumo}</p>

        <Bloco titulo="O que é">
          <p>{c.oQueE}</p>
        </Bloco>

        {c.mitosEFatos.length > 0 && (
          <Bloco titulo="Mitos e fatos">
            <ul className="flex flex-col gap-2">
              {c.mitosEFatos.map((m) => (
                <li key={m.mito} className="rounded-cartao border border-white/[0.12] bg-tinta p-3">
                  <p className="text-marfim-suave">
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
                  <span className="text-marfim-suave">
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

        <p className="mt-5 rounded-cartao border border-salvia/40 bg-salvia/10 p-3 text-xs leading-relaxed text-salvia">
          Isto descreve o tema, não você. Ter um desejo não é transtorno, e não ter também está tudo bem.
        </p>
      </SheetBody>
    </Sheet>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-4 border-t border-marfim/10 pt-3.5 text-sm leading-[1.62] text-white">
      <SectionLabel className="mb-2">{titulo}</SectionLabel>
      {children}
    </section>
  );
}
