import { type NextRequest, NextResponse } from 'next/server';
import { getRadioSuggestions } from '@/lib/youtube';
import { filterInstrumental, isValidTrackDuration } from '@/lib/utils';
import type { Track } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const videoId = request.nextUrl.searchParams.get('videoId')?.trim();
  const instrumental = request.nextUrl.searchParams.get('instrumental') === 'true';
  const excludeIds = request.nextUrl.searchParams.get('exclude')?.split(',').filter(Boolean) ?? [];

  if (!videoId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 });
  }

  try {
    const raw = await getRadioSuggestions(videoId);

    let suggestions: Track[] = raw
      // Remove duplicates already in queue
      .filter((t) => !excludeIds.includes(t.id))
      // Duration guard
      .filter((t) => isValidTrackDuration(t.duration));

    if (instrumental) {
      // Exclude non-instrumental tracks, sort priorities first
      const filtered = suggestions
        .map((t) => ({ track: t, score: filterInstrumental(t.title) }))
        .filter(({ score }) => score !== 'exclude')
        .sort((a, b) => {
          if (a.score === 'priority' && b.score !== 'priority') return -1;
          if (b.score === 'priority' && a.score !== 'priority') return 1;
          return 0;
        })
        .map(({ track }) => track);
      suggestions = filtered;
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error('[radio] Error:', err);
    return NextResponse.json({ error: 'Radio unavailable' }, { status: 503 });
  }
}
