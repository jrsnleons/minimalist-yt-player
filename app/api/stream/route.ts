import { type NextRequest, NextResponse } from 'next/server';
import { getStreamInfo } from '@/lib/youtube';

const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

// Short-term cache for deciphered stream URLs (valid for ~15 minutes)
const streamCache = new Map<string, { url: string; loudnessDb: number | null; expiresAt: number }>();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const videoId = request.nextUrl.searchParams.get('videoId')?.trim();

  if (!videoId || !YOUTUBE_VIDEO_ID_REGEX.test(videoId)) {
    return NextResponse.json({ error: 'Valid 11-character videoId required' }, { status: 400 });
  }

  // Check cache
  const cached = streamCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ url: cached.url, loudnessDb: cached.loudnessDb });
  }

  try {
    const { url, loudnessDb } = await getStreamInfo(videoId);
    // Cache for 15 minutes (YouTube streams expire after ~6 hours)
    streamCache.set(videoId, { url, loudnessDb, expiresAt: Date.now() + 15 * 60 * 1000 });
    return NextResponse.json({ url, loudnessDb });
  } catch (err) {
    console.error('[stream] Error:', err);
    return NextResponse.json({ error: 'Stream extraction failed' }, { status: 503 });
  }
}
