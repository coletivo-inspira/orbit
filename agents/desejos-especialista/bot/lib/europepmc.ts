import { getJson, stripTags } from "./http.js";

type Core = {
  resultList: {
    result: Array<{
      title?: string;
      authorString?: string;
      pubYear?: string;
      journalTitle?: string;
      journalInfo?: { journal?: { title?: string } };
      doi?: string;
      pmid?: string;
      abstractText?: string;
    }>;
  };
};

export type Resumo = {
  titulo: string;
  autores: string;
  ano: string;
  veiculo: string;
  doi: string;
  pmid: string;
  resumo: string;
};

// PubMed e muitos sites de editoras bloqueiam leitura automática; a Europe PMC devolve o mesmo resumo por API.
export function identificadorDeArtigo(url: URL): string | null {
  const pmid = /^\/(\d{5,9})\/?$/.exec(url.pathname);
  if (url.hostname === "pubmed.ncbi.nlm.nih.gov" && pmid) {
    return `EXT_ID:${pmid[1]} AND SRC:MED`;
  }
  if (url.hostname === "doi.org" || url.hostname === "dx.doi.org") {
    const doi = decodeURIComponent(url.pathname.slice(1));
    return doi ? `DOI:"${doi}"` : null;
  }
  return null;
}

export async function buscarResumo(query: string): Promise<Resumo | null> {
  const url = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
  url.search = new URLSearchParams({ query, format: "json", resultType: "core", pageSize: "1" }).toString();
  const item = (await getJson<Core>(url)).resultList.result[0];
  if (!item?.abstractText) return null;
  return {
    titulo: item.title ?? "",
    autores: item.authorString ?? "",
    ano: item.pubYear ?? "",
    veiculo: item.journalInfo?.journal?.title ?? item.journalTitle ?? "",
    doi: item.doi ?? "",
    pmid: item.pmid ?? "",
    resumo: stripTags(item.abstractText.replace(/<\/?h4>/g, " ")),
  };
}
