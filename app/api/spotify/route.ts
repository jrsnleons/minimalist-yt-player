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
    return NextResponse.json(details);
  } catch (err: any) {
    console.error('[api/spotify] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch Spotify playlist. Ensure it is public.' },
      { status: 404 }
    );
  }
}
