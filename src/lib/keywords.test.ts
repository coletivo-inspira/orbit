import { describe, expect, it } from "vitest";
import { extractKeywords, normalizeSearch, sameTag, sanitizeTags } from "./keywords";

describe("extractKeywords", () => {
  it("drops articles, prepositions and filler words", () => {
    const tags = extractKeywords(
      "Qual filme ou série LGBTQIA+ todo mundo deveria ver?",
      "Eu começo: Moonlight e Pose.",
    );
    expect(tags).toContain("filme");
    expect(tags).toContain("série");
    for (const stop of ["qual", "ou", "todo", "ver", "eu", "e"]) expect(tags).not.toContain(stop);
  });

  it("ranks repeated and title words first, capped", () => {
    const tags = extractKeywords("PrEP diária ou sob demanda", "A PrEP previne o HIV. PrEP é gratuita no SUS.", 3);
    expect(tags[0]).toBe("prep");
    expect(tags).toHaveLength(3);
  });

  it("merges plurals and accents into one tag, showing the singular", () => {
    const tags = extractKeywords("Filmes e séries", "Um filme, uma série, mais filmes");
    expect(tags.filter((t) => sameTag(t, "filme"))).toEqual(["filme"]);
    expect(tags.filter((t) => sameTag(t, "serie"))).toHaveLength(1);
  });

  it("ignores numbers and very short words", () => {
    expect(extractKeywords("2 em 1 é ok", "")).toEqual([]);
  });
});

describe("sanitizeTags", () => {
  it("strips #, dedupes by tag and caps the list", () => {
    expect(sanitizeTags(["#Cinema", "cinema", "  séries ", 3, "x"], 5)).toEqual(["cinema", "séries"]);
    expect(sanitizeTags("cinema")).toEqual([]);
  });
});

describe("normalizeSearch", () => {
  it("compares without accents or case", () => {
    expect(normalizeSearch("  Saúde Mental ")).toBe("saude mental");
  });
});
