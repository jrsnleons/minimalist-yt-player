import { type NextRequest, NextResponse } from 'next/server';
import { searchTracks } from '@/lib/youtube';
import type { Track } from '@/types';

const YOUTUBE_API_KEY = process.env.YOUTUBE_DATA_API_KEY;

/** Fallback: YouTube Data API v3 search */
async function searchViaDataAPI(query: string): Promise<Track[]> {
  if (!YOUTUBE_API_KEY) return [];

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('videoCategoryId', '10'); // Music
  url.searchParams.set('maxResults', '20');
  url.searchParams.set('key', YOUTUBE_API_KEY);

  const searchRes = await fetch(url.toString());
  if (!searchRes.ok) return [];

  const searchData = (await searchRes.json()) as {
    items?: Array<{
      id: { videoId: string };
      snippet: { title: string; channelTitle: string; thumbnails: { high?: { url: string } } };
    }>;
  };

  const videoIds = (searchData.items ?? []).map((i) => i.id.videoId).join(',');
  if (!videoIds) return [];

  // Fetch video durations
  const detailUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  detailUrl.searchParams.set('part', 'contentDetails');
  detailUrl.searchParams.set('id', videoIds);
  detailUrl.searchParams.set('key', YOUTUBE_API_KEY);

  const detailRes = await fetch(detailUrl.toString());
  if (!detailRes.ok) return [];

  const detailData = (await detailRes.json()) as {
    items?: Array<{ id: string; contentDetails: { duration: string } }>;
  };

  const durationMap = new Map<string, number>();
  for (const item of detailData.items ?? []) {
    const match = item.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) continue;
    const h = parseInt(match[1] ?? '0', 10);
    const m = parseInt(match[2] ?? '0', 10);
    const s = parseInt(match[3] ?? '0', 10);
    durationMap.set(item.id, h * 3600 + m * 60 + s);
  }

  const tracks: Track[] = [];
  for (const item of searchData.items ?? []) {
    const duration = durationMap.get(item.id.videoId) ?? 0;
    if (duration < 60 || duration > 600) continue;
    tracks.push({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      duration,
      thumbnailUrl: item.snippet.thumbnails.high?.url ?? '',
      addedAt: Date.now(),
    });
  }
  return tracks;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  // Primary: Innertube
  try {
    const results = await searchTracks(query);
    if (results.length > 0) {
      return NextResponse.json({ results });
    }
  } catch (err) {
    console.error('[search] Innertube error:', err);
  }

  // Fallback: YouTube Data API v3
  try {
    const results = await searchViaDataAPI(query);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('[search] Data API error:', err);
    return NextResponse.json({ error: 'Search unavailable' }, { status: 503 });
  }
}
