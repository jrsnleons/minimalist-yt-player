import { NextResponse } from 'next/server';
import { MAX_COMMAND_BYTES, RemoteManager, bearerToken, readJson, validateCommand } from '@/lib/remote/remoteManager';

export const dynamic = 'force-dynamic';

/** Remote sends a command to the host. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = RemoteManager.authorize(code, bearerToken(req));
  if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  const body = await readJson(req, MAX_COMMAND_BYTES);
  const command = validateCommand(body);
  if (!command) return NextResponse.json({ error: 'Invalid command' }, { status: 400 });
  if (!RemoteManager.sendCommand(session, command)) {
    return NextResponse.json({ error: 'Host is offline' }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
