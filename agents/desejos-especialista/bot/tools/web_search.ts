import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { getJson, stripTags } from "../lib/http.js";

type Resultado = {
  titulo: string;
  autores: string;
  ano: string;
  veiculo: string;
  url: string;
  doi: string;
  trecho: string;
};

type EuropePmc = {
  hitCount: number;
  resultList: {
    result: Array<{
      title?: string;
      authorString?: string;
      pubYear?: string;
      journalTitle?: string;
      bookOrReportDetails?: { publisher?: string };
      doi?: string;
      pmid?: string;
      pmcid?: string;
    }>;
  };
};

type Crossref = {
  message: {
    "total-results": number;
    items: Array<{
      title?: string[];
      author?: Array<{ family?: string; given?: string }>;
      issued?: { "date-parts"?: number[][] };
      "container-title"?: string[];
      publisher?: string;
      DOI?: string;
      URL?: string;
      type?: string;
    }>;
  };
};

type Wikipedia = {
  query?: { searchinfo?: { totalhits: number }; search: Array<{ title: string; snippet: string; timestamp: string }> };
};

async function buscarArtigos(consulta: string, limite: number) {
  const url = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
  url.search = new URLSearchParams({
    query: consulta,
    format: "json",
    resultType: "lite",
    pageSize: String(limite),
  }).toString();
  const dados = await getJson<EuropePmc>(url);
  const resultados: Resultado[] = dados.resultList.result.map((item) => ({
    titulo: item.title ?? "",
    autores: item.authorString ?? "",
    ano: item.pubYear ?? "",
    veiculo: item.journalTitle ?? item.bookOrReportDetails?.publisher ?? "",
    url: item.doi
      ? `https://doi.org/${item.doi}`
      : item.pmid
        ? `https://pubmed.ncbi.nlm.nih.gov/${item.pmid}/`
        : item.pmcid
          ? `https://pmc.ncbi.nlm.nih.gov/articles/${item.pmcid}/`
          : "",
    doi: item.doi ?? "",
    trecho: "",
  }));
  return { total: dados.hitCount, resultados };
}

async function buscarCrossref(consulta: string, limite: number) {
  const url = new URL("https://api.crossref.org/works");
  url.search = new URLSearchParams({
    "query.bibliographic": consulta,
    rows: String(limite),
    select: "title,author,issued,container-title,publisher,DOI,URL,type",
  }).toString();
  const dados = await getJson<Crossref>(url);
  const resultados: Resultado[] = dados.message.items.map((item) => ({
    titulo: item.title?.[0] ?? "",
    autores: (item.author ?? [])
      .slice(0, 6)
      .map((a) => [a.family, a.given].filter(Boolean).join(", "))
      .join("; "),
    ano: String(item.issued?.["date-parts"]?.[0]?.[0] ?? ""),
    veiculo: item["container-title"]?.[0] ?? item.publisher ?? "",
    url: item.DOI ? `https://doi.org/${item.DOI}` : (item.URL ?? ""),
    doi: item.DOI ?? "",
    trecho: item.type ?? "",
  }));
  return { total: dados.message["total-results"], resultados };
}

async function buscarWikipedia(consulta: string, limite: number, idioma: "pt" | "en") {
  const url = new URL(`https://${idioma}.wikipedia.org/w/api.php`);
  url.search = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: consulta,
    srlimit: String(limite),
    format: "json",
  }).toString();
  const dados = await getJson<Wikipedia>(url);
  const resultados: Resultado[] = (dados.query?.search ?? []).map((item) => ({
    titulo: item.title,
    autores: "Wikipedia",
    ano: item.timestamp.slice(0, 4),
    veiculo: `${idioma}.wikipedia.org`,
    url: `https://${idioma}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
    doi: "",
    trecho: stripTags(item.snippet),
  }));
  return { total: dados.query?.searchinfo?.totalhits ?? resultados.length, resultados };
}

export default defineTool({
  description: prompt`
    Busca fontes citáveis sem chave de API.
    fonte="artigos": literatura biomédica e psicológica (Europe PMC, inclui PubMed). Use termos em inglês.
    fonte="crossref": qualquer publicação com DOI, incluindo livros e capítulos.
    fonte="wikipedia": visão geral e terminologia; nunca use como única fonte de um fato científico.
    Devolve título, autores, ano, veículo, URL e DOI. Depois leia o resumo com fetch_page antes de citar.
  `,
  inputSchema: z.object({
    consulta: z.string().min(2).max(300),
    fonte: z.enum(["artigos", "crossref", "wikipedia"]).default("artigos"),
    idioma: z.enum(["pt", "en"]).default("pt").describe("Só para fonte=wikipedia."),
    limite: z.number().int().min(1).max(10).default(5),
  }),
  effect: "read",
  async execute({ consulta, fonte, idioma, limite }) {
    const { total, resultados } =
      fonte === "artigos"
        ? await buscarArtigos(consulta, limite)
        : fonte === "crossref"
          ? await buscarCrossref(consulta, limite)
          : await buscarWikipedia(consulta, limite, idioma);
    return { consulta, fonte, total, resultados };
  },
});
