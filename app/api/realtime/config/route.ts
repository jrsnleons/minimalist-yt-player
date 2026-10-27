import { NextResponse } from 'next/server';
import { isAblyConfigured } from '@/lib/realtime/session';

export const dynamic = 'force-dynamic';

/** Tells the client which transport to use. Reveals only whether Ably is set up. */
export async function GET() {
  return NextResponse.json(
    { transport: isAblyConfigured() ? 'ably' : 'sse' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
