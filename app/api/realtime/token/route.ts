import { NextResponse } from 'next/server';
import { createScopedTokenRequest } from '@/lib/realtime/server';
import {
  isAblyConfigured,
  normalizeClientId,
  normalizeCode,
  verifySessionToken,
  type SessionScope,
} from '@/lib/realtime/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SCOPES: SessionScope[] = ['remote', 'room', 'transfer'];
const MAX_BODY = 2048;

function bearer(req: Request): string | null {
  const m = /^Bearer\s+(\S{1,128})$/i.exec(req.headers.get('authorization') ?? '');
  return m ? m[1] : null;
}

/**
 * Issues an Ably TokenRequest scoped to one channel (`remote:CODE`, `room:CODE` or
 * `transfer:CODE`). Remote and transfer need the session secret, sent in the POST body or an
 * Authorization header, never the query string.
 */
export async function POST(req: Request) {
  if (!isAblyConfigured()) {
    return NextResponse.json({ error: 'Ably is not configured' }, { status: 501 });
  }
  const text = await req.text();
  if (text.length > MAX_BODY) return NextResponse.json({ error: 'Body too large' }, { status: 413 });
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const scope = body.scope;
  if (typeof scope !== 'string' || !SCOPES.includes(scope as SessionScope)) {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  }
  const code = normalizeCode(body.code);
  if (!code) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

  if (scope !== 'room') {
    const secret = bearer(req) ?? body.secret;
    if (!verifySessionToken(scope as SessionScope, code, secret)) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
  }

  try {
    const tokenRequest = await createScopedTokenRequest(scope as SessionScope, code, normalizeClientId(body.clientId));
    return NextResponse.json(tokenRequest, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not issue token' }, { status: 502 });
  }
}
