import { type NextRequest, NextResponse } from 'next/server';
import { searchTracks } from '@/lib/youtube';
import type { Track } from '@/types';

interface TrackQuery {
  title: string;
  artist: string;
  durationMs?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const queries: TrackQuery[] = Array.isArray(body.queries)
      ? body.queries
      : body.title && body.artist
      ? [{ title: body.title, artist: body.artist, durationMs: body.durationMs }]
      : [];

    if (queries.length === 0) {
      return NextResponse.json({ error: 'queries array is required' }, { status: 400 });
    }

    // Limit batch size per request to 30 to avoid timeout
    const batch = queries.slice(0, 30);

    // Resolve concurrently with concurrency limit of 5
    const resolveSingle = async (q: TrackQuery): Promise<Track | null> => {
      try {
        const cleanTitle = q.title.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim();
        const searchQuery = `${cleanTitle} ${q.artist}`.trim();
        const results = await searchTracks(searchQuery);

        if (results && results.length > 0) {
          return results[0];
        }

        // Secondary search if no results on cleaned title
        const fallbackResults = await searchTracks(`${q.title} ${q.artist}`);
        return fallbackResults?.[0] || null;
      } catch (err) {
        console.error(`[resolve] Failed for "${q.title} - ${q.artist}":`, err);
        return null;
      }
    };

    // Process in chunks of 5
    const CHUNK_SIZE = 5;
    const resolved: (Track | null)[] = [];

    for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
      const chunk = batch.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(chunk.map((item) => resolveSingle(item)));
      resolved.push(...chunkResults);
    }

    return NextResponse.json({
      matches: resolved,
      totalCount: resolved.length,
      matchedCount: resolved.filter(Boolean).length,
    });
  } catch (err) {
    console.error('[api/spotify/resolve] Error:', err);
    const message = err instanceof Error ? err.message : 'Resolution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
