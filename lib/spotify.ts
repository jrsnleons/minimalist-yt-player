import type { SpotifyPlaylistPreview, SpotifyTrackItem } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let spotifyUrlInfoInstance: any = null;

async function getSpotifyUrlInfo() {
  if (!spotifyUrlInfoInstance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const spotifyUrlInfoFactory = require('spotify-url-info');
    const factory = spotifyUrlInfoFactory?.default || spotifyUrlInfoFactory;
    spotifyUrlInfoInstance = factory(globalThis.fetch);
  }
  return spotifyUrlInfoInstance;
}

export interface ParsedSpotifyUrl {
  type: 'playlist' | 'album' | 'track';
  id: string;
  normalizedUrl: string;
}

/** Extract type and ID from Spotify URL or URI */
export function parseSpotifyUrl(input: string): ParsedSpotifyUrl | null {
  const trimmed = input.trim();

  // 1. URI match: spotify:playlist:ID, spotify:album:ID, spotify:track:ID
  const uriMatch = trimmed.match(/^spotify:(playlist|album|track):([a-zA-Z0-9]{15,30})/);
  if (uriMatch) {
    const type = uriMatch[1] as 'playlist' | 'album' | 'track';
    const id = uriMatch[2];
    return {
      type,
      id,
      normalizedUrl: `https://open.spotify.com/${type}/${id}`,
    };
  }

  // 2. HTTP URL match: https://open.spotify.com/playlist/ID?si=...
  const urlMatch = trimmed.match(/https?:\/\/(?:open\.)?spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]{15,30})/);
  if (urlMatch) {
    const type = urlMatch[1] as 'playlist' | 'album' | 'track';
    const id = urlMatch[2];
    return {
      type,
      id,
      normalizedUrl: `https://open.spotify.com/${type}/${id}`,
    };
  }

  // 3. Raw Spotify 22-char ID
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) {
    return {
      type: 'playlist',
      id: trimmed,
      normalizedUrl: `https://open.spotify.com/playlist/${trimmed}`,
    };
  }

  return null;
}

/** Optional Fallback: Official Spotify Web API Client Credentials */
async function fetchViaOfficialApi(type: 'playlist' | 'album' | 'track', id: string): Promise<SpotifyPlaylistPreview | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    // 1. Get access token
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) return null;
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) return null;

    const headers = { Authorization: `Bearer ${token}` };

    if (type === 'playlist') {
      const plRes = await fetch(`https://api.spotify.com/v1/playlists/${id}`, { headers });
      if (!plRes.ok) return null;
      const pl = await plRes.json();

      const tracks: SpotifyTrackItem[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of pl.tracks?.items || []) {
        const t = item.track;
        if (!t || !t.name) continue;
        tracks.push({
          id: t.id || t.uri || `sp-${tracks.length}`,
          title: t.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          artist: (t.artists || []).map((a: any) => a.name).join(', ') || 'Unknown Artist',
          album: t.album?.name,
          durationMs: t.duration_ms || 180000,
          thumbnailUrl: t.album?.images?.[0]?.url || pl.images?.[0]?.url,
        });
      }

      return {
        id,
        title: pl.name || 'Spotify Playlist',
        description: pl.description || '',
        author: pl.owner?.display_name || 'Spotify User',
        thumbnailUrl: pl.images?.[0]?.url,
        trackCount: tracks.length,
        tracks,
      };
    } else if (type === 'album') {
      const albumRes = await fetch(`https://api.spotify.com/v1/albums/${id}`, { headers });
      if (!albumRes.ok) return null;
      const album = await albumRes.json();

      const tracks: SpotifyTrackItem[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const t of album.tracks?.items || []) {
        if (!t || !t.name) continue;
        tracks.push({
          id: t.id || t.uri || `sp-${tracks.length}`,
          title: t.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          artist: (t.artists || []).map((a: any) => a.name).join(', ') || album.artists?.[0]?.name || 'Unknown Artist',
          album: album.name,
          durationMs: t.duration_ms || 180000,
          thumbnailUrl: album.images?.[0]?.url,
        });
      }

      return {
        id,
        title: album.name || 'Spotify Album',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        author: (album.artists || []).map((a: any) => a.name).join(', ') || 'Various Artists',
        thumbnailUrl: album.images?.[0]?.url,
        trackCount: tracks.length,
        tracks,
      };
    }
  } catch (err) {
    console.error('[Spotify Official API] Error:', err);
  }

  return null;
}

/** Extract metadata and tracklist from Spotify URL (Zero-login primary) */
export async function getSpotifyPlaylistDetails(urlOrId: string): Promise<SpotifyPlaylistPreview> {
  const parsed = parseSpotifyUrl(urlOrId);
  if (!parsed) {
    throw new Error('Invalid Spotify URL or Playlist ID');
  }

  // 1. Try Primary: spotify-url-info (Zero credentials required)
  try {
    const client = await getSpotifyUrlInfo();
    const details = await client.getDetails(parsed.normalizedUrl);

    if (details && details.tracks && details.tracks.length > 0) {
      const title = details.preview?.title || details.preview?.name || 'Spotify Playlist';
      const description = details.preview?.description || '';
      const author = details.preview?.artist || 'Spotify';
      const thumbnailUrl = details.preview?.image || details.preview?.images?.[0]?.url || '';

      const tracks: SpotifyTrackItem[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of details.tracks) {
        const itemTitle = item.name || item.title;
        if (!itemTitle) continue;

        let artist = '';
        if (Array.isArray(item.artists)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          artist = item.artists.map((a: any) => (typeof a === 'string' ? a : a.name)).filter(Boolean).join(', ');
        } else if (item.artist) {
          artist = typeof item.artist === 'string' ? item.artist : item.artist.name || '';
        }

        if (!artist) artist = author || 'Unknown Artist';

        const durationMs =
          typeof item.duration_ms === 'number'
            ? item.duration_ms
            : typeof item.duration === 'number'
            ? item.duration
            : 180000;

        tracks.push({
          id: item.id || item.uri || `sp-${tracks.length}`,
          title: itemTitle,
          artist,
          album: item.album?.name,
          durationMs,
          thumbnailUrl: item.image || item.album?.images?.[0]?.url || thumbnailUrl,
        });
      }

      if (tracks.length > 0) {
        return {
          id: parsed.id,
          title,
          description,
          author,
          thumbnailUrl,
          trackCount: tracks.length,
          tracks,
        };
      }
    }
  } catch (err) {
    console.error('[getSpotifyPlaylistDetails] spotify-url-info error:', err);
  }

  // 2. Fallback: Official Spotify Web API if keys configured
  const official = await fetchViaOfficialApi(parsed.type, parsed.id);
  if (official && official.tracks.length > 0) {
    return official;
  }

  throw new Error('Could not fetch Spotify playlist. Please ensure the playlist is public.');
}
