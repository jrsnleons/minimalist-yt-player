/**
 * Wire format for moving a library backup between devices over an Ably channel.
 * Ably's free plan caps a message at 64 KB, so the JSON text is split into chunks that each
 * stay under ~48 KB once encoded. Every chunk carries its index, the total and a checksum;
 * the whole payload is verified with SHA-256 before anything is imported.
 */

export const TRANSFER_MESSAGE = 'xfer';
export const MAX_MESSAGE_BYTES = 48 * 1024;
export const MAX_CHUNKS = 1000;
export const MAX_TOTAL_BYTES = 40 * 1024 * 1024;

export interface TransferSummary {
  playlistCount: number;
  trackCount: number;
  historyCount: number;
}

export type TransferMessage =
  | { t: 'request' }
  | { t: 'declined' }
  | { t: 'meta'; id: string; total: number; bytes: number; sha256: string; summary: TransferSummary }
  | { t: 'chunk'; id: string; i: number; total: number; sum: string; data: string }
  | { t: 'done' }
  | { t: 'failed' };

/** 32-bit FNV-1a over UTF-16 code units, hex. Cheap per-chunk integrity check. */
export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Insecure contexts have no SubtleCrypto; fall back to the chunk checksum over the whole text.
  return `fnv-${checksum(text)}`;
}

function encodedSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

/** Splits text into chunks whose full encoded messages fit under `maxBytes`. */
export function splitPayload(text: string, id: string, maxBytes = MAX_MESSAGE_BYTES): string[] {
  const parts: string[] = [];
  let pos = 0;
  while (pos < text.length) {
    // Envelope overhead: id, i, total, sum and field names stay below 200 bytes.
    let end = Math.min(text.length, pos + 36_000);
    for (;;) {
      if (end < text.length) {
        const c = text.charCodeAt(end - 1);
        if (c >= 0xd800 && c <= 0xdbff) end--; // never split a surrogate pair
      }
      const slice = text.slice(pos, end);
      const size = encodedSize({ t: 'chunk', id, i: 99999, total: 99999, sum: '00000000', data: slice });
      if (size <= maxBytes || end - pos <= 1) {
        parts.push(slice);
        pos = end;
        break;
      }
      end = pos + Math.max(1, Math.floor((end - pos) * 0.85));
    }
  }
  return parts;
}

const ID_RE = /^[A-Za-z0-9_-]{4,40}$/;
const HEX_RE = /^[a-f0-9]{8}$/;

function count(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1e7 ? v : null;
}

/** Validates an incoming message. Returns null for anything malformed. */
export function validateTransferMessage(raw: unknown): TransferMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  switch (m.t) {
    case 'request':
    case 'declined':
    case 'done':
    case 'failed':
      return { t: m.t };
    case 'meta': {
      const total = count(m.total);
      const bytes = count(m.bytes);
      const s = m.summary as Record<string, unknown> | undefined;
      const playlistCount = count(s?.playlistCount);
      const trackCount = count(s?.trackCount);
      const historyCount = count(s?.historyCount);
      if (typeof m.id !== 'string' || !ID_RE.test(m.id)) return null;
      if (total === null || total < 1 || total > MAX_CHUNKS) return null;
      if (bytes === null || bytes > MAX_TOTAL_BYTES) return null;
      if (typeof m.sha256 !== 'string' || !/^(fnv-)?[a-f0-9]{8,64}$/.test(m.sha256)) return null;
      if (playlistCount === null || trackCount === null || historyCount === null) return null;
      return { t: 'meta', id: m.id, total, bytes, sha256: m.sha256, summary: { playlistCount, trackCount, historyCount } };
    }
    case 'chunk': {
      const i = count(m.i);
      const total = count(m.total);
      if (typeof m.id !== 'string' || !ID_RE.test(m.id)) return null;
      if (i === null || total === null || total < 1 || total > MAX_CHUNKS || i >= total) return null;
      if (typeof m.sum !== 'string' || !HEX_RE.test(m.sum)) return null;
      if (typeof m.data !== 'string' || m.data.length > MAX_MESSAGE_BYTES) return null;
      return { t: 'chunk', id: m.id, i, total, sum: m.sum, data: m.data };
    }
    default:
      return null;
  }
}

/** Collects chunks for one transfer and verifies them against the meta message. */
export class ChunkAssembler {
  private parts = new Map<number, string>();

  readonly meta: Extract<TransferMessage, { t: 'meta' }>;

  constructor(meta: Extract<TransferMessage, { t: 'meta' }>) {
    this.meta = meta;
  }

  /** Returns false when the chunk is rejected. */
  add(chunk: Extract<TransferMessage, { t: 'chunk' }>): boolean {
    if (chunk.id !== this.meta.id || chunk.total !== this.meta.total) return false;
    if (checksum(chunk.data) !== chunk.sum) return false;
    if (!this.parts.has(chunk.i)) {
      this.parts.set(chunk.i, chunk.data);
    }
    return true;
  }

  get count(): number {
    return this.parts.size;
  }

  get complete(): boolean {
    return this.parts.size === this.meta.total;
  }

  /** Joins the chunks and checks the SHA-256. Returns null when the payload is damaged. */
  async finish(): Promise<string | null> {
    if (!this.complete) return null;
    let text = '';
    for (let i = 0; i < this.meta.total; i++) text += this.parts.get(i) ?? '';
    if (new TextEncoder().encode(text).length !== this.meta.bytes) return null;
    return (await sha256Hex(text)) === this.meta.sha256 ? text : null;
  }
}
