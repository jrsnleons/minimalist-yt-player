import { openAblyChannel, randomId, type AblyLink } from '@/lib/realtime/ablyClient';
import { buildLibraryBackup, validateBackup } from '@/lib/backup';
import {
  ChunkAssembler,
  TRANSFER_MESSAGE,
  sha256Hex,
  checksum,
  splitPayload,
  validateTransferMessage,
  MAX_TOTAL_BYTES,
  type TransferMessage,
  type TransferSummary,
} from '@/lib/transfer/protocol';
import type { LibraryBackup } from '@/types';

/**
 * Library transfer over a `transfer:<code>` Ably channel. Device A sends, device B receives.
 * Nothing is stored on a server; the data only passes through the channel.
 */

const PACE_MS = 30;
const SENDER_WAIT_MS = 12_000;

// ---------- Sender ----------

export type SendState =
  | { phase: 'starting' }
  | { phase: 'waiting'; code: string; link: string }
  | { phase: 'asking'; code: string; link: string; summary: TransferSummary }
  | { phase: 'sending'; sent: number; total: number }
  | { phase: 'done' }
  | { phase: 'declined'; code: string; link: string }
  | { phase: 'error'; message: string };

export interface SendController {
  approve(): void;
  decline(): void;
  cancel(): void;
}

export function startSend(onState: (s: SendState) => void): SendController {
  let link: AblyLink | null = null;
  let cancelled = false;
  let busy = false;
  let requester: string | null = null;
  let session: { code: string; link: string } | null = null;
  let prepared: { id: string; chunks: string[]; sha: string; bytes: number; summary: TransferSummary } | null = null;
  const clientId = randomId('send');

  const fail = (message: string) => {
    if (!cancelled) onState({ phase: 'error', message });
    link?.close();
  };

  const publish = (m: TransferMessage) => link?.channel.publish(TRANSFER_MESSAGE, m);

  const prepare = async () => {
    const backup = await buildLibraryBackup();
    const text = JSON.stringify(backup);
    const bytes = new TextEncoder().encode(text).length;
    if (bytes > MAX_TOTAL_BYTES) throw new Error('Library is too large to send. Use the JSON backup instead.');
    const id = randomId('t').slice(0, 24);
    prepared = {
      id,
      chunks: splitPayload(text, id),
      sha: await sha256Hex(text),
      bytes,
      summary: backup.summary,
    };
  };

  const waiting = (): SendState => ({ phase: 'waiting', code: session!.code, link: session!.link });

  (async () => {
    onState({ phase: 'starting' });
    const res = await fetch('/api/realtime/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'transfer' }),
    });
    if (!res.ok) throw new Error('Could not start a transfer.');
    const { code, token } = (await res.json()) as { code?: string; token?: string };
    if (typeof code !== 'string' || typeof token !== 'string') throw new Error('Could not start a transfer.');
    if (cancelled) return;

    session = { code, link: `${location.origin}/?transfer=${code}#t=${token}` };
    link = await openAblyChannel({
      scope: 'transfer',
      code,
      secret: token,
      clientId,
      onAuthRejected: () => fail('Transfer session was rejected.'),
    });
    if (cancelled) return link.close();
    // Show the code right away; the receiver waits for the sender to appear.
    onState(waiting());

    await link.channel.subscribe(TRANSFER_MESSAGE, (msg) => {
      const m = validateTransferMessage(msg.data);
      if (!m || !msg.clientId?.startsWith('recv-')) return;
      if (m.t === 'request' && !busy && !requester) {
        requester = msg.clientId;
        prepare()
          .then(() => prepared && !cancelled && onState({ phase: 'asking', code: session!.code, link: session!.link, summary: prepared.summary }))
          .catch((err) => fail(err instanceof Error ? err.message : 'Could not read the library.'));
      } else if (m.t === 'done' && msg.clientId === requester) {
        onState({ phase: 'done' });
        link?.close();
      } else if (m.t === 'failed' && msg.clientId === requester) {
        busy = false;
        requester = null;
        onState(waiting());
      }
    });
    await link.channel.presence.enter({ role: 'sender' });
  })().catch((err) => fail(err instanceof Error ? err.message : 'Could not start a transfer.'));

  return {
    approve() {
      if (!prepared || !requester || busy || !link) return;
      busy = true;
      const { id, chunks, sha, bytes, summary } = prepared;
      (async () => {
        await publish({ t: 'meta', id, total: chunks.length, bytes, sha256: sha, summary });
        for (let i = 0; i < chunks.length; i++) {
          if (cancelled) return;
          await publish({ t: 'chunk', id, i, total: chunks.length, sum: checksum(chunks[i]), data: chunks[i] });
          onState({ phase: 'sending', sent: i + 1, total: chunks.length });
          await new Promise((r) => setTimeout(r, PACE_MS));
        }
      })().catch(() => fail('Connection lost while sending.'));
    },
    decline() {
      publish({ t: 'declined' })?.catch(() => {});
      requester = null;
      prepared = null;
      if (session) onState({ phase: 'declined', code: session.code, link: session.link });
    },
    cancel() {
      cancelled = true;
      link?.close();
    },
  };
}

