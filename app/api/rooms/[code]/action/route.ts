import { NextResponse } from 'next/server';
import { RoomManager } from '@/lib/rooms/roomManager';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const body = await req.json();
    const { action, userId } = body;

    if (!code || !userId) {
      return NextResponse.json({ error: 'Code and userId are required' }, { status: 400 });
    }

    if (action === 'sync') {
      const { currentTrack, isPlaying, progress } = body;
      const success = RoomManager.syncPlayback(code, userId, {
        currentTrack,
        isPlaying,
        progress,
      });
      return NextResponse.json({ success });
    }

    if (action === 'reaction') {
      const { emoji } = body;
      if (!emoji) {
        return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
      }
      RoomManager.addReaction(code, userId, emoji);
      return NextResponse.json({ success: true });
    }

    if (action === 'transfer-dj') {
      const { targetUserId } = body;
      if (!targetUserId) {
        return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
      }
      const success = RoomManager.transferDj(code, userId, targetUserId);
      return NextResponse.json({ success });
    }

    if (action === 'toggle-listener-controls') {
      const { allowListenerControls } = body;
      const success = RoomManager.setListenerControls(code, userId, !!allowListenerControls);
      return NextResponse.json({ success });
    }

    if (action === 'queue-add') {
      const { track, userName, playNext } = body;
      if (!track) {
        return NextResponse.json({ error: 'track is required' }, { status: 400 });
      }
      const success = RoomManager.addTrackToQueue(code, track, userId, userName || 'Listener', !!playNext);
      return NextResponse.json({ success });
    }

    if (action === 'queue-remove') {
      const { trackId } = body;
      if (!trackId) {
        return NextResponse.json({ error: 'trackId is required' }, { status: 400 });
      }
      const success = RoomManager.removeTrackFromQueue(code, trackId, userId);
      return NextResponse.json({ success });
    }

    if (action === 'queue-reorder') {
      const { queue } = body;
      if (!Array.isArray(queue)) {
        return NextResponse.json({ error: 'queue must be an array' }, { status: 400 });
      }
      const success = RoomManager.reorderQueue(code, userId, queue);
      return NextResponse.json({ success });
    }

    if (action === 'queue-clear') {
      const success = RoomManager.clearQueue(code, userId);
      return NextResponse.json({ success });
    }

    if (action === 'leave') {
      RoomManager.leaveRoom(code, userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    );
  }
}
