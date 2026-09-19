import { RoomManager } from '@/lib/rooms/roomManager';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!code || !userId) {
    return new Response('Missing code or userId', { status: 400 });
  }

  const room = RoomManager.getRoom(code);
  if (!room) {
    return new Response('Room not found', { status: 404 });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Register subscription
  RoomManager.addSubscriber(code, userId, writer);

  // Send initial room snapshot
  const initialData = `event: room:sync\ndata: ${JSON.stringify(room)}\n\n`;
  writer.write(encoder.encode(initialData)).catch(() => {});

  // Set up periodic heartbeat ping
  const pingInterval = setInterval(() => {
    try {
      writer.write(encoder.encode(': ping\n\n')).catch(() => {
        clearInterval(pingInterval);
        RoomManager.removeSubscriber(code, userId, writer);
      });
    } catch {
      clearInterval(pingInterval);
      RoomManager.removeSubscriber(code, userId, writer);
    }
  }, 15000);

  // Handle connection close
  req.signal.addEventListener('abort', () => {
    clearInterval(pingInterval);
    RoomManager.removeSubscriber(code, userId, writer);
    try {
      writer.close();
    } catch {}
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
