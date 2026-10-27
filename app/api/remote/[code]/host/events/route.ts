import { RemoteManager, bearerToken } from '@/lib/remote/remoteManager';

export const dynamic = 'force-dynamic';

/** Host SSE stream: receives commands and phone presence. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = RemoteManager.authorize(code, bearerToken(req));
  if (!session) return new Response('Invalid session', { status: 401 });
  return RemoteManager.openStream(req, session, 'host');
}
