import { type NextRequest, NextResponse } from 'next/server';
import { getSpotifyPlaylistDetails } from '@/lib/spotify';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl.searchParams.get('url')?.trim();
  const id = request.nextUrl.searchParams.get('id')?.trim();

  const input = url || id;
  if (!input) {
    return NextResponse.json({ error: 'Spotify playlist URL or ID is required' }, { status: 400 });
  }

  try {
    const details = await getSpotifyPlaylistDetails(input);
    return NextResponse.json(details, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('[api/spotify] Error:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch Spotify playlist';
    const status = message.toLowerCase().includes('invalid') ? 400 : 404;
    return NextResponse.json(
      { error: message || 'Failed to fetch Spotify playlist. Ensure it is public.' },
      { status }
    );
  }
}
