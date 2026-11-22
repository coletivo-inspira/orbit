"use client";

import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useToast } from "@/components/ui/Toasts";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { BODY_LIMITS, COUNCILS, TITLE_LIMITS, UFS, validateDraft } from "@/lib/community";
import { COMMUNITY_CATEGORIES } from "@/lib/data/intentions";
import { extractKeywords, tagId } from "@/lib/keywords";
import { REGIONS } from "@/lib/data/regions";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { CommunityCategory, PostDraft, PostKind, ProfessionalCouncil } from "@/lib/types";

const FIELD =
  "w-full rounded-2xl border border-white/20 bg-tinta px-3.5 py-2.5 text-sm text-white placeholder-slate-300 focus:border-areia";
const LABEL = "mb-1 block text-[11px] font-bold text-slate-200";

export function ComposerSheet({ initialKind, onClose }: { initialKind: PostKind; onClose: () => void }) {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const showToast = useToast();
  const isMobile = device === "mobile";
  const uid = useId();
  const dialogRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const onKeyDown = useDialogFocus(dialogRef, titleRef, onClose);
  const [kind, setKind] = useState<PostKind>(initialKind);
  const [category, setCategory] = useState<CommunityCategory>(
    state.communityFilter !== "all" ? state.communityFilter : initialKind === "artigo" ? "prevencao" : "debates",
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [council, setCouncil] = useState<ProfessionalCouncil>("CRM");
  const [registration, setRegistration] = useState("");
  const [uf, setUf] = useState(REGIONS[state.regionId].uf);
  const [errors, setErrors] = useState<string[]>([]);
  /** Suggested tags the author took out; kept by tag id so they stay out while the text changes. */
  const [removedTags, setRemovedTags] = useState<string[]>([]);
  const suggested = useMemo(() => extractKeywords(title, body), [title, body]);
  const tags = suggested.filter((t) => !removedTags.includes(tagId(t)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const draft: PostDraft = {
      kind,
      category,
      title,
      body,
      tags,
      professional: kind === "artigo" ? { name, council, registration, uf } : undefined,
    };
    const problems = validateDraft(draft);
    setErrors(problems);
    if (problems.length) return;
    dispatch({ type: "submitPost", draft });
    showToast(
      kind === "artigo" ? "Artigo enviado para revisão! ⏳" : "Post publicado na comunidade! 💬",
      kind === "artigo" ? "info" : "success",
    );
  };

  return (
    <div
      onClick={onClose}
      className={`absolute inset-0 z-50 flex items-center justify-center bg-tinta/75 ${isMobile ? "p-2.5" : "p-6"}`}
    >
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-heading`}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
        className={`lg-sheet flex w-full flex-col overflow-hidden rounded-[30px] outline-none ${isMobile ? "max-h-[92%]" : "max-h-[90%] max-w-[560px]"}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.12] px-5 py-4">
          <h2
            ref={titleRef}
            id={`${uid}-heading`}
            tabIndex={-1}
            className={`${isMobile ? "text-lg" : "text-xl"} font-bold tracking-tight text-white`}
          >
            {kind === "artigo" ? "Enviar artigo para revisão" : "Criar post"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="lg-pill flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm text-white"
          >
            ✕
          </button>
        </div>

        <div className="orbit-scroll flex-1 space-y-3.5 overflow-y-auto p-5">
          <div
            role="group"
            aria-label="Tipo de publicação"
            className="flex w-fit items-center gap-1 rounded-full border border-white/[0.14] bg-white/[0.05] p-0.5"
          >
            {(
              [
                ["discussao", "💬 Post"],
                ["artigo", "🩺 Artigo profissional"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={kind === id}
                onClick={() => {
                  setKind(id);
                  setErrors([]);
                }}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  kind === id
                    ? "lg-active-lens text-white"
                    : "border border-transparent text-slate-300 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            {kind === "artigo"
              ? "Artigos passam por conferência do registro profissional e revisão de moderadores antes de aparecer para todo mundo."
              : `Publica na hora como “Post da comunidade”, assinado como ${state.user.name}. Não substitui orientação profissional.`}
          </p>

          <div>
            <label className={LABEL} htmlFor={`${uid}-category`}>
              Subcomunidade
            </label>
            <select
              id={`${uid}-category`}
              value={category}
              onChange={(e) => setCategory(e.target.value as CommunityCategory)}
              className={FIELD}
            >
              {(Object.entries(COMMUNITY_CATEGORIES) as [CommunityCategory, { label: string; slug: string }][]).map(
                ([id, c]) => (
                  <option key={id} value={id} className="bg-tinta">
                    c/{c.slug} · {c.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor={`${uid}-title`}>
              Título
            </label>
            <input
              id={`${uid}-title`}
              value={title}
              maxLength={TITLE_LIMITS.max}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                kind === "artigo" ? "Ex.: O que muda com a PrEP injetável" : "Sobre o que você quer conversar?"
              }
              className={FIELD}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor={`${uid}-body`}>
              Texto
            </label>
            <textarea
              id={`${uid}-body`}
              value={body}
              rows={kind === "artigo" ? 6 : 4}
              maxLength={BODY_LIMITS.max}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                kind === "artigo"
                  ? "Escreva o artigo. Separe parágrafos com uma linha em branco e cite as fontes no final."
                  : "Conte sua experiência ou faça uma pergunta para a comunidade."
              }
              className={`${FIELD} resize-none leading-relaxed`}
            />
          </div>

          <div role="group" aria-labelledby={`${uid}-tags`}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span id={`${uid}-tags`} className="text-[11px] font-bold text-slate-200">
                Tags automáticas
              </span>
              {removedTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRemovedTags([])}
                  className="text-[11px] font-bold text-areia underline underline-offset-2"
                >
                  Restaurar removidas
                </button>
              )}
            </div>
            {tags.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <li key={tag}>
                    <button
                      type="button"
                      onClick={() => setRemovedTags((r) => [...r, tagId(tag)])}
                      aria-label={`Tirar a tag ${tag}`}
                      className="flex items-center gap-1 rounded-full border border-areia/40 bg-areia/10 py-1 pr-2 pl-2.5 text-[11px] font-semibold text-areia hover:bg-areia/20"
                    >
                      #{tag} <span aria-hidden="true">✕</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-slate-300">
                {suggested.length
                  ? "Nenhuma tag: o post sai sem palavras-chave."
                  : "Aparecem aqui conforme você escreve."}
              </p>
            )}
            <p className="mt-1 text-[11px] leading-snug text-slate-300">
              Tiradas do título e do texto, sem artigos e preposições (“a”, “e”, “de”…). Toque numa tag para tirar.
            </p>
          </div>

          {kind === "artigo" && (
            <fieldset className="space-y-3 rounded-[22px] border border-emerald-300/25 bg-emerald-400/[0.06] p-3.5">
              <legend className="px-1 text-xs font-extrabold text-emerald-100">Verificação profissional</legend>
              <div>
                <label className={LABEL} htmlFor={`${uid}-name`}>
                  Nome profissional
                </label>
                <input
                  id={`${uid}-name`}
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como aparece no conselho"
                  className={FIELD}
                />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_84px] gap-2">
                <div className="col-span-2">
                  <label className={LABEL} htmlFor={`${uid}-council`}>
                    Conselho
                  </label>
                  <select
                    id={`${uid}-council`}
                    value={council}
                    onChange={(e) => setCouncil(e.target.value as ProfessionalCouncil)}
                    className={FIELD}
                  >
                    {(Object.keys(COUNCILS) as ProfessionalCouncil[]).map((id) => (
                      <option key={id} value={id} className="bg-tinta">
                        {id} · {COUNCILS[id].profession}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor={`${uid}-registration`}>
                    Nº de registro
                  </label>
                  <input
                    id={`${uid}-registration`}
                    value={registration}
                    inputMode="numeric"
                    maxLength={8}
                    onChange={(e) => setRegistration(e.target.value.replace(/\D/g, ""))}
                    placeholder="Só números"
                    className={FIELD}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor={`${uid}-uf`}>
                    UF
                  </label>
                  <select id={`${uid}-uf`} value={uf} onChange={(e) => setUf(e.target.value)} className={FIELD}>
                    {UFS.map((u) => (
                      <option key={u} value={u} className="bg-tinta">
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">
                Na versão real, o registro seria conferido na consulta pública do {COUNCILS[council].name} e um
                moderador revisaria o texto e as fontes.{" "}
                <strong className="text-amber-100">Nesta demo é simulado</strong>: nada é enviado aos conselhos e você
                mesmo pode aprovar o artigo para ver o fluxo.
              </p>
            </fieldset>
          )}

          {errors.length > 0 && (
            <ul
              role="alert"
              className="space-y-1 rounded-2xl border border-rose-300/35 bg-rose-500/10 p-3 text-[11px] text-rose-100"
            >
              {errors.map((err) => (
                <li key={err}>• {err}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/[0.12] bg-tinta p-3.5">
          <button
            type="button"
            onClick={onClose}
            className="lg-pill rounded-full px-4 py-2 text-xs font-semibold text-white"
          >
            Cancelar
          </button>
          <button type="submit" className="lg-btn-primary rounded-full px-4 py-2 text-xs font-bold">
            {kind === "artigo" ? "Enviar para revisão" : "Publicar"}
          </button>
        </div>
      </form>
    </div>
  );
}
