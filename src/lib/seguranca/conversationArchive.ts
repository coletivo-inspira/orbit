import type { Speaker } from "@/lib/conversas";

export interface ArchiveEntry {
  profileId: string;
  from: Speaker;
  text: string;
  /** ISO timestamp. */
  at: string;
}

/**
 * Full conversation record kept for safety (reports, court orders), separate from
 * what the user sees (only the last line of each side). The production backend
 * stores it server-side, encrypted, readable only through audited moderation access.
 */
export interface ConversationArchive {
  append(entry: ArchiveEntry): Promise<void>;
}

interface SealedRecord {
  iv: Uint8Array<ArrayBuffer>;
  data: ArrayBuffer;
}

/**
 * Modo Explorar stand-in: AES-GCM with a non-extractable key generated per session.
 * Ciphertext stays in memory and vanishes with the tab; nothing leaves the device.
 */
export class LocalEncryptedArchive implements ConversationArchive {
  private readonly key: Promise<CryptoKey>;
  private readonly records: SealedRecord[] = [];

  constructor(private readonly subtle: SubtleCrypto = globalThis.crypto.subtle) {
    this.key = subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }

  get size(): number {
    return this.records.length;
  }

  async append(entry: ArchiveEntry): Promise<void> {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode(JSON.stringify(entry));
    const data = await this.subtle.encrypt({ name: "AES-GCM", iv }, await this.key, plain);
    this.records.push({ iv, data });
  }

  /** Raw sealed bytes, as a storage backend would hold them. */
  sealed(): readonly SealedRecord[] {
    return this.records;
  }

  /** Moderation path; in production it runs server-side and every call is audited. */
  async openForReview(): Promise<ArchiveEntry[]> {
    const key = await this.key;
    const decoder = new TextDecoder();
    return Promise.all(
      this.records.map(
        async ({ iv, data }) =>
          JSON.parse(decoder.decode(await this.subtle.decrypt({ name: "AES-GCM", iv }, key, data))) as ArchiveEntry,
      ),
    );
  }
}

const noopArchive: ConversationArchive = { append: async () => {} };

/** Web Crypto only exists in secure contexts (HTTPS or localhost). */
export function createConversationArchive(): ConversationArchive {
  return globalThis.crypto?.subtle ? new LocalEncryptedArchive() : noopArchive;
}
