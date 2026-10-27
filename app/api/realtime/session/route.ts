import { NextResponse } from 'next/server';
import { generateCode, isAblyConfigured, signSessionToken, type SessionScope } from '@/lib/realtime/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SCOPES: SessionScope[] = ['remote', 'room', 'transfer'];

/**
 * Allocates a code. Remote and transfer sessions also get a signed secret that any server
 * instance can verify later. Room codes are the only credential, as before.
 */
export async function POST(req: Request) {
  if (!isAblyConfigured()) {
    return NextResponse.json({ error: 'Ably is not configured' }, { status: 501 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const scope = (body as { scope?: unknown } | null)?.scope;
  if (typeof scope !== 'string' || !SCOPES.includes(scope as SessionScope)) {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  }
  const code = generateCode();
  const token = scope === 'room' ? undefined : signSessionToken(scope as SessionScope, code);
  return NextResponse.json({ code, token }, { headers: { 'Cache-Control': 'no-store' } });
}
