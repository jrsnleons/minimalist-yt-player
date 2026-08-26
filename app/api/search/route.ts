import { type NextRequest, NextResponse } from 'next/server';
import { searchTracks, searchPlaylists } from '@/lib/youtube';
import type { Track, SearchPlaylist } from '@/types';

const YOUTUBE_API_KEY = process.env.YOUTUBE_DATA_API_KEY;

/** Fallback: YouTube Data API v3 search */
async function searchViaDataAPI(query: string, type: string): Promise<{ tracks: Track[]; playlists: SearchPlaylist[] }> {
  if (!YOUTUBE_API_KEY) return { tracks: [], playlists: [] };

  const result: { tracks: Track[]; playlists: SearchPlaylist[] } = { tracks: [], playlists: [] };

  // 1. Fetch Songs if needed
  if (type === 'all' || type === 'song') {
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/search');
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('q', query);
      url.searchParams.set('type', 'video');
      url.searchParams.set('videoCategoryId', '10'); // Music
      url.searchParams.set('maxResults', '20');
      url.searchParams.set('key', YOUTUBE_API_KEY);

      const searchRes = await fetch(url.toString());
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const videoIds = (searchData.items ?? []).map((i: any) => i.id?.videoId).filter(Boolean).join(',');

        if (videoIds) {
          const detailUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
          detailUrl.searchParams.set('part', 'contentDetails');
          detailUrl.searchParams.set('id', videoIds);
          detailUrl.searchParams.set('key', YOUTUBE_API_KEY);

          const detailRes = await fetch(detailUrl.toString());
          const durationMap = new Map<string, number>();
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            for (const item of detailData.items ?? []) {
              const match = item.contentDetails?.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
              if (!match) continue;
              const h = parseInt(match[1] ?? '0', 10);
              const m = parseInt(match[2] ?? '0', 10);
              const s = parseInt(match[3] ?? '0', 10);
              durationMap.set(item.id, h * 3600 + m * 60 + s);
            }
          }

          for (const item of searchData.items ?? []) {
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
        }
      }
    } catch {}
  }

  // 2. Fetch Playlists if needed
  if (type === 'all' || type === 'playlist') {
    try {
      const plUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      plUrl.searchParams.set('part', 'snippet');
      plUrl.searchParams.set('q', query);
      plUrl.searchParams.set('type', 'playlist');
      plUrl.searchParams.set('maxResults', '10');
      plUrl.searchParams.set('key', YOUTUBE_API_KEY);

      const plRes = await fetch(plUrl.toString());
      if (plRes.ok) {
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
      }
    } catch {}
  }

  return result;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = request.nextUrl.searchParams.get('q')?.trim();
  const searchType = request.nextUrl.searchParams.get('type')?.trim() || 'all'; // 'all' | 'song' | 'playlist'

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  // Primary: Innertube
  try {
    let tracks: Track[] = [];
    let playlists: SearchPlaylist[] = [];

    if (searchType === 'all' || searchType === 'song') {
      tracks = await searchTracks(query);
    }
    if (searchType === 'all' || searchType === 'playlist') {
      playlists = await searchPlaylists(query);
    }

    if (tracks.length > 0 || playlists.length > 0) {
      return NextResponse.json({
        results: tracks, // for backward compatibility
        tracks,
        playlists,
      });
    }
  } catch (err) {
    console.error('[search] Innertube error:', err);
  }

  // Fallback: YouTube Data API v3
  try {
    const fallback = await searchViaDataAPI(query, searchType);
    return NextResponse.json({
      results: fallback.tracks,
      tracks: fallback.tracks,
      playlists: fallback.playlists,
    });
  } catch (err) {
    console.error('[search] Data API error:', err);
    return NextResponse.json({ error: 'Search unavailable' }, { status: 503 });
  }
}
