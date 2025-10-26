import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { YouTubeAdapter } from '@/adapters/content/youtube/youtube-adapter';
import { YouTubeClient } from '@/adapters/content/youtube/youtube-client';
import { ENV } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'YOUTUBE';

    // Validate query
    if (!query || query.trim().length === 0) {
      return Response.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    if (query.trim().length < 2) {
      return Response.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Only YouTube is supported for now
    if (type !== 'YOUTUBE') {
      return Response.json(
        { error: 'Only YOUTUBE source type is currently supported for search' },
        { status: 400 }
      );
    }

    // Search for channels
    const youtubeClient = new YouTubeClient(ENV.youtubeApiKey);
    const youtubeAdapter = new YouTubeAdapter(youtubeClient);

    const results = await youtubeAdapter.searchChannels(query.trim());

    return Response.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Channel search error:', error);
    return Response.json(
      {
        error: 'Failed to search channels',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
