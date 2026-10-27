import { NextResponse } from 'next/server';
import { MAX_STATE_BYTES, RemoteManager, bearerToken, readJson, validateState } from '@/lib/remote/remoteManager';

export const dynamic = 'force-dynamic';

/** Host publishes a state snapshot. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = RemoteManager.authorize(code, bearerToken(req));
  if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  const body = await readJson(req, MAX_STATE_BYTES);
  const state = validateState(body);
  if (!state) return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  RemoteManager.setState(session, state);
  return NextResponse.json({ ok: true });
}
