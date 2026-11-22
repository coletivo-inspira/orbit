import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMMUNITY_POSTS } from "@/lib/data/posts";
import { SIMULATED_PROFILES } from "@/lib/data/profiles";
import { articleRoute, profilePhotoUrl, publicPath, publicUrl } from "./publicUrl";

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

  it("prefixes profile photos with the base path", () => {
    expect(profilePhotoUrl("p1.webp", "/orbit")).toBe("/orbit/profiles/p1.webp");
    expect(profilePhotoUrl("p1.webp", "")).toBe("/profiles/p1.webp");
  });

  it("ships a photo file for every profile that declares one", () => {
    for (const p of SIMULATED_PROFILES) {
      if (p.photo) expect(existsSync(join(process.cwd(), "public/profiles", p.photo)), p.photo).toBe(true);
    }
  });
});
