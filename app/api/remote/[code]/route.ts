import { NextResponse } from 'next/server';
import { RemoteManager, bearerToken } from '@/lib/remote/remoteManager';
import { isAblyConfigured, normalizeCode, verifySessionToken } from '@/lib/realtime/session';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ code: string }> };

/** Remote checks that a code and token are still valid. */
export async function GET(req: Request, { params }: Ctx) {
  const { code } = await params;
  if (isAblyConfigured()) {
    const normalized = normalizeCode(code);
    if (!normalized || !verifySessionToken('remote', normalized, bearerToken(req))) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  }
  const session = RemoteManager.authorize(code, bearerToken(req));
  if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  return NextResponse.json({ ok: true });
}

/** Host ends the session. */
export async function DELETE(req: Request, { params }: Ctx) {
  const { code } = await params;
  if (isAblyConfigured()) {
    // Nothing to destroy server side; the host publishes an end message on the channel.
    return NextResponse.json({ ok: true });
  }
  const session = RemoteManager.authorize(code, bearerToken(req));
  if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  RemoteManager.end(session);
  return NextResponse.json({ ok: true });
}
