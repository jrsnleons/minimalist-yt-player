import { type NextRequest, NextResponse } from 'next/server';
import { searchTracks, searchPlaylists, searchVideos } from '@/lib/youtube';
import { parseISO8601Duration } from '@/lib/utils';
import type { Track, SearchPlaylist } from '@/types';

const YOUTUBE_API_KEY = process.env.YOUTUBE_DATA_API_KEY;
const VALID_TYPES = ['all', 'song', 'video', 'playlist'] as const;
type SearchType = (typeof VALID_TYPES)[number];

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
};

/** Helper to fetch video durations in batch via YouTube Data API v3 */
async function fetchVideoDurations(videoIds: string[], apiKey: string): Promise<Map<string, number>> {
  const durationMap = new Map<string, number>();
  if (videoIds.length === 0) return durationMap;

  try {
    const detailUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailUrl.searchParams.set('part', 'contentDetails');
    detailUrl.searchParams.set('id', videoIds.join(','));
    detailUrl.searchParams.set('key', apiKey);

    const detailRes = await fetch(detailUrl.toString());
    if (detailRes.ok) {
      const detailData = await detailRes.json();
      for (const item of detailData.items ?? []) {
        const secs = parseISO8601Duration(item.contentDetails?.duration);
        if (secs > 0) durationMap.set(item.id, secs);
      }
    }
  } catch {
    // Ignore duration fetch error
  }
  return durationMap;
}

/** Fallback: YouTube Data API v3 search */
async function searchViaDataAPI(
  query: string,
  type: SearchType
): Promise<{ tracks: Track[]; videos: Track[]; playlists: SearchPlaylist[] }> {
  if (!YOUTUBE_API_KEY) return { tracks: [], videos: [], playlists: [] };

  const result: { tracks: Track[]; videos: Track[]; playlists: SearchPlaylist[] } = {
    tracks: [],
    videos: [],
    playlists: [],
  };

  const tasks: Promise<void>[] = [];

  // 1. Fetch Songs if needed
  if (type === 'all' || type === 'song') {
    tasks.push(
      (async () => {
        try {
          const url = new URL('https://www.googleapis.com/youtube/v3/search');
          url.searchParams.set('part', 'snippet');
          url.searchParams.set('q', query);
          url.searchParams.set('type', 'video');
          url.searchParams.set('videoCategoryId', '10'); // Music category
          url.searchParams.set('maxResults', '20');
          url.searchParams.set('key', YOUTUBE_API_KEY);

          const searchRes = await fetch(url.toString());
          if (!searchRes.ok) return;
          const searchData = await searchRes.json();
          const items = searchData.items ?? [];
          const videoIds: string[] = items.map((i: any) => i.id?.videoId).filter(Boolean);

          const durationMap = await fetchVideoDurations(videoIds, YOUTUBE_API_KEY);

          for (const item of items) {
            const videoId = item.id?.videoId;
            if (!videoId) continue;
            const duration = durationMap.get(videoId) ?? 0;
            if (duration < 60 || duration > 600) continue;
            result.tracks.push({
              id: videoId,
              title: item.snippet.title,
              artist: item.snippet.channelTitle,
              duration,
              thumbnailUrl: item.snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              addedAt: Date.now(),
            });
          }
        } catch {}
      })()
    );
  }

  // 2. Fetch General YouTube Videos if needed
  if (type === 'all' || type === 'video') {
    tasks.push(
      (async () => {
        try {
          const url = new URL('https://www.googleapis.com/youtube/v3/search');
          url.searchParams.set('part', 'snippet');
          url.searchParams.set('q', query);
          url.searchParams.set('type', 'video');
          url.searchParams.set('maxResults', '15');
          url.searchParams.set('key', YOUTUBE_API_KEY);

          const searchRes = await fetch(url.toString());
          if (!searchRes.ok) return;
          const searchData = await searchRes.json();
          const items = searchData.items ?? [];
          const videoIds: string[] = items.map((i: any) => i.id?.videoId).filter(Boolean);

          const durationMap = await fetchVideoDurations(videoIds, YOUTUBE_API_KEY);

          for (const item of items) {
            const videoId = item.id?.videoId;
            if (!videoId) continue;
            const duration = durationMap.get(videoId) ?? 180;
            result.videos.push({
              id: videoId,
              title: item.snippet.title,
              artist: item.snippet.channelTitle,
              duration,
              thumbnailUrl: item.snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              addedAt: Date.now(),
            });
          }
        } catch {}
      })()
    );
  }

  // 3. Fetch Playlists if needed
  if (type === 'all' || type === 'playlist') {
    tasks.push(
      (async () => {
        try {
          const plUrl = new URL('https://www.googleapis.com/youtube/v3/search');
          plUrl.searchParams.set('part', 'snippet');
          plUrl.searchParams.set('q', query);
          plUrl.searchParams.set('type', 'playlist');
          plUrl.searchParams.set('maxResults', '10');
          plUrl.searchParams.set('key', YOUTUBE_API_KEY);

          const plRes = await fetch(plUrl.toString());
          if (!plRes.ok) return;
          const plData = await plRes.json();
          for (const item of plData.items ?? []) {
            const playlistId = item.id?.playlistId;
            if (!playlistId) continue;
            result.playlists.push({
              id: playlistId,
              title: item.snippet?.title || 'YouTube Playlist',
              author: item.snippet?.channelTitle || 'YouTube',
              thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
            });
          }
        } catch {}
      })()
    );
  }

  // Run all requested category fetches concurrently
  await Promise.all(tasks);
  return result;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rawQuery = request.nextUrl.searchParams.get('q')?.trim();
  const rawType = request.nextUrl.searchParams.get('type')?.trim() || 'all';

  if (!rawQuery || rawQuery.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
  }

  const query = rawQuery.slice(0, 200);
  const searchType: SearchType = VALID_TYPES.includes(rawType as SearchType)
    ? (rawType as SearchType)
    : 'all';

  // Primary: Innertube
  try {
    let tracks: Track[] = [];
    let videos: Track[] = [];
    let playlists: SearchPlaylist[] = [];

    if (searchType === 'all') {
      const [trackResults, videoResults, playlistResults] = await Promise.all([
        searchTracks(query),
        searchVideos(query),
        searchPlaylists(query),
      ]);
      tracks = trackResults;
      // Filter out videos that already appeared in songs
      const songIds = new Set(tracks.map((t) => t.id));
      videos = videoResults.filter((v) => !songIds.has(v.id));
      playlists = playlistResults;
    } else if (searchType === 'song') {
      tracks = await searchTracks(query);
    } else if (searchType === 'video') {
      videos = await searchVideos(query);
    } else if (searchType === 'playlist') {
      playlists = await searchPlaylists(query);
    }

    if (tracks.length > 0 || videos.length > 0 || playlists.length > 0) {
      return NextResponse.json(
        {
          results: tracks.length > 0 ? tracks : videos, // for backward compatibility
          tracks,
          videos,
          playlists,
        },
        { headers: CACHE_HEADERS }
      );
    }
  } catch (err) {
    console.error('[search] Innertube error:', err);
  }

  // Fallback: YouTube Data API v3
  try {
    const fallback = await searchViaDataAPI(query, searchType);
    return NextResponse.json(
      {
        results: fallback.tracks.length > 0 ? fallback.tracks : fallback.videos,
        tracks: fallback.tracks,
        videos: fallback.videos,
        playlists: fallback.playlists,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (err) {
    console.error('[search] Data API error:', err);
    return NextResponse.json({ error: 'Search unavailable' }, { status: 503 });
  }
}
