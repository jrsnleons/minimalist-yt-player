import { NextResponse } from 'next/server';
import { RemoteManager } from '@/lib/remote/remoteManager';
import { generateCode, isAblyConfigured, signSessionToken } from '@/lib/realtime/session';

export const dynamic = 'force-dynamic';

/** Host creates a session. The token is returned once and never logged. */
export async function POST() {
  if (isAblyConfigured()) {
    // Stateless: the token is an HMAC of the code, verifiable by any server instance.
    const code = generateCode();
    const token = signSessionToken('remote', code);
    if (token) return NextResponse.json({ code, token }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const created = RemoteManager.create();
  if (!created) {
    return NextResponse.json({ error: 'Too many active sessions. Try again later.' }, { status: 503 });
  }
  return NextResponse.json(created, { headers: { 'Cache-Control': 'no-store' } });
}
