import { Innertube, Log, Platform } from 'youtubei.js';
import type { Track, SearchPlaylist } from '@/types';
import { isValidTrackDuration, cleanThumbnailUrl } from '@/lib/utils';

// Silence verbose YouTube.js parser warnings and errors in terminal
Log.setLevel(Log.Level.NONE);

// Configure custom JS evaluator for deciphering n-sig tokens and signature ciphers
if (Platform?.shim) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Platform.shim.eval = (data: { output: string }, env: Record<string, any>) => {
    const fn = new Function(...Object.keys(env), data.output);
    return fn(...Object.values(env));
  };
}

// Cache the Promise, not the instance — this prevents concurrent callers from
// each triggering Innertube.create() before the first one resolves.
let innertubePromise: Promise<Awaited<ReturnType<typeof Innertube.create>>> | null = null;

export function getInnertube() {
  if (!innertubePromise) {
    innertubePromise = Innertube.create();
  }
  return innertubePromise;
}

/** Extract title string from various Innertube representations */
function extractTitle(title: unknown): string {
  if (!title) return 'Unknown Title';
  if (typeof title === 'string') return title;
  if (typeof title === 'object' && title !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = title as any;
    if (typeof t.text === 'string') return t.text;
    if (typeof t.toString === 'function') return t.toString();
  }
  return String(title);
}

/** Extract artist name from various Innertube representations */
function extractArtist(item: Record<string, unknown>): string {
  if (Array.isArray(item.artists) && item.artists.length > 0) {
    const name = item.artists[0]?.name;
    if (typeof name === 'string') return name;
  }
  if (item.author) {
    if (typeof item.author === 'string') return item.author;
    if (typeof item.author === 'object' && item.author !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a = item.author as any;
      if (typeof a.name === 'string') return a.name;
    }
  }
  return 'Unknown Artist';
}

/** Extract duration in seconds */
function extractDuration(duration: unknown): number {
  if (typeof duration === 'number') return duration;
  if (typeof duration === 'object' && duration !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = duration as any;
    if (typeof d.seconds === 'number') return d.seconds;
    if (typeof d.text === 'string') {
      const parts = d.text.split(':').map((p: string) => parseInt(p, 10));
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }
  return 0;
}

/** Extract clean, query-free thumbnail URL */
function extractThumbnail(id: string, item: Record<string, unknown>): string {
  if (Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
    const url = item.thumbnails[0]?.url;
    if (typeof url === 'string') return cleanThumbnailUrl(url, id);
  }
  if (Array.isArray(item.thumbnail) && item.thumbnail.length > 0) {
    const url = item.thumbnail[0]?.url;
    if (typeof url === 'string') return cleanThumbnailUrl(url, id);
  }
  return cleanThumbnailUrl(null, id);
}

/** Convert raw search result item to a Track */
function toTrack(item: Record<string, unknown>): Track | null {
  const id = (item.id || item.video_id || item.videoId) as string | undefined;
  if (!id || typeof id !== 'string') return null;

  const title = extractTitle(item.title);
  const artist = extractArtist(item);
  const durationSecs = extractDuration(item.duration);

  // Validate track duration (60s - 600s)
  if (!isValidTrackDuration(durationSecs)) return null;

  const thumbnailUrl = extractThumbnail(id, item);

  return {
    id,
    title,
    artist,
    duration: durationSecs,
    thumbnailUrl,
    addedAt: Date.now(),
  };
}

/** Search YouTube Music via Innertube */
export async function searchTracks(query: string): Promise<Track[]> {
  try {
    const yt = await getInnertube();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (await yt.music.search(query, { type: 'song' })) as any;

    const tracks: Track[] = [];

    // 1. Try `results.songs?.contents`
    const songList = results.songs?.contents || [];
    for (const item of songList) {
      const track = toTrack(item as Record<string, unknown>);
      if (track) tracks.push(track);
      if (tracks.length >= 25) break;
    }

    // 2. If empty, try `results.contents` shelves
    if (tracks.length === 0 && Array.isArray(results.contents)) {
      for (const shelf of results.contents) {
        if (Array.isArray(shelf?.contents)) {
          for (const item of shelf.contents) {
            const track = toTrack(item as Record<string, unknown>);
            if (track) tracks.push(track);
            if (tracks.length >= 25) break;
          }
        }
      }
    }

    return tracks;
  } catch (err) {
    console.error('[searchTracks] Error:', err);
    return [];
  }
}

/** Search general YouTube videos (live performances, covers, talks, long mixes) via Innertube */
export async function searchVideos(query: string): Promise<Track[]> {
  try {
    const yt = await getInnertube();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchRes = (await yt.search(query, { type: 'video' })) as any;
    const videos: Track[] = [];

    const rawList = searchRes.videos || [];
    for (const v of rawList) {
      const id = v.id || v.video_id || v.videoId;
      if (!id || typeof id !== 'string') continue;

      const title =
        v.title?.text ||
        v.title?.toString?.() ||
        v.headline?.text ||
        'YouTube Video';

      const artist =
        v.author?.name ||
        v.author?.text ||
        v.short_byline?.text ||
        v.long_byline?.text ||
        'YouTube';

      const durationSecs =
        typeof v.duration?.seconds === 'number'
          ? v.duration.seconds
          : typeof v.duration === 'number'
          ? v.duration
          : extractDuration(v.duration) || 180;

      const thumbnailUrl = cleanThumbnailUrl(
        v.thumbnails?.[0]?.url || v.thumbnail?.[0]?.url,
        id
      );

      videos.push({
        id,
        title: String(title),
        artist: String(artist),
        duration: durationSecs,
        thumbnailUrl,
        addedAt: Date.now(),
      });

      if (videos.length >= 20) break;
    }

    return videos;
  } catch (err) {
    console.error('[searchVideos] Error:', err);
    return [];
  }
}

/** Search public YouTube playlists via Innertube */
export async function searchPlaylists(query: string): Promise<SearchPlaylist[]> {
  try {
    const yt = await getInnertube();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchRes = (await yt.search(query, { type: 'playlist' })) as any;
    const playlists: SearchPlaylist[] = [];

    const rawList = searchRes.playlists || [];
    for (const pl of rawList) {
      const id = pl.content_id || pl.id;
      if (!id || typeof id !== 'string') continue;

      const title =
        pl.metadata?.title?.text ||
        pl.title?.text ||
        pl.title?.toString?.() ||
        'YouTube Playlist';

      const author =
        pl.metadata?.metadata?.metadata_rows?.[0]?.metadata_parts?.[0]?.text?.text ||
        pl.author?.name ||
        'YouTube';

      const thumbnailUrl = cleanThumbnailUrl(
        pl.content_image?.primary_thumbnail?.image?.[0]?.url ||
          pl.thumbnails?.[0]?.url,
        id
      );

      playlists.push({
        id,
        title: String(title),
        author: String(author),
        thumbnailUrl,
      });
      if (playlists.length >= 15) break;
    }

    return playlists;
  } catch (err) {
    console.error('[searchPlaylists] Error:', err);
    return [];
  }
}

/** Get radio/automix suggestions for a videoId */
export async function getRadioSuggestions(videoId: string): Promise<Track[]> {
  const yt = await getInnertube();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playlist = (await yt.music.getUpNext(videoId)) as any;
    const tracks: Track[] = [];

    const contents = playlist?.contents || [];
    for (const item of contents) {
      const track = toTrack(item as Record<string, unknown>);
      if (track && track.id !== videoId) {
        tracks.push(track);
      }
      if (tracks.length >= 20) break;
    }

    return tracks;
  } catch (err) {
    console.error('[getRadioSuggestions] Error:', err);
    return [];
  }
}

