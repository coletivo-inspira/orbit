const USER_AGENT = "orbit-desejos-especialista/0.1 (+https://github.com/coletivo-inspira/orbit)";
const TIMEOUT_MS = 30_000;

// Bloqueia endereços locais e privados: a URL vem do modelo, que lê conteúdo da web não confiável.
const PRIVATE_HOST =
  /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[?::1\]?|\[?f[cd][0-9a-f]{2}:.*)$/i;

export function assertPublicUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Protocolo não permitido: ${url.protocol}`);
  }
  if (PRIVATE_HOST.test(url.hostname)) {
    throw new Error(`Endereço não permitido: ${url.hostname}`);
  }
  return url;
}

const MAX_REDIRECTS = 5;

export async function getText(url: URL, accept = "text/html,application/json;q=0.9,*/*;q=0.5") {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(current, {
      headers: { "user-agent": USER_AGENT, accept },
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      // Cada salto passa de novo pela checagem de endereço público.
      current = assertPublicUrl(new URL(location, current).href);
      continue;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} em ${current.href}`);
    }
    return {
      finalUrl: current.href,
      contentType: response.headers.get("content-type") ?? "",
      body: await response.text(),
    };
  }
  throw new Error(`Redirecionamentos demais a partir de ${url.href}`);
}

export async function getJson<T>(url: URL): Promise<T> {
  const { body } = await getText(url, "application/json");
  return JSON.parse(body) as T;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

export function htmlToText(html: string): { title: string; text: string } {
  const title = stripTags(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
  const body = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  const text = decodeEntities(body.replace(/<[^>]+>/g, " "))
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  return { title, text };
}
