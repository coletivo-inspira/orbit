import type { Region, RegionalAlert, RegionId, SourceLink } from "@/lib/types";

export const REGIONS: Record<RegionId, Region> = {
  "belo-horizonte": {
    id: "belo-horizonte",
    city: "Belo Horizonte",
    uf: "MG",
    healthLabel: "Prefeitura de Belo Horizonte · Saúde",
    healthUrl: "https://prefeitura.pbh.gov.br/saude",
  },
  "sao-paulo": {
    id: "sao-paulo",
    city: "São Paulo",
    uf: "SP",
    healthLabel: "Prefeitura de São Paulo · Saúde",
    healthUrl: "https://prefeitura.sp.gov.br/web/saude",
  },
  "rio-de-janeiro": {
    id: "rio-de-janeiro",
    city: "Rio de Janeiro",
    uf: "RJ",
    healthLabel: "Prefeitura do Rio · Saúde",
    healthUrl: "https://saude.prefeitura.rio/",
  },
  recife: {
    id: "recife",
    city: "Recife",
    uf: "PE",
    healthLabel: "Prefeitura do Recife · Secretaria de Saúde",
    healthUrl: "https://www2.recife.pe.gov.br/pagina/secretaria-de-saude",
  },
  "porto-alegre": {
    id: "porto-alegre",
    city: "Porto Alegre",
    uf: "RS",
    healthLabel: "Prefeitura de Porto Alegre · Saúde",
    healthUrl: "https://prefeitura.poa.br/sms",
  },
  salvador: {
    id: "salvador",
    city: "Salvador",
    uf: "BA",
    healthLabel: "Prefeitura de Salvador · Saúde",
    healthUrl: "https://saude.salvador.ba.gov.br/",
  },
  brasilia: {
    id: "brasilia",
    city: "Brasília",
    uf: "DF",
    healthLabel: "Secretaria de Saúde do DF",
    healthUrl: "https://www.saude.df.gov.br/",
  },
};

export const REGION_LIST = Object.values(REGIONS);
export const DEFAULT_REGION: RegionId = "belo-horizonte";

export function isRegionId(value: unknown): value is RegionId {
  return typeof value === "string" && Object.hasOwn(REGIONS, value);
}

const OFFICIAL = {
  mpox: { label: "Ministério da Saúde · Mpox", url: "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/m/mpox" },
  prep: {
    label: "Ministério da Saúde · PrEP",
    url: "https://www.gov.br/aids/pt-br/assuntos/prevencao-combinada/prep-profilaxia-pre-exposicao",
  },
  pep: {
    label: "Ministério da Saúde · PEP",
    url: "https://www.gov.br/aids/pt-br/assuntos/prevencao-combinada/pep-profilaxia-pos-exposicao-ao-hiv",
  },
  combinada: {
    label: "Ministério da Saúde · Prevenção combinada",
    url: "https://www.gov.br/aids/pt-br/assuntos/prevencao-combinada",
  },
  caps: { label: "Ministério da Saúde · CAPS", url: "https://www.gov.br/saude/pt-br/composicao/saes/desmad/raps/caps" },
  cvv: { label: "CVV · Centro de Valorização da Vida", url: "https://cvv.org.br/" },
} satisfies Record<string, SourceLink>;

/** Order in which each city's feed highlights topics, so regions don't all look identical. */
const HIGHLIGHTS: Record<RegionId, string[]> = {
  "belo-horizonte": ["mpox", "prep", "testagem", "mental"],
  "sao-paulo": ["prep", "testagem", "mpox", "mental"],
  "rio-de-janeiro": ["testagem", "mpox", "prep", "mental"],
  recife: ["mpox", "testagem", "mental", "prep"],
  "porto-alegre": ["mental", "prep", "mpox", "testagem"],
  salvador: ["testagem", "prep", "mpox", "mental"],
  brasilia: ["prep", "mpox", "mental", "testagem"],
};

/**
 * Demo alerts built from templates: they show how regional campaigns would surface,
 * without claiming any campaign is actually running. Every card links to an official source.
 */
export function regionalAlerts(regionId: RegionId): RegionalAlert[] {
  const region = REGIONS[regionId];
  const city: SourceLink = { label: region.healthLabel, url: region.healthUrl };
  const templates: Record<string, RegionalAlert> = {
    mpox: {
      id: `${regionId}-mpox`,
      emoji: "💉",
      title: `Vacinação contra mpox em ${region.city}`,
      text: "Quando houver campanha para públicos prioritários, este card mostra postos, horários e quem pode se vacinar. Confira se há vacinação em andamento na fonte oficial.",
      sources: [city, OFFICIAL.mpox],
    },
    prep: {
      id: `${regionId}-prep`,
      emoji: "🛡️",
      title: `Onde retirar PrEP e PEP em ${region.city}`,
      text: "PrEP e PEP são oferecidas pelo SUS. A PEP é uma urgência: deve começar o quanto antes após uma exposição de risco. Veja os serviços de referência da sua cidade.",
      sources: [OFFICIAL.prep, OFFICIAL.pep, city],
    },
    testagem: {
      id: `${regionId}-testagem`,
      emoji: "🧪",
      title: `Testagem rápida de HIV e ISTs em ${region.city}`,
      text: "Exemplo de mutirão de testagem gratuita e sigilosa. Datas e locais reais ficam na página da secretaria municipal de saúde.",
      sources: [city, OFFICIAL.combinada],
    },
    mental: {
      id: `${regionId}-mental`,
      emoji: "🧠",
      title: `Saúde mental e CAPS em ${region.city}`,
      text: "Os CAPS fazem acolhimento em saúde mental pelo SUS. Em crise, o CVV atende de graça pelo 188, 24 horas.",
      sources: [OFFICIAL.caps, OFFICIAL.cvv, city],
    },
  };
  return HIGHLIGHTS[regionId].map((key) => templates[key]);
}