/** Extract direct audio stream URL for a videoId */
export async function getStreamUrl(videoId: string): Promise<string> {
  const yt = await getInnertube();

  // 1. Primary: yt.music.getInfo (best audio formats & direct stream URLs)
  try {
    const musicInfo = await yt.music.getInfo(videoId);
    const format = musicInfo.chooseFormat({
      quality: 'best',
      type: 'audio',
    });
    if (format) {
      if (format.url) return format.url;
      if (typeof format.decipher === 'function') {
        const deciphered = await format.decipher(yt.session.player);
        if (deciphered) return deciphered;
      }
    }
    const progressive = musicInfo.streaming_data?.formats?.find((f) => f.url && f.has_audio);
    if (progressive?.url) return progressive.url;
  } catch (err) {
    console.warn(`[getStreamUrl] music.getInfo failed for ${videoId}:`, err);
  }

  // 2. Fallback: yt.getBasicInfo
  try {
    const basicInfo = await yt.getBasicInfo(videoId);
    const format = basicInfo.chooseFormat({
      quality: 'best',
      type: 'audio',
    });
    if (format) {
      if (format.url) return format.url;
      if (typeof format.decipher === 'function') {
        const deciphered = await format.decipher(yt.session.player);
        if (deciphered) return deciphered;
      }
    }
    const progressive = basicInfo.streaming_data?.formats?.find((f) => f.url && f.has_audio);
    if (progressive?.url) return progressive.url;
  } catch (err) {
    console.warn(`[getStreamUrl] getBasicInfo failed for ${videoId}:`, err);
  }

  // 3. Final fallback: yt.getInfo
  try {
    const info = await yt.getInfo(videoId);
    const format = info.chooseFormat({
      quality: 'best',
      type: 'audio',
    });
    if (format) {
      if (format.url) return format.url;
      if (typeof format.decipher === 'function') {
        const deciphered = await format.decipher(yt.session.player);
        if (deciphered) return deciphered;
      }
    }
    const progressive = info.streaming_data?.formats?.find((f) => f.url && f.has_audio);
    if (progressive?.url) return progressive.url;
  } catch (err) {
    console.error(`[getStreamUrl] getInfo failed for ${videoId}:`, err);
  }

  throw new Error('Could not extract direct stream URL');
}
