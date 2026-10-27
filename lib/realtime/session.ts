import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Stateless session secrets for the Ably transport. Server memory is not authoritative on
 * serverless hosts, so the pairing secret is an HMAC of the code that any instance can verify.
 * Server only: never import this from client code.
 */

export type SessionScope = 'remote' | 'room' | 'transfer';

export const SESSION_CODE_LENGTH = 6;
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_RE = /^[A-Z0-9]{6}$/;
export const CLIENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

type Env = Record<string, string | undefined>;

export function isAblyConfigured(env: Env = process.env): boolean {
  return !!env.ABLY_API_KEY && env.ABLY_API_KEY.includes(':');
}

/** HMAC key: REMOTE_SECRET when set, otherwise derived from the Ably key. */
function signingKey(env: Env): string | null {
  const base = env.REMOTE_SECRET || env.ABLY_API_KEY;
  return base ? `onyx-session:${base}` : null;
}

export function generateCode(): string {
  const bytes = randomBytes(SESSION_CODE_LENGTH);
  let code = '';
  for (const b of bytes) code += CODE_CHARS[b % CODE_CHARS.length];
  return code;
}

function sign(key: string, scope: SessionScope, code: string, exp: number): string {
  return createHmac('sha256', key).update(`${scope}:${code}:${exp}`).digest('base64url');
}

/** Token format: v1.<expiry ms in base36>.<base64url HMAC-SHA256>. */
export function signSessionToken(
  scope: SessionScope,
  code: string,
  opts: { env?: Env; now?: number; ttlMs?: number } = {}
): string | null {
  const key = signingKey(opts.env ?? process.env);
  if (!key) return null;
  const exp = (opts.now ?? Date.now()) + (opts.ttlMs ?? SESSION_TTL_MS);
  return `v1.${exp.toString(36)}.${sign(key, scope, code, exp)}`;
}

export function verifySessionToken(
  scope: SessionScope,
  code: string,
  token: unknown,
  opts: { env?: Env; now?: number } = {}
): boolean {
  const key = signingKey(opts.env ?? process.env);
  if (!key || typeof token !== 'string' || token.length > 128 || !CODE_RE.test(code)) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1' || !/^[a-z0-9]{1,12}$/.test(parts[1])) return false;
  const exp = parseInt(parts[1], 36);
  if (!Number.isFinite(exp) || exp < (opts.now ?? Date.now())) return false;
  const expected = Buffer.from(sign(key, scope, code, exp));
  const given = Buffer.from(parts[2]);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Channel name for a scope and code. */
export function channelName(scope: SessionScope, code: string): string {
  return `${scope}:${code}`;
}

/** Capability limited to exactly one channel. */
export function capabilityFor(scope: SessionScope, code: string): Record<string, string[]> {
  return { [channelName(scope, code)]: ['publish', 'subscribe', 'presence'] };
}

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

export function normalizeClientId(raw: unknown): string {
  return typeof raw === 'string' && CLIENT_ID_RE.test(raw) ? raw : `c-${randomBytes(9).toString('base64url')}`;
}
