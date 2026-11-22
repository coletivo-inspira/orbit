/**
 * Rooms of the Parque world map. City rooms are clay miniatures generated from
 * the real OpenStreetMap streets around `center` (see scripts/build-park-rooms.mts);
 * this file is also imported by that script, so it must stay dependency-free.
 */

export type LandmarkKind = "eiffel" | "peak" | "museum-frame" | "rainbow-flag" | "neon-sign";

export interface ParkRoomDefinition {
  id: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  center: { lat: number; lon: number };
  /** Half side of the square pulled from OpenStreetMap, in meters. */
  radiusM: number;
  landmark: {
    kind: LandmarkKind;
    label: string;
    /** OSM element drawn as the landmark instead of a regular block (e.g. "way/5013364"). */
    osmId?: string;
    /** Shown when someone taps the landmark. */
    fact: string;
  };
  /** Where people arrive, in meters from the center (x east, y south); defaults to in front of the landmark. */
  spawn?: { x: number; y: number };
  blurb: string;
  /** Shared by the bots in this room, so every city has its own small talk. */
  botLines: string[];
  /** How many of the simulated profiles walk around in this room. */
  botCount: number;
}

export const CENTRAL_PARK_ID = "parque-central";

export const CITY_ROOMS: ParkRoomDefinition[] = [
  {
    id: "paris-torre-eiffel",
    name: "Torre Eiffel",
    city: "Paris",
    country: "França",
    flag: "🇫🇷",
    center: { lat: 48.85826, lon: 2.2945 },
    radiusM: 100,
    landmark: {
      kind: "eiffel",
      label: "Tour Eiffel",
      osmId: "way/5013364",
      fact: "🗼 Tour Eiffel: 330 m de ferro pudlado, inaugurada em 1889.",
    },
    blurb: "Debaixo da torre, entre o Champ de Mars e o Sena.",
    botLines: [
      "Bonjour! Marquei de ver a torre acender às 22h, bora? ✨",
      "Dizem que o Marais é o bairro mais queer de Paris. Alguém já foi?",
      "Tirei foto de todos os pilares, falta só o de você na frente 📸",
      "Croissant na mão e Orbit no celular: combinação perfeita.",
      "Já subiu até o segundo andar? A vista do Sena é surreal.",
    ],
    botCount: 5,
  },
  {
    id: "rio-pao-de-acucar",
    name: "Pão de Açúcar",
    city: "Rio de Janeiro",
    country: "Brasil",
    flag: "🇧🇷",
    center: { lat: -22.94949, lon: -43.15616 },
    radiusM: 100,
    landmark: {
      kind: "peak",
      label: "Pão de Açúcar",
      fact: "⛰️ Pão de Açúcar: 396 m de granito; o bondinho sobe desde 1912.",
    },
    spawn: { x: -40, y: 17 },
    blurb: "No topo do morro, chegando de bondinho.",
    botLines: [
      "Subi de bondinho só pra ver o pôr do sol daqui 🌅",
      "Dá pra ver Copacabana inteira desse mirante!",
      "Depois daqui eu vou pra Farme de Amoedo, quem anima? 🏳️‍🌈",
      "Trouxe protetor solar a mais, se precisar é só pedir ☀️",
      "Já fez a trilha do Morro da Urca? Vale cada degrau.",
    ],
    botCount: 5,
  },
  {
    id: "sp-masp-paulista",
    name: "MASP · Av. Paulista",
    city: "São Paulo",
    country: "Brasil",
    flag: "🇧🇷",
    center: { lat: -23.5615, lon: -46.65596 },
    radiusM: 100,
    landmark: {
      kind: "museum-frame",
      label: "MASP",
      osmId: "way/1370081491",
      fact: "🏛️ MASP: o vão livre de 74 m de Lina Bo Bardi, aberto em 1968.",
    },
    blurb: "O vão livre do MASP, onde passa a Parada do Orgulho LGBT+.",
    botLines: [
      "Ano passado a Parada passou bem aqui pelo vão do MASP 🏳️‍🌈",
      "Domingo a Paulista fecha pros carros, é o melhor rolê da cidade.",
      "Alguém quer ver a exposição nova comigo? Tô na fila.",
      "Tem uma feirinha de antiguidades aqui embaixo no domingo!",
      "Depois bora tomar algo na Frei Caneca?",
    ],
    botCount: 6,
  },
  {
    id: "nyc-stonewall",
    name: "Stonewall Inn",
    city: "Nova York",
    country: "EUA",
    flag: "🇺🇸",
    center: { lat: 40.73382, lon: -74.00216 },
    radiusM: 100,
    landmark: {
      kind: "rainbow-flag",
      label: "Stonewall Inn",
      fact: "🏳️‍🌈 Stonewall Inn: a revolta de junho de 1969 inspirou as primeiras Paradas do Orgulho.",
    },
    blurb: "Christopher Street, berço do movimento moderno em 1969.",
    botLines: [
      "Foi aqui que tudo começou, em junho de 1969 ✊🏳️‍⚧️",
      "O Christopher Park ali na frente é monumento nacional.",
      "Vim pro Pride March, a cidade inteira fica colorida 🌈",
      "Bora pegar um café no West Village?",
      "Sempre me emociono passando por essa porta.",
    ],
    botCount: 5,
  },
  {
    id: "sf-castro",
    name: "Castro · Harvey Milk Plaza",
    city: "São Francisco",
    country: "EUA",
    flag: "🇺🇸",
    center: { lat: 37.76228, lon: -122.43561 },
    radiusM: 100,
    landmark: {
      kind: "rainbow-flag",
      label: "Harvey Milk Plaza",
      osmId: "way/225526801",
      fact: "🏳️‍🌈 Harvey Milk Plaza: a bandeira gigante homenageia Gilbert Baker, criador do arco-íris.",
    },
    blurb: "A esquina da bandeira gigante, no coração do Castro.",
    botLines: [
      "Olha o tamanho dessa bandeira arco-íris lá em cima! 🏳️‍🌈",
      "Harvey Milk discursava bem aqui nessa esquina.",
      "As faixas de pedestre do Castro são todas coloridas 🌈",
      "O cinema Castro tem sessão de clássicos hoje, vamos?",
      "Primeira vez em SF e já me sinto em casa.",
    ],
    botCount: 5,
  },
  {
    id: "tokyo-nichome",
    name: "Shinjuku Ni-chōme",
    city: "Tóquio",
    country: "Japão",
    flag: "🇯🇵",
    center: { lat: 35.69075, lon: 139.7074 },
    radiusM: 100,
    landmark: {
      kind: "neon-sign",
      label: "Ni-chōme",
      fact: "🏮 Ni-chōme: centenas de bares LGBT+ espremidos em poucas quadras de Shinjuku.",
    },
    blurb: "As ruelas de bares minúsculos de Shinjuku.",
    botLines: [
      "Konbanwa! Tem bar aqui que cabe só 8 pessoas 🏮",
      "Já anotei a data do Tokyo Pride desse ano 🏳️‍🌈",
      "Me perdi umas três vezes nessas ruelas, mas valeu a pena.",
      "Karaokê depois? Eu canto Pabllo Vittar 🎤",
      "Tudo aqui brilha em neon à noite, parece filme.",
    ],
    botCount: 6,
  },
];

export function findCityRoom(id: string | null | undefined): ParkRoomDefinition | null {
  return CITY_ROOMS.find((r) => r.id === id) ?? null;
}
