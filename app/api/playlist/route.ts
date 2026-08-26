import { type NextRequest, NextResponse } from 'next/server';
import { getInnertube } from '@/lib/youtube';
import type { Track } from '@/types';

const YOUTUBE_API_KEY = process.env.YOUTUBE_DATA_API_KEY;

function parseDurationText(text?: string): number {
  if (!text) return 180;
  const parts = text.trim().split(':').map(Number);
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
  if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  return 180;
}

function extractPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  // Match ?list= or &list= in URLs
  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) return listMatch[1];

  // Match /playlist/ID
  const pathMatch = trimmed.match(/playlist\/([a-zA-Z0-9_-]+)/);
  if (pathMatch) return pathMatch[1];

  // Raw ID starting with PL, OLAK, RD, etc.
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/** Fallback: YouTube Data API v3 playlist fetching */
async function fetchViaDataAPI(playlistId: string): Promise<{ title: string; description?: string; tracks: Track[] } | null> {
  if (!YOUTUBE_API_KEY) return null;

  try {
    // 1. Get playlist metadata
    const metaUrl = new URL('https://www.googleapis.com/youtube/v3/playlists');
    metaUrl.searchParams.set('part', 'snippet');
    metaUrl.searchParams.set('id', playlistId);
    metaUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const metaRes = await fetch(metaUrl.toString());
    if (!metaRes.ok) return null;
    const metaData = await metaRes.json();
    const plSnippet = metaData.items?.[0]?.snippet;
    const title = plSnippet?.title || 'Imported Playlist';
    const description = plSnippet?.description || '';

    // 2. Get playlist items
    const itemsUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    itemsUrl.searchParams.set('part', 'snippet,contentDetails');
    itemsUrl.searchParams.set('playlistId', playlistId);
    itemsUrl.searchParams.set('maxResults', '50');
    itemsUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const itemsRes = await fetch(itemsUrl.toString());
    if (!itemsRes.ok) return null;
    const itemsData = await itemsRes.json();

    const videoIds = (itemsData.items ?? [])
      .map((i: any) => i.contentDetails?.videoId || i.snippet?.resourceId?.videoId)
      .filter(Boolean)
      .join(',');

    // 3. Get durations
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

    const tracks: Track[] = [];
    for (const item of itemsData.items ?? []) {
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (!videoId) continue;
      const itemTitle = item.snippet?.title;
      if (itemTitle === 'Private video' || itemTitle === 'Deleted video') continue;

      tracks.push({
        id: videoId,
        title: itemTitle,
        artist: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || 'YouTube Music',
        duration: durationMap.get(videoId) ?? 200,
        thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        addedAt: Date.now(),
      });
    }

    return { title, description, tracks };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const urlParam = request.nextUrl.searchParams.get('url')?.trim();
  const idParam = request.nextUrl.searchParams.get('id')?.trim();

  const playlistId = extractPlaylistId(urlParam || idParam || '');

  if (!playlistId) {
    return NextResponse.json({ error: 'Valid YouTube Playlist URL or ID is required' }, { status: 400 });
  }

  // 1. Try Innertube music.getPlaylist
  try {
    const yt = await getInnertube();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pl = (await yt.music.getPlaylist(playlistId)) as any;

    const title =
      pl.header?.title?.text ||
      pl.header?.title?.toString?.() ||
      pl.info?.title?.text ||
      pl.info?.title ||
      'Imported Playlist';

    const description =
      pl.header?.description?.text ||
      pl.header?.description?.toString?.() ||
      '';

    const author =
      pl.header?.author?.name ||
      pl.header?.author?.text ||
      'YouTube Music';

    const rawItems = pl.items || pl.contents || [];
    const tracks: Track[] = [];

    for (const item of rawItems) {
      const id = item.id || item.video_id;
      if (!id) continue;

      const trackTitle = item.title?.text || item.title?.toString?.() || item.title || 'Unknown Track';
      if (trackTitle === 'Deleted video' || trackTitle === 'Private video') continue;

      const artist =
        Array.isArray(item.authors) && item.authors.length > 0
          ? item.authors.map((a: any) => a.name).join(', ')
          : Array.isArray(item.artists) && item.artists.length > 0
          ? item.artists.map((a: any) => a.name).join(', ')
          : item.author?.name || author || 'YouTube Music';

      const duration =
        typeof item.duration?.seconds === 'number' && item.duration.seconds > 0
          ? item.duration.seconds
          : parseDurationText(item.duration?.text || item.duration?.toString?.());

      const thumbnailUrl =
        item.thumbnail?.contents?.[0]?.url ||
        item.thumbnails?.[0]?.url ||
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

      tracks.push({
        id,
        title: trackTitle,
        artist,
        duration,
        thumbnailUrl,
        addedAt: Date.now(),
      });
    }

    if (tracks.length > 0) {
      return NextResponse.json({
        id: playlistId,
        title,
        description,
        author,
        trackCount: tracks.length,
        tracks,
      });
    }
  } catch (err) {
    console.error('[playlist] yt.music.getPlaylist error:', err);
  }

  // 2. Try Innertube standard getPlaylist
  try {
    const yt = await getInnertube();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pl = (await yt.getPlaylist(playlistId)) as any;

    const title = pl.info?.title?.text || pl.info?.title?.toString?.() || pl.info?.title || 'Imported Playlist';
    const description = pl.info?.description?.toString?.() || '';
    const author = pl.info?.author?.name?.toString?.() || '';

    const rawVideos = (pl.videos as any[]) || [];
    const tracks: Track[] = [];

    for (const v of rawVideos) {
      const id = v.content_id || v.id || v.video_id;
      if (!id) continue;

      const trackTitle =
        v.metadata?.title?.text ||
        v.title?.text ||
        v.title?.toString?.() ||
        'Unknown Track';

      if (trackTitle === 'Deleted video' || trackTitle === 'Private video') continue;

      const artist =
        v.metadata?.metadata?.metadata_rows?.[0]?.metadata_parts?.[0]?.text?.text ||
        v.author?.name ||
        author ||
        'YouTube Music';

      const durationText =
        v.content_image?.overlays?.[0]?.badges?.[0]?.text ||
        v.duration?.text ||
        '';

      const duration = parseDurationText(durationText);
      const thumbnailUrl =
        v.content_image?.image?.[0]?.url ||
        v.thumbnails?.[0]?.url ||
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

      tracks.push({
        id,
        title: trackTitle,
        artist,
        duration,
        thumbnailUrl,
        addedAt: Date.now(),
      });
    }

    if (tracks.length > 0) {
      return NextResponse.json({
        id: playlistId,
        title: String(title),
        description: String(description),
        author,
        trackCount: tracks.length,
        tracks,
      });
    }
  } catch (err) {
    console.error('[playlist] yt.getPlaylist error:', err);
  }

  // 3. Fallback: YouTube Data API v3
  try {
    const fallback = await fetchViaDataAPI(playlistId);
    if (fallback && fallback.tracks.length > 0) {
      return NextResponse.json({
        id: playlistId,
        title: fallback.title,
        description: fallback.description,
        trackCount: fallback.tracks.length,
        tracks: fallback.tracks,
      });
    }
  } catch (err) {
    console.error('[playlist] Data API fallback error:', err);
  }

  return NextResponse.json(
    { error: 'Could not fetch playlist. Please ensure the playlist is public or unlisted.' },
    { status: 404 }
  );
}
