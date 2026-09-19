import { NextResponse } from 'next/server';
import { RoomManager } from '@/lib/rooms/roomManager';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, userName, code, roomName } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'create') {
      const { initialPlayback } = body;
      const room = RoomManager.createRoom(userId, userName || 'Host', roomName, initialPlayback);
      return NextResponse.json({ room });
    }

    if (action === 'join') {
      if (!code) {
        return NextResponse.json({ error: 'Room code is required to join' }, { status: 400 });
      }
      const result = RoomManager.joinRoom(code, userId, userName || 'Listener');
      if ('error' in result) {
        if (result.error === 'full') {
          return NextResponse.json(
            { error: 'This session is full (max 10 listeners).' },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: 'Room not found. Check the room code and try again.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ room: result.room });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process room request' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Room code query parameter is required' }, { status: 400 });
  }

  const room = RoomManager.getRoom(code);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  return NextResponse.json({
    code: room.code,
    name: room.name,
    participantCount: room.participants.length,
    currentTrack: room.currentTrack,
    isPlaying: room.isPlaying,
  });
}
