import { type NextRequest, NextResponse } from 'next/server';
import { getRadioSuggestions } from '@/lib/youtube';
import { isValidTrackDuration } from '@/lib/utils';
import type { Track } from '@/types';

const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const videoId = request.nextUrl.searchParams.get('videoId')?.trim();
  const excludeParam = request.nextUrl.searchParams.get('exclude')?.slice(0, 2000) ?? '';
  const excludeSet = new Set(excludeParam.split(',').filter(Boolean));

  if (!videoId || !YOUTUBE_VIDEO_ID_REGEX.test(videoId)) {
    return NextResponse.json({ error: 'Valid 11-character videoId required' }, { status: 400 });
  }

  try {
    const raw = await getRadioSuggestions(videoId);

    const suggestions: Track[] = raw
      // Remove duplicates already in queue (O(1) Set lookup)
      .filter((t) => !excludeSet.has(t.id))
      // Duration guard
      .filter((t) => isValidTrackDuration(t.duration));

    return NextResponse.json(
      { suggestions },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
        },
      }
    );
  } catch (err) {
    console.error('[radio] Error:', err);
    return NextResponse.json({ error: 'Radio unavailable' }, { status: 503 });
  }
}
