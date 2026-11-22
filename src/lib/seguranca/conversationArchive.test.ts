import { describe, expect, it } from "vitest";
import { recordLine } from "@/lib/conversas";
import { LocalEncryptedArchive, type ArchiveEntry } from "./conversationArchive";

const entry = (text: string, from: ArchiveEntry["from"] = "me"): ArchiveEntry => ({
  profileId: "p1",
  from,
  text,
  at: "2026-11-22T11:00:00.000Z",
});

describe("LocalEncryptedArchive", () => {
  it("never holds the message in plain text", async () => {
    const archive = new LocalEncryptedArchive();
    await archive.append(entry("segredo da conversa"));
    const [record] = archive.sealed();
    const bytes = new TextDecoder("utf-8", { fatal: false }).decode(record.data);
    expect(bytes).not.toContain("segredo");
    expect(record.iv).toHaveLength(12);
  });

  it("keeps the full history for review while the user only sees the last lines", async () => {
    const archive = new LocalEncryptedArchive();
    const lines = [entry("Oi!"), entry("Oi, tudo bem?", "them"), entry("Tudo e você?"), entry("De boa", "them")];
    let visible = {};
    for (const line of lines) {
      await archive.append(line);
      visible = recordLine(visible, line.profileId, line.from, line.text);
    }
    expect(archive.size).toBe(4);
    expect(await archive.openForReview()).toEqual(lines);
    expect(visible).toEqual({ p1: { mine: "Tudo e você?", theirs: "De boa" } });
  });

  it("uses a fresh IV for every message", async () => {
    const archive = new LocalEncryptedArchive();
    await archive.append(entry("a"));
    await archive.append(entry("a"));
    const [a, b] = archive.sealed();
    expect(Buffer.from(a.iv).equals(Buffer.from(b.iv))).toBe(false);
  });
});
