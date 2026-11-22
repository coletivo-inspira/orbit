import { describe, expect, it } from "vitest";
import { COMMUNITY_POSTS } from "@/lib/data/posts";
import { articleRoute, publicPath, publicUrl } from "./publicUrl";

describe("publicUrl", () => {
  it("keeps the GitHub Pages base path", () => {
    expect(publicUrl(articleRoute("c1"), "https://coletivo-inspira.github.io", "/orbit")).toBe(
      "https://coletivo-inspira.github.io/orbit/comunidade/c1/",
    );
  });

  it("works when published at the domain root", () => {
    expect(publicUrl(articleRoute("c1"), "https://orbit.example", "")).toBe("https://orbit.example/comunidade/c1/");
  });

  it("normalizes slashes", () => {
    expect(publicPath("/comunidade/", "/orbit/")).toBe("/orbit/comunidade/");
    expect(publicPath("/", "/orbit")).toBe("/orbit/");
    expect(publicPath("/", "")).toBe("/");
  });

  it("builds one URL per exported article", () => {
    const urls = COMMUNITY_POSTS.map((p) => publicUrl(articleRoute(p.id), "https://x.dev", "/orbit"));
    expect(new Set(urls).size).toBe(COMMUNITY_POSTS.length);
    urls.forEach((u) => expect(u).toMatch(/^https:\/\/x\.dev\/orbit\/comunidade\/c\d\/$/));
  });
});
