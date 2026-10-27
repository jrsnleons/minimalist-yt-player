import { NextResponse } from 'next/server';
import { RemoteManager } from '@/lib/remote/remoteManager';

export const dynamic = 'force-dynamic';

/** Host creates a session. The token is returned once and never logged. */
export async function POST() {
  const created = RemoteManager.create();
  if (!created) {
    return NextResponse.json({ error: 'Too many active sessions. Try again later.' }, { status: 503 });
  }
  return NextResponse.json(created, { headers: { 'Cache-Control': 'no-store' } });
}
