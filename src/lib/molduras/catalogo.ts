export type MolduraId =
  | "classica"
  | "orbita"
  | "toques"
  | "curioso"
  | "pacoca"
  | "papo"
  | "comunidade"
  | "viajante"
  | "desejos"
  | "cometa"
  | "aurora"
  | "galaxia";

export type ConquistaId =
  "toques" | "curioso" | "pacoca" | "papo" | "comunidade" | "viajante" | "desejos" | "colecionador" | "lenda";

export type Raridade = "comum" | "rara" | "epica" | "lendaria";

export interface MolduraVisual {
  /** CSS background of the ring; `var(--cor)` is the color of the user's main intention. */
  anel: string;
  /** Ring thickness in px for a 64 px avatar; scales with the avatar. */
  largura: number;
  /** Slow rotation (stops under reduced motion). */
  girar?: boolean;
  /** Small badge on the ring. */
  enfeite?: string;
  /** Outer glow color. */
  brilho?: string;
}

export type Desbloqueio =
  | { tipo: "inicial" }
  | { tipo: "conquista"; conquista: ConquistaId }
  /** Orbit+: the fallback achievement only counts when monetization is set to "conquista". */
  | { tipo: "orbitPlus"; conquistaAlternativa: ConquistaId };

export interface Moldura {
  id: MolduraId;
  nome: string;
  descricao: string;
  raridade: Raridade;
  desbloqueio: Desbloqueio;
  visual: MolduraVisual;
}

export const RARIDADE_LABEL: Record<Raridade, string> = {
  comum: "Comum",
  rara: "Rara",
  epica: "Épica",
  lendaria: "Lendária",
};

export const MOLDURAS: Moldura[] = [
  {
    id: "classica",
    nome: "Clássica",
    descricao: "Anel de vidro iridescente na cor da sua intenção principal.",
    raridade: "comum",
    desbloqueio: { tipo: "inicial" },
    visual: { anel: "var(--cor)", largura: 3 },
  },
  {
    id: "orbita",
    nome: "Órbita dupla",
    descricao: "Dois anéis, como um planeta com lua.",
    raridade: "comum",
    desbloqueio: { tipo: "inicial" },
    visual: {
      anel: "repeating-conic-gradient(var(--cor) 0 10deg, transparent 10deg 18deg)",
      largura: 4,
      girar: true,
    },
  },
  {
    id: "toques",
    nome: "Toque leve",
    descricao: "Para quem não tem medo de dar o primeiro passo.",
    raridade: "comum",
    desbloqueio: { tipo: "conquista", conquista: "toques" },
    visual: { anel: "linear-gradient(135deg, var(--cor), #f5f0e7)", largura: 4, enfeite: "👆" },
  },
  {
    id: "curioso",
    nome: "Curioso",
    descricao: "Muitos assuntos, muitas portas abertas.",
    raridade: "comum",
    desbloqueio: { tipo: "conquista", conquista: "curioso" },
    visual: { anel: "conic-gradient(#dec9a8, var(--cor), #dec9a8)", largura: 4, enfeite: "✦" },
  },
  {
    id: "pacoca",
    nome: "Paçoca",
    descricao: "Listras de gato laranja. Achou o fujão do Parque!",
    raridade: "rara",
    desbloqueio: { tipo: "conquista", conquista: "pacoca" },
    visual: {
      anel: "repeating-conic-gradient(#fb923c 0 14deg, #fed7aa 14deg 24deg)",
      largura: 5,
      enfeite: "🐱",
    },
  },
  {
    id: "papo",
    nome: "Bom de papo",
    descricao: "Balões de quadrinho em volta do seu avatar.",
    raridade: "rara",
    desbloqueio: { tipo: "conquista", conquista: "papo" },
    visual: { anel: "conic-gradient(#f5f0e7, #a78bfa, #f5f0e7, #a78bfa, #f5f0e7)", largura: 5, enfeite: "💬" },
  },
  {
    id: "comunidade",
    nome: "Voz da comunidade",
    descricao: "Para quem participa das conversas abertas.",
    raridade: "rara",
    desbloqueio: { tipo: "conquista", conquista: "comunidade" },
    visual: { anel: "linear-gradient(135deg, #38bdf8, #34d399)", largura: 5, enfeite: "📣" },
  },
  {
    id: "viajante",
    nome: "Passaporte",
    descricao: "Carimbos de quem já passeou pelo Parque pelo mundo.",
    raridade: "epica",
    desbloqueio: { tipo: "conquista", conquista: "viajante" },
    visual: {
      anel: "conic-gradient(#0ea5e9, #f5f0e7, #22c55e, #f5f0e7, #0ea5e9)",
      largura: 6,
      enfeite: "✈️",
      brilho: "rgb(14 165 233 / 45%)",
    },
  },
  {
    id: "desejos",
    nome: "Máscaras",
    descricao: "Um brilho discreto para quem fez o quiz de Desejos.",
    raridade: "epica",
    desbloqueio: { tipo: "conquista", conquista: "desejos" },
    visual: {
      anel: "conic-gradient(#f472b6, #7c3aed, #f472b6)",
      largura: 6,
      enfeite: "🎭",
      brilho: "rgb(244 114 182 / 45%)",
    },
  },
  {
    id: "cometa",
    nome: "Cometa",
    descricao: "Uma cauda de luz girando em volta da sua órbita.",
    raridade: "lendaria",
    desbloqueio: { tipo: "orbitPlus", conquistaAlternativa: "colecionador" },
    visual: {
      anel: "conic-gradient(from 0deg, transparent 0 55%, #fde68a 80%, #fff 100%)",
      largura: 6,
      girar: true,
      enfeite: "☄️",
      brilho: "rgb(253 230 138 / 55%)",
    },
  },
  {
    id: "aurora",
    nome: "Aurora",
    descricao: "Verde, lilás e ciano, como o céu do extremo sul.",
    raridade: "lendaria",
    desbloqueio: { tipo: "orbitPlus", conquistaAlternativa: "colecionador" },
    visual: {
      anel: "conic-gradient(#34d399, #22d3ee, #a78bfa, #f472b6, #34d399)",
      largura: 6,
      girar: true,
      brilho: "rgb(52 211 153 / 50%)",
    },
  },
  {
    id: "galaxia",
    nome: "Galáxia",
    descricao: "Poeira de estrelas para quem colecionou tudo.",
    raridade: "lendaria",
    desbloqueio: { tipo: "orbitPlus", conquistaAlternativa: "lenda" },
    visual: {
      anel: "radial-gradient(circle at 30% 20%, #fff 0 2%, transparent 3%), radial-gradient(circle at 75% 70%, #fff 0 2%, transparent 3%), conic-gradient(#1e1b4b, #7c3aed, #0ea5e9, #1e1b4b)",
      largura: 7,
      girar: true,
      enfeite: "🌌",
      brilho: "rgb(124 58 237 / 55%)",
    },
  },
];

export const MOLDURA_PADRAO: MolduraId = "classica";

const BY_ID = new Map(MOLDURAS.map((m) => [m.id, m]));

export function getMoldura(id: MolduraId): Moldura {
  return BY_ID.get(id) ?? BY_ID.get(MOLDURA_PADRAO)!;
}

export function isMolduraId(value: unknown): value is MolduraId {
  return typeof value === "string" && BY_ID.has(value as MolduraId);
}

export const MOLDURAS_INICIAIS: MolduraId[] = MOLDURAS.filter((m) => m.desbloqueio.tipo === "inicial").map((m) => m.id);
