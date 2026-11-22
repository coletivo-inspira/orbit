import { describe, expect, it } from "vitest";
import { CATEGORIA_LIST, CATEGORIAS } from "./categorias";
import { NENHUMA, PERGUNTAS } from "./perguntas";
import {
  categoriasDaPergunta,
  contarRespondidas,
  passoAnterior,
  perguntaPulada,
  pontuar,
  proximoPasso,
  resultadoOrdenado,
  sanitizarDesejos,
} from "./pontuacao";
import { DESEJOS_SIMULADOS } from "./perfis";
import type { CategoriaId, Pergunta, Respostas } from "./types";

const pct = (respostas: Respostas, id: CategoriaId, perguntas?: Pergunta[]) =>
  pontuar(respostas, perguntas).find((r) => r.id === id)!.pct;

const MINI: Pergunta[] = [
  { id: "i1", tipo: "intensidade", enunciado: "", ilustracao: "jantar", categorias: ["baunilha"] },
  { id: "r1", tipo: "rapida", enunciado: "", categorias: ["baunilha"] },
  {
    id: "c1",
    tipo: "cenas",
    enunciado: "",
    opcoes: [
      { id: "a", rotulo: "", ilustracao: "jantar", categorias: ["baunilha"] },
      { id: "b", rotulo: "", ilustracao: "palco", categorias: ["exibicionista", "voyeur"] },
    ],
  },
];

describe("banco de perguntas", () => {
  it("tem cerca de 24 perguntas nos três formatos", () => {
    expect(PERGUNTAS.length).toBeGreaterThanOrEqual(22);
    expect(PERGUNTAS.length).toBeLessThanOrEqual(26);
    const tipos = new Set(PERGUNTAS.map((p) => p.tipo));
    expect(tipos).toEqual(new Set(["cenas", "intensidade", "rapida"]));
  });

  it("usa ids únicos e cenas com 2 a 4 opções que alimentam 1 a 3 categorias", () => {
    expect(new Set(PERGUNTAS.map((p) => p.id)).size).toBe(PERGUNTAS.length);
    for (const p of PERGUNTAS) {
      if (p.tipo === "cenas") {
        expect(p.opcoes.length).toBeGreaterThanOrEqual(2);
        expect(p.opcoes.length).toBeLessThanOrEqual(4);
        expect(p.opcoes.map((o) => o.id)).not.toContain(NENHUMA);
        for (const o of p.opcoes) expect(o.categorias.length).toBeGreaterThanOrEqual(1);
        for (const o of p.opcoes) expect(o.categorias.length).toBeLessThanOrEqual(3);
      } else {
        expect(p.categorias.length).toBeGreaterThanOrEqual(1);
        expect(p.categorias.length).toBeLessThanOrEqual(3);
      }
    }
  });

  it("alimenta cada categoria com pelo menos 3 perguntas", () => {
    for (const { id } of CATEGORIA_LIST) {
      const itens = PERGUNTAS.filter((p) => categoriasDaPergunta(p).includes(id));
      expect(itens.length, id).toBeGreaterThanOrEqual(3);
    }
  });

  it("tem cerca de 16 categorias e perfis simulados só com categorias conhecidas", () => {
    expect(CATEGORIA_LIST.length).toBe(16);
    for (const desejos of Object.values(DESEJOS_SIMULADOS)) {
      for (const d of desejos) expect(CATEGORIAS[d.id]).toBeDefined();
    }
  });
});

