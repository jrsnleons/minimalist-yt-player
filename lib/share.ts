import QRCode from 'qrcode';
import type { Track } from '@/types';

export interface SharedPlaylistData {
  name: string;
  description?: string;
  tracks: Track[];
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + chunkSize, len)))
    );
  }
  const base64 =
    typeof window !== 'undefined'
      ? btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  if (typeof window !== 'undefined') {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * Encodes a playlist with its track metadata into an ultra-compact, URL-safe Base64 hash.
 * Uses pipe/unit delimiters + deflate-raw compression to produce a tiny ~200-400 character string.
 */
export async function encodePlaylistForShare(
  playlist: { name: string; description?: string },
  tracks: Track[]
): Promise<string> {
  const cleanName = (playlist.name || 'Shared Playlist').slice(0, 50);
  const cleanDesc = (playlist.description || '').slice(0, 100);

  // If playlist is unusually large (>35 tracks), use ID-packed format to ensure QR code stays scannable
  const isIdOnly = tracks.length > 35;

  if (isIdOnly) {
    const ids = tracks.map((t) => t.id).join(',');
    const packed = [cleanName, cleanDesc, ids].join('\x1e');
    try {
      if (typeof CompressionStream !== 'undefined') {
        const bytes = new TextEncoder().encode(packed);
        const stream = new Response(
          new Blob([bytes.buffer as ArrayBuffer]).stream().pipeThrough(new CompressionStream('deflate-raw'))
        );
        const buf = await stream.arrayBuffer();
        return 'i_' + uint8ArrayToBase64Url(new Uint8Array(buf));
      }
    } catch {
      // fallback below
    }
    return 'ir_' + uint8ArrayToBase64Url(new TextEncoder().encode(packed));
  }

  // Compact delimited format: Header \x1e Track1 \x1e Track2 ...
  const header = [cleanName, cleanDesc].join('\x1f');
  const trackEntries = tracks.map((t) =>
    [
      t.id,
      (t.title || 'Unknown').slice(0, 55),
      (t.artist || 'Unknown').slice(0, 30),
      Math.round(t.duration || 0),
    ].join('\x1f')
  );
  const packed = [header, ...trackEntries].join('\x1e');

  try {
    if (typeof CompressionStream !== 'undefined') {
      const bytes = new TextEncoder().encode(packed);
      const stream = new Response(
        new Blob([bytes.buffer as ArrayBuffer]).stream().pipeThrough(new CompressionStream('deflate-raw'))
      );
      const buf = await stream.arrayBuffer();
      return 'c_' + uint8ArrayToBase64Url(new Uint8Array(buf));
    }
  } catch {
    // fallback below
  }

  return 'cr_' + uint8ArrayToBase64Url(new TextEncoder().encode(packed));
}

/**
 * Decodes any shared playlist hash format (compact c_, ID-only i_, legacy z_, r_, or raw JSON).
 */
export async function decodeSharedPlaylist(hash: string): Promise<SharedPlaylistData | null> {
  try {
    if (!hash || typeof hash !== 'string') return null;

    // 1. Compact Compressed Format ('c_')
    if (hash.startsWith('c_')) {
      const cleanHash = hash.slice(2);
      const bytes = base64UrlToUint8Array(cleanHash);
      const stream = new Response(
        new Blob([bytes.buffer as ArrayBuffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      );
      const text = await stream.text();
      return parseCompactFormat(text);
    }

    // 2. Compact Raw Format ('cr_')
    if (hash.startsWith('cr_')) {
      const cleanHash = hash.slice(3);
      const bytes = base64UrlToUint8Array(cleanHash);
      const text = new TextDecoder().decode(bytes);
      return parseCompactFormat(text);
    }

    // 3. ID-Only Compressed Format ('i_')
    if (hash.startsWith('i_')) {
      const cleanHash = hash.slice(2);
      const bytes = base64UrlToUint8Array(cleanHash);
      const stream = new Response(
        new Blob([bytes.buffer as ArrayBuffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      );
      const text = await stream.text();
      return parseIdOnlyFormat(text);
    }

    // 4. ID-Only Raw Format ('ir_')
    if (hash.startsWith('ir_')) {
      const cleanHash = hash.slice(3);
      const bytes = base64UrlToUint8Array(cleanHash);
      const text = new TextDecoder().decode(bytes);
      return parseIdOnlyFormat(text);
    }

    // 5. Legacy Compressed JSON ('z_')
    if (hash.startsWith('z_')) {
      const cleanHash = hash.slice(2);
      const bytes = base64UrlToUint8Array(cleanHash);
      const stream = new Response(
        new Blob([bytes.buffer as ArrayBuffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      );
      const json = await stream.text();
      return parseLegacyJson(json);
    }

    // 6. Legacy Raw JSON ('r_' or plain base64)
    const cleanHash = hash.startsWith('r_') ? hash.slice(2) : hash;
    const bytes = base64UrlToUint8Array(cleanHash);
    const json = new TextDecoder().decode(bytes);
    return parseLegacyJson(json);
  } catch (err) {
    console.error('[share] Decode failed:', err);
    return null;
  }
}

function parseCompactFormat(text: string): SharedPlaylistData | null {
  const records = text.split('\x1e');
  if (records.length < 1) return null;

  const [name, desc] = records[0].split('\x1f');
  const tracks: Track[] = records
    .slice(1)
    .filter(Boolean)
    .map((r, i) => {
      const [id, title, artist, dur] = r.split('\x1f');
      const cleanId = id || `track-${i}`;
      return {
        id: cleanId,
        title: title || 'Unknown Title',
        artist: artist || 'Unknown Artist',
        duration: Number(dur) || 0,
        thumbnailUrl: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
        addedAt: Date.now(),
      };
    });

  return {
    name: name || 'Shared Playlist',
    description: desc || undefined,
    tracks,
  };
}

function parseIdOnlyFormat(text: string): SharedPlaylistData | null {
  const [name, desc, idsStr] = text.split('\x1e');
  if (!name || !idsStr) return null;

  const ids = idsStr.split(',').filter(Boolean);
  const tracks: Track[] = ids.map((id, i) => ({
    id,
    title: `Track ${i + 1}`,
    artist: 'YouTube Audio',
    duration: 0,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    addedAt: Date.now(),
  }));

  return {
    name: name || 'Shared Playlist',
    description: desc || undefined,
    tracks,
  };
}

function parseLegacyJson(json: string): SharedPlaylistData | null {
  try {
    const data = JSON.parse(json);
    if (!data || !data.n || !Array.isArray(data.t)) return null;

    const tracks: Track[] = data.t.map((item: (string | number)[]) => {
      const id = String(item[0]);
      return {
        id,
        title: String(item[1] || 'Unknown Title'),
        artist: String(item[2] || 'Unknown Artist'),
        duration: Number(item[3]) || 0,
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        addedAt: Date.now(),
      };
    });

    return {
      name: String(data.n),
      description: data.d ? String(data.d) : undefined,
      tracks,
    };
  } catch {
    return null;
  }
}

/**
 * Generates an SVG Data URI QR code with maximum scannability ('L' error correction level).
 * Large clean modules scan instantly on all phone cameras.
 */
export async function generateQrCodeSvg(url: string): Promise<string> {
  try {
    return await QRCode.toString(url, {
      type: 'svg',
      margin: 2,
      errorCorrectionLevel: 'L', // Lowest density -> largest modules for instantaneous optical scan
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('[share] QR generation failed:', err);
    return '';
  }
}
