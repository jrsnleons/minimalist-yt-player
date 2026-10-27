/**
 * Minimal SSE client over fetch so the session token travels in an Authorization
 * header instead of the URL. Reconnects with backoff until aborted.
 */

export type SseStatus = 'connecting' | 'open' | 'reconnecting';

interface SseOptions {
  url: string;
  token: string;
  signal: AbortSignal;
  onEvent: (event: string, data: unknown) => void;
  onStatus?: (status: SseStatus) => void;
  /** Server rejected the token or the session is gone; no further retries. */
  onFatal?: (reason: 'invalid' | 'ended') => void;
}

const STALL_MS = 45_000;

function parseBlock(block: string): { event: string; data: string } | null {
  let event = 'message';
  const data: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith(':')) continue;
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
  }
  return data.length ? { event, data: data.join('\n') } : null;
}

export async function runSse(opts: SseOptions): Promise<void> {
  const { url, token, signal, onEvent, onStatus, onFatal } = opts;
  let attempt = 0;
  onStatus?.('connecting');

  while (!signal.aborted) {
    const ctrl = new AbortController();
    const abort = () => ctrl.abort();
    signal.addEventListener('abort', abort, { once: true });
    let stall: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(stall);
      stall = setTimeout(() => ctrl.abort(), STALL_MS);
    };

    try {
      arm();
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        cache: 'no-store',
        signal: ctrl.signal,
      });
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        onFatal?.('invalid');
        return;
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      attempt = 0;
      onStatus?.('open');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        arm();
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const parsed = parseBlock(buffer.slice(0, idx));
          buffer = buffer.slice(idx + 2);
          if (!parsed) continue;
          let data: unknown;
          try {
            data = JSON.parse(parsed.data);
          } catch {
            continue;
          }
          if (parsed.event === 'end') {
            onFatal?.('ended');
            return;
          }
          onEvent(parsed.event, data);
        }
      }
    } catch {
      // Network error, stall abort, or caller abort: fall through to retry.
    } finally {
      clearTimeout(stall);
      signal.removeEventListener('abort', abort);
    }

    if (signal.aborted) return;
    onStatus?.('reconnecting');
    attempt++;
    const delay = Math.min(15_000, 800 * 1.7 ** Math.min(attempt, 8)) * (0.8 + Math.random() * 0.4);
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, delay);
      signal.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
    });
  }
}
