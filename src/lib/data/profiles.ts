import type { Profile } from "@/lib/types";

/** Demo profiles so the Órbita never looks empty (cold-start mitigation from the product conversations). */
export const SIMULATED_PROFILES: Profile[] = [
  {
    id: "p1",
    name: "Matheus",
    age: 26,
    dist: "180m",
    online: true,
    inPark: true,
    primaryIntention: "amizade",
    intentions: ["amizade", "troca"],
    bio: "Designer de produto, apaixonado por café gelado e procurando meu gato Paçoca pelo parque.",
    avatar: {
      bg: "#1e3a8a",
      skin: "#f1c27d",
      hair: "#1f2937",
      shirt: "#38bdf8",
      accessory: "glasses",
    },
    apps: {
      grindr: {
        active: true,
      },
      scruff: {
        active: false,
      },
      tinder: {
        active: true,
      },
      insta: {
        active: true,
        handle: "@matheus.ux",
      },
      spotify: {
        active: true,
        handle: "matheus.sounds",
      },
    },
  },
  {
    id: "p2",
    name: "Rafa",
    age: 29,
    dist: "320m",
    online: true,
    inPark: true,
    primaryIntention: "casual",
    intentions: ["casual", "troca"],
    bio: "Curto academia de manhã, eletrônica à noite e conversas sem enrolação.",
    avatar: {
      bg: "#7c2d12",
      skin: "#c68642",
      hair: "#111827",
      shirt: "#fb923c",
      accessory: "beard",
    },
    apps: {
      grindr: {
        active: true,
      },
      scruff: {
        active: true,
      },
      tinder: {
        active: false,
      },
      insta: {
        active: true,
        handle: "@rafa.fitsp",
      },
    },
  },
  {
    id: "p3",
    name: "Thiago",
    age: 24,
    dist: "450m",
    online: true,
    inPark: true,
    primaryIntention: "namoro",
    intentions: ["namoro", "troca"],
    bio: "Cinema independente, livrarias de rua e alguém legal pra dividir um vinho no domingo.",
    avatar: {
      bg: "#581c87",
      skin: "#ffdbac",
      hair: "#451a03",
      shirt: "#c084fc",
      accessory: "none",
    },
    apps: {
      grindr: {
        active: false,
      },
      scruff: {
        active: false,
      },
      tinder: {
        active: true,
      },
      bumble: {
        active: true,
      },
      insta: {
        active: true,
        handle: "@thiago.cine",
      },
      spotify: {
        active: true,
        handle: "thiago.indie",
      },
    },
  },
  {
    id: "p4",
    name: "Dani",
    age: 27,
    dist: "510m",
    online: true,
    inPark: true,
    primaryIntention: "apoio",
    intentions: ["apoio", "amizade"],
    bio: "Enfermeiro no SUS e voluntário em campanhas de PrEP e vacinação. Manda dúvida sem medo!",
    avatar: {
      bg: "#064e3b",
      skin: "#8d5524",
      hair: "#0f172a",
      shirt: "#34d399",
      accessory: "glasses",
    },
    apps: {
      grindr: {
        active: true,
      },
      scruff: {
        active: true,
      },
      insta: {
        active: true,
        handle: "@dani.saude",
      },
    },
  },
  {
    id: "p5",
    name: "Diego",
    age: 31,
    dist: "640m",
    online: true,
    inPark: true,
    primaryIntention: "troca",
    intentions: ["troca", "casual"],
    bio: "Engenheiro de software, DJ amador nos fins de semana e viciado em café coado.",
    avatar: {
      bg: "#78350f",
      skin: "#e0ac69",
      hair: "#1e1b4b",
      shirt: "#f59e0b",
      accessory: "beard",
    },
    apps: {
      grindr: {
        active: true,
      },
      scruff: {
        active: true,
      },
      tinder: {
        active: true,
      },
      spotify: {
        active: true,
        handle: "dj.diego",
      },
    },
  },
  {
    id: "p6",
    name: "Bruno",
    age: 25,
    dist: "790m",
    online: true,
    inPark: true,
    primaryIntention: "amizade",
    intentions: ["amizade", "apoio"],
    bio: "Recém-chegado na cidade! Topando rolês culturais, parques e conhecer gente do vale.",
    avatar: {
      bg: "#1e1b4b",
      skin: "#f1c27d",
      hair: "#713f12",
      shirt: "#818cf8",
      accessory: "cap",
    },
    apps: {
      grindr: {
        active: true,
      },
      tinder: {
        active: true,
      },
      insta: {
        active: true,
        handle: "@bruno.nomad",
      },
    },
  },
  {
    id: "p7",
    name: "Leo",
    age: 28,
    dist: "850m",
    online: true,
    inPark: true,
    primaryIntention: "troca",
    intentions: ["troca", "namoro"],
    bio: "Fotógrafo urbano. Sempre testando lentes novas perto da fonte do parque.",
    avatar: {
      bg: "#0f172a",
      skin: "#c68642",
      hair: "#111827",
      shirt: "#60a5fa",
      accessory: "none",
    },
    apps: {
      grindr: {
        active: false,
      },
      scruff: {
        active: true,
      },
      bumble: {
        active: true,
      },
      insta: {
        active: true,
        handle: "@leo.frames",
      },
    },
  },
  {
    id: "p8",
    name: "Caio",
    age: 23,
    dist: "920m",
    online: true,
    inPark: false,
    primaryIntention: "casual",
    intentions: ["casual"],
    bio: "Noite livre por aqui. Sem burocracia e boa energia.",
    avatar: {
      bg: "#881337",
      skin: "#ffdbac",
      hair: "#27272a",
      shirt: "#fb7185",
      accessory: "none",
    },
    apps: {
      grindr: {
        active: true,
      },
      tinder: {
        active: true,
      },
    },
  },
  {
    id: "p9",
    name: "Vitor",
    age: 33,
    dist: "1.1km",
    online: false,
    inPark: false,
    primaryIntention: "namoro",
    intentions: ["namoro", "amizade"],
    bio: "Arquiteto, pai de duas plantas sobreviventes e fã de gastronomia de boteco.",
    avatar: {
      bg: "#312e81",
      skin: "#e0ac69",
      hair: "#3f3f46",
      shirt: "#a5b4fc",
      accessory: "beard",
    },
    apps: {
      scruff: {
        active: true,
      },
      bumble: {
        active: true,
      },
      insta: {
        active: true,
        handle: "@vitor.arq",
      },
    },
  },
  {
    id: "p10",
    name: "Gui",
    age: 26,
    dist: "1.2km",
    online: true,
    inPark: false,
    primaryIntention: "troca",
    intentions: ["troca", "amizade"],
    bio: "Dev front-end construindo projetos paralelos e ouvindo pop alternativo.",
    avatar: {
      bg: "#164e63",
      skin: "#f1c27d",
      hair: "#0f172a",
      shirt: "#22d3ee",
      accessory: "glasses",
    },
    apps: {
      grindr: {
        active: true,
      },
      insta: {
        active: true,
        handle: "@gui.codes",
      },
      spotify: {
        active: true,
        handle: "gui.dev",
      },
    },
  },
  {
    id: "p11",
    name: "Henrique",
    age: 30,
    dist: "1.4km",
    online: false,
    inPark: false,
    primaryIntention: "casual",
    intentions: ["casual", "amizade"],
    bio: "Corrida no parque, cerveja artesanal e papo reto.",
    avatar: {
      bg: "#3f6212",
      skin: "#8d5524",
      hair: "#18181b",
      shirt: "#a3e635",
      accessory: "beard",
    },
    apps: {
      grindr: {
        active: true,
      },
      scruff: {
        active: true,
      },
    },
  },
  {
    id: "p12",
    name: "Igor",
    age: 25,
    dist: "1.5km",
    online: true,
    inPark: false,
    primaryIntention: "apoio",
    intentions: ["apoio", "troca"],
    bio: "Psicólogo clínico com foco em acolhimento LGBT+. Amo trocar recomendações de livros.",
    avatar: {
      bg: "#0c4a6e",
      skin: "#ffdbac",
      hair: "#451a03",
      shirt: "#38bdf8",
      accessory: "glasses",
    },
    apps: {
      bumble: {
        active: true,
      },
      insta: {
        active: true,
        handle: "@igor.psi",
      },
    },
  },
  {
    id: "p13",
    name: "Pedro",
    age: 27,
    dist: "1.7km",
    online: true,
    inPark: false,
    primaryIntention: "namoro",
    intentions: ["namoro", "troca"],
    bio: "Cozinho massa fresca muito bem. Procurando companhia pra estrear uma receita nova.",
    avatar: {
      bg: "#701a75",
      skin: "#c68642",
      hair: "#171717",
      shirt: "#e879f9",
      accessory: "none",
    },
    apps: {
      tinder: {
        active: true,
      },
      bumble: {
        active: true,
      },
      insta: {
        active: true,
        handle: "@pedro.chef",
      },
    },
  },
  {
    id: "p14",
    name: "Sam",
    age: 24,
    dist: "1.9km",
    online: false,
    inPark: false,
    primaryIntention: "amizade",
    intentions: ["amizade", "troca"],
    bio: "Ilustrador 2D e viciado em pixel art. Adoro rolês de jogos de tabuleiro.",
    avatar: {
      bg: "#134e4a",
      skin: "#f1c27d",
      hair: "#4c1d95",
      shirt: "#2dd4bf",
      accessory: "cap",
    },
    apps: {
      grindr: {
        active: true,
      },
      insta: {
        active: true,
        handle: "@sam.pixels",
      },
      spotify: {
        active: true,
        handle: "sam.lofi",
      },
    },
  },
  {
    id: "p15",
    name: "Alex",
    age: 32,
    dist: "2.1km",
    online: true,
    inPark: false,
    primaryIntention: "casual",
    intentions: ["casual", "troca"],
    bio: "Viagens curtas de carro, música alta e boas companhias.",
    avatar: {
      bg: "#450a0a",
      skin: "#e0ac69",
      hair: "#1c1917",
      shirt: "#f87171",
      accessory: "beard",
    },
    apps: {
      grindr: {
        active: true,
      },
      scruff: {
        active: true,
      },
      tinder: {
        active: true,
      },
    },
  },
  {
    id: "p16",
    name: "André",
    age: 28,
    dist: "2.3km",
    online: false,
    inPark: false,
    primaryIntention: "troca",
    intentions: ["troca", "apoio"],
    bio: "Produtor cultural organizando rodas de conversa e saraus independentes.",
    avatar: {
      bg: "#3b0764",
      skin: "#8d5524",
      hair: "#09090b",
      shirt: "#c084fc",
      accessory: "none",
    },
    apps: {
      insta: {
        active: true,
        handle: "@andre.cultura",
      },
      spotify: {
        active: true,
        handle: "andre.mpb",
      },
    },
  },
  {
    id: "p17",
    name: "Felipe",
    age: 26,
    dist: "2.6km",
    online: true,
    inPark: false,
    primaryIntention: "amizade",
    intentions: ["amizade", "namoro"],
    bio: "Trilhas nos fins de semana e viciado em séries de ficção científica.",
    avatar: {
      bg: "#14532d",
      skin: "#ffdbac",
      hair: "#3f2e21",
      shirt: "#4ade80",
      accessory: "none",
    },
    apps: {
      tinder: {
        active: true,
      },
      insta: {
        active: true,
        handle: "@felipe.trilhas",
      },
    },
  },
  {
    id: "p18",
    name: "Nando",
    age: 29,
    dist: "2.9km",
    online: true,
    inPark: false,
    primaryIntention: "casual",
    intentions: ["casual", "amizade"],
    bio: "Bom humor acima de tudo. Se tiver café ou praia na jogada, já ganhou pontos.",
    avatar: {
      bg: "#1e3a8a",
      skin: "#c68642",
      hair: "#18181b",
      shirt: "#60a5fa",
      accessory: "glasses",
    },
    apps: {
      grindr: {
        active: true,
      },
      scruff: {
        active: true,
      },
      insta: {
        active: true,
        handle: "@nando.rio",
      },
    },
  },
];
