import { NextResponse } from 'next/server';
import { RemoteManager, bearerToken } from '@/lib/remote/remoteManager';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ code: string }> };

/** Remote checks that a code and token are still valid. */
export async function GET(req: Request, { params }: Ctx) {
  const { code } = await params;
  const session = RemoteManager.authorize(code, bearerToken(req));
  if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  return NextResponse.json({ ok: true });
}

/** Host ends the session. */
export async function DELETE(req: Request, { params }: Ctx) {
  const { code } = await params;
  const session = RemoteManager.authorize(code, bearerToken(req));
  if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  RemoteManager.end(session);
  return NextResponse.json({ ok: true });
}