describe("pontuar", () => {
  it("normaliza pelo máximo das perguntas respondidas", () => {
    // intensidade 2/3 + rápida "talvez" 1/2 + cena escolhida 2/2 = 5/7
    expect(pct({ i1: 2, r1: "talvez", c1: "a" }, "baunilha", MINI)).toBe(71);
    expect(pct({ i1: 3, r1: "sim", c1: "a" }, "baunilha", MINI)).toBe(100);
    expect(pct({ i1: 0, r1: "nao", c1: NENHUMA }, "baunilha", MINI)).toBe(0);
  });

  it("tira perguntas puladas do denominador", () => {
    expect(pct({ i1: 3, r1: "sim" }, "baunilha", MINI)).toBe(100);
    expect(pct({ i1: 3, c1: "a" }, "baunilha", MINI)).toBe(100);
  });

  it("mostra 'sem dados' com menos de 2 perguntas respondidas na categoria", () => {
    expect(pct({ i1: 3 }, "baunilha", MINI)).toBeNull();
    expect(pct({ c1: "b" }, "voyeur", MINI)).toBeNull();
    expect(pct({}, "baunilha", MINI)).toBeNull();
  });

  it("dá 2 pontos a todas as categorias da cena escolhida e 0 às demais", () => {
    const resultado = pontuar({ c1: "b", i1: 1 }, MINI);
    expect(resultado.find((r) => r.id === "exibicionista")!.respondidas).toBe(1);
    // baunilha: cena não escolhida 0/2 + intensidade 1/3 = 1/5
    expect(resultado.find((r) => r.id === "baunilha")!.pct).toBe(20);
  });

  it("mantém as categorias independentes, sem somar 100%", () => {
    const todasNoMaximo: Respostas = {};
    for (const p of PERGUNTAS)
      todasNoMaximo[p.id] = p.tipo === "intensidade" ? 3 : p.tipo === "rapida" ? "sim" : p.opcoes[0].id;
    const total = pontuar(todasNoMaximo).reduce((soma, r) => soma + (r.pct ?? 0), 0);
    expect(total).toBeGreaterThan(100);
  });

  it("ignora respostas inválidas", () => {
    expect(pct({ i1: 7 as never, r1: "sim", c1: "zzz" }, "baunilha", MINI)).toBeNull();
  });

  it("ordena do maior para o menor e deixa 'sem dados' no fim", () => {
    const ordenado = resultadoOrdenado({ "rapida-carinho": "sim", "cena-conexao": "jantar", "rapida-caca": "talvez" });
    expect(ordenado[0]).toMatchObject({ id: "baunilha", pct: 100 });
    expect(ordenado.at(-1)!.pct).toBeNull();
  });
});

describe("ramificação", () => {
  const filtro = PERGUNTAS.findIndex((p) => p.filtro === "poder");

  it("pula o aprofundamento de poder quando o filtro recebe 'nada' e registra 0", () => {
    const respostas: Respostas = { "intensidade-poder": 0, "cena-papel": "coroa" };
    const proximo = proximoPasso(filtro, respostas);
    expect(PERGUNTAS[proximo].aprofunda).toBeUndefined();
    expect(perguntaPulada(PERGUNTAS[filtro + 1], respostas)).toBe(true);
    expect(passoAnterior(proximo, respostas)).toBe(filtro);
    expect(pct(respostas, "dominante")).toBe(0);
    expect(pct(respostas, "submisso")).toBe(0);
  });

  it("segue normalmente quando o filtro recebe outra resposta", () => {
    expect(proximoPasso(filtro, { "intensidade-poder": 1 })).toBe(filtro + 1);
  });
});

describe("sanitizarDesejos", () => {
  it("descarta perguntas, respostas e categorias desconhecidas", () => {
    const estado = sanitizarDesejos({
      respostas: { "rapida-carinho": "sim", "intensidade-sentidos": 9, inventada: "sim" },
      publicos: ["baunilha", "baunilha", "telepatia", 3],
      passo: 999,
      concluido: true,
    });
    expect(estado.respostas).toEqual({ "rapida-carinho": "sim" });
    expect(estado.publicos).toEqual(["baunilha"]);
    expect(estado.passo).toBe(PERGUNTAS.length - 1);
    expect(estado.concluido).toBe(true);
    expect(contarRespondidas(estado.respostas)).toBe(1);
  });

  it("volta ao estado vazio, privado, com payload corrompido", () => {
    expect(sanitizarDesejos("oi")).toEqual({ respostas: {}, passo: 0, concluido: false, publicos: [] });
    expect(sanitizarDesejos(null).publicos).toEqual([]);
  });
});
