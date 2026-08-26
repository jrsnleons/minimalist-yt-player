import { type NextRequest, NextResponse } from 'next/server';
import { getStreamUrl } from '@/lib/youtube';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const videoId = request.nextUrl.searchParams.get('videoId')?.trim();

  if (!videoId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 });
  }

  try {
    const url = await getStreamUrl(videoId);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[stream] Error:', err);
    return NextResponse.json({ error: 'Stream extraction failed' }, { status: 503 });
  }
}
