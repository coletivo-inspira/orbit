export interface Point {
  x: number;
  y: number;
}

export type Obstacle =
  | { type: "circle"; x: number; y: number; r: number; kind: string }
  | { type: "rect"; x: number; y: number; w: number; h: number; kind: string };

export interface BotDefinition {
  id: string;
  name: string;
  shirt: string;
  skin: string;
  hair: string;
  x: number;
  y: number;
  speed: number;
  pauseTimer: number;
  waypoints: Point[];
  lines: string[];
  /** Lines used after the player finds Paçoca (only Matheus has them). */
  foundLines?: string[];
}

export const WORLD = { width: 1200, height: 900 };

/** Spawn point on the open sand path below the fountain, clear of every obstacle. */
export const PLAYER_SPAWN: Point = { x: 600, y: 565 };

export const CAFE_AREA = { x: 150, y: 125, w: 185, h: 105 };
export const TOTEM_AREA = { x: 870, y: 155, w: 126, h: 72 };
export const PACOCA_POSITION: Point = { x: 368, y: 215 };

export const TREES: Point[] = [
  { x: 110, y: 310 },
  { x: 250, y: 330 },
  { x: 130, y: 650 },
  { x: 280, y: 740 },
  { x: 430, y: 170 },
  { x: 760, y: 170 },
  { x: 1070, y: 290 },
  { x: 1050, y: 640 },
  { x: 900, y: 750 },
  { x: 420, y: 760 },
  { x: 780, y: 760 },
  { x: 600, y: 790 },
];

export const LAMPS: Point[] = [
  { x: 600, y: 315 },
  { x: 600, y: 605 },
  { x: 460, y: 450 },
  { x: 740, y: 450 },
];

export const OBSTACLES: Obstacle[] = [
  { type: "circle", x: 600, y: 450, r: 60, kind: "fountain" },
  { type: "rect", ...CAFE_AREA, kind: "cafe" },
  { type: "rect", ...TOTEM_AREA, kind: "totem" },
  { type: "rect", x: 468, y: 336, w: 54, h: 20, kind: "bench" },
  { type: "rect", x: 678, y: 336, w: 54, h: 20, kind: "bench" },
  { type: "rect", x: 468, y: 546, w: 54, h: 20, kind: "bench" },
  { type: "rect", x: 678, y: 546, w: 54, h: 20, kind: "bench" },
  ...TREES.map((t): Obstacle => ({ type: "circle", x: t.x, y: t.y + 8, r: 16, kind: "tree" })),
];

export const PARK_BOTS: BotDefinition[] = [
  {
    id: "p1",
    name: "Matheus",
    shirt: "#38bdf8",
    skin: "#f1c27d",
    hair: "#1f2937",
    x: 495,
    y: 465,
    speed: 54,
    pauseTimer: 1.5,
    waypoints: [
      { x: 495, y: 465 },
      { x: 385, y: 445 },
      { x: 410, y: 310 },
      { x: 470, y: 455 },
    ],
    lines: [
      "Ei! Você viu meu gato Paçoca por aí? Ele ama os arbustos perto do Café Orbit!",
      "Se encontrar um gatinho laranja no parque, me avisa! 🐱",
      "Adorei seu perfil no Orbit — meu selo do Grindr e Insta estão lá no cartão.",
    ],
    foundLines: [
      "VOCÊ ACHOU O PAÇOCA perto do café!! Muito obrigado, salvou meu dia! 🐱💜",
      "Devo um café gelado no Quiosque Orbit pra você!",
    ],
  },
  {
    id: "p2",
    name: "Rafa",
    shirt: "#fb923c",
    skin: "#c68642",
    hair: "#111827",
    x: 720,
    y: 505,
    speed: 62,
    pauseTimer: 0.8,
    waypoints: [
      { x: 720, y: 505 },
      { x: 845, y: 465 },
      { x: 785, y: 615 },
      { x: 695, y: 520 },
    ],
    lines: [
      "Acabei de sair da corrida! Nada melhor que esse parque pra puxar papo sem pressão.",
      "Curti muito esse visual Liquid Glass do Orbit no celular.",
      "Se animar um rolê hoje mais tarde, dá uma olhada no meu Hub!",
    ],
  },
  {
    id: "p3",
    name: "Thiago",
    shirt: "#c084fc",
    skin: "#ffdbac",
    hair: "#451a03",
    x: 300,
    y: 278,
    speed: 46,
    pauseTimer: 2.1,
    waypoints: [
      { x: 300, y: 278 },
      { x: 225, y: 278 },
      { x: 355, y: 295 },
    ],
    lines: [
      "O café gelado daqui do Quiosque Orbit é o melhor da praça ☕",
      "Tô lendo um livro de cinema por aqui — adoro conhecer gente que curte filmes indie.",
      "Bem melhor conversar andando pelo parque do que ficar só dando swipe!",
    ],
  },
  {
    id: "p4",
    name: "Dani",
    shirt: "#34d399",
    skin: "#8d5524",
    hair: "#0f172a",
    x: 925,
    y: 268,
    speed: 44,
    pauseTimer: 1.8,
    waypoints: [
      { x: 925, y: 268 },
      { x: 840, y: 275 },
      { x: 970, y: 310 },
    ],
    lines: [
      "Oi! Tô aqui perto do Totem de Saúde tirando dúvidas sobre PrEP e vacinas no SUS 🛡️",
      "Você já viu o guia público de vacinação na aba Comunidade? Vale muito salvar!",
      "Cuidar da saúde também é construir comunidade.",
    ],
  },
  {
    id: "p5",
    name: "Diego",
    shirt: "#f59e0b",
    skin: "#e0ac69",
    hair: "#1e1b4b",
    x: 420,
    y: 605,
    speed: 52,
    pauseTimer: 1.2,
    waypoints: [
      { x: 420, y: 605 },
      { x: 525, y: 645 },
      { x: 380, y: 550 },
    ],
    lines: [
      "Testando um set novo de house no fone enquanto dou uma volta por aqui 🎧",
      "O link do meu Spotify tá ativo lá no meu cartão Orbit!",
      "Imagina essa sala com áudio por proximidade num sábado à noite!",
    ],
  },
  {
    id: "p6",
    name: "Bruno",
    shirt: "#818cf8",
    skin: "#f1c27d",
    hair: "#713f12",
    x: 755,
    y: 365,
    speed: 50,
    pauseTimer: 1.6,
    waypoints: [
      { x: 755, y: 365 },
      { x: 830, y: 410 },
      { x: 700, y: 300 },
    ],
    lines: [
      "Cheguei na cidade essa semana! O Orbit tá me salvando pra fazer amizade 🗺️",
      "Você recomenda algum café ou bar legal aqui perto?",
      "Curti que dá pra mostrar os selos de vários apps num lugar só.",
    ],
  },
  {
    id: "p7",
    name: "Leo",
    shirt: "#60a5fa",
    skin: "#c68642",
    hair: "#111827",
    x: 600,
    y: 345,
    speed: 48,
    pauseTimer: 2.0,
    waypoints: [
      { x: 600, y: 345 },
      { x: 600, y: 265 },
      { x: 545, y: 315 },
    ],
    lines: [
      "A luz batendo nessa fonte central tá incrível pra fotografar 📸",
      "Dica: clica em mim ou se aproxima dos outros bonecos pra ver as histórias!",
      "Meu Instagram de fotografia tá linkado lá no meu perfil.",
    ],
  },
];
