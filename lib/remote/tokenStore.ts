const KEY = 'onyx_remote_tokens';

function readAll(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getStoredToken(code: string): string | null {
  return readAll()[code.toUpperCase()] ?? null;
}

export function storeToken(code: string, token: string) {
  try {
    const all = readAll();
    all[code.toUpperCase()] = token;
    // Keep only the most recent few pairings.
    const keys = Object.keys(all);
    for (const k of keys.slice(0, Math.max(0, keys.length - 5))) delete all[k];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function forgetToken(code: string) {
  try {
    const all = readAll();
    delete all[code.toUpperCase()];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

/** Accepts a full remote link or a bare code. */
export function parseRemoteInput(raw: string): { code: string; token: string | null } | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    const m = /\/remote\/([A-Za-z0-9]{6})\/?$/.exec(url.pathname);
    if (m) {
      const t = new URLSearchParams(url.hash.replace(/^#/, '')).get('t');
      return { code: m[1].toUpperCase(), token: t };
    }
  } catch {}
  const code = text.replace(/[\s-]/g, '').toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? { code, token: null } : null;
}