// ---------- Receiver ----------

export type ReceiveState =
  | { phase: 'connecting' }
  | { phase: 'waiting' }
  | { phase: 'receiving'; received: number; total: number }
  | { phase: 'review'; summary: TransferSummary }
  | { phase: 'error'; message: string };

export interface ReceiveController {
  /** The verified backup, available in the review phase. */
  backup(): LibraryBackup | null;
  /** Tells the sender how it went. */
  report(ok: boolean): void;
  cancel(): void;
}

export function startReceive(code: string, token: string, onState: (s: ReceiveState) => void): ReceiveController {
  let link: AblyLink | null = null;
  let cancelled = false;
  let assembler: ChunkAssembler | null = null;
  let backup: LibraryBackup | null = null;
  let requested = false;
  const clientId = randomId('recv');

  const fail = (message: string) => {
    if (cancelled) return;
    onState({ phase: 'error', message });
    link?.close();
  };

  const publish = (m: TransferMessage) => link?.channel.publish(TRANSFER_MESSAGE, m);

  const requestIfSenderPresent = async () => {
    if (!link || requested) return;
    const members = await link.channel.presence.get();
    if (members.some((m) => (m.data as { role?: string } | null)?.role === 'sender')) {
      requested = true;
      await publish({ t: 'request' });
      onState({ phase: 'waiting' });
    }
  };

  (async () => {
    onState({ phase: 'connecting' });
    link = await openAblyChannel({
      scope: 'transfer',
      code,
      secret: token,
      clientId,
      onAuthRejected: () => fail('This transfer link is invalid or has expired.'),
    });
    if (cancelled) return link.close();

    await link.channel.subscribe(TRANSFER_MESSAGE, async (msg) => {
      const m = validateTransferMessage(msg.data);
      if (!m || !msg.clientId?.startsWith('send-')) return;
      if (m.t === 'declined') return fail('The other device declined the transfer.');
      if (m.t === 'meta') {
        if (!requested || assembler) return;
        assembler = new ChunkAssembler(m);
        onState({ phase: 'receiving', received: 0, total: m.total });
      } else if (m.t === 'chunk' && assembler) {
        if (!assembler.add(m)) return fail('Received damaged data. Try again.');
        onState({ phase: 'receiving', received: assembler.count, total: assembler.meta.total });
        if (assembler.complete) {
          const text = await assembler.finish();
          if (text === null) {
            publish({ t: 'failed' })?.catch(() => {});
            return fail('The data did not match its checksum. Try again.');
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(text);
          } catch {
            return fail('The received file could not be read.');
          }
          const result = validateBackup(parsed);
          if (!result.isValid || result.type !== 'full-library' || !result.parsedData) {
            return fail('The received data is not a library backup.');
          }
          backup = result.parsedData as LibraryBackup;
          onState({ phase: 'review', summary: assembler.meta.summary });
        }
      }
    });

    await link.channel.presence.subscribe(() => void requestIfSenderPresent());
    await link.channel.presence.enter({ role: 'receiver' });
    await requestIfSenderPresent();
    setTimeout(() => {
      if (!requested) fail('Could not reach the other device. Check that the dialog is still open there.');
    }, SENDER_WAIT_MS);
  })().catch((err) => fail(err instanceof Error ? err.message : 'Could not connect.'));

  return {
    backup: () => backup,
    report(ok) {
      publish({ t: ok ? 'done' : 'failed' })?.catch(() => {});
      setTimeout(() => link?.close(), 500);
    },
    cancel() {
      cancelled = true;
      link?.close();
    },
  };
}

/** Accepts a transfer link or a bare code with its secret, from a pasted string. */
export function parseTransferLink(raw: string): { code: string; token: string } | null {
  try {
    const url = new URL(raw.trim());
    const code = url.searchParams.get('transfer')?.toUpperCase() ?? '';
    const token = new URLSearchParams(url.hash.replace(/^#/, '')).get('t') ?? '';
    return /^[A-Z0-9]{6}$/.test(code) && token ? { code, token } : null;
  } catch {
    return null;
  }
}
