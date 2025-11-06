// GET /api/feed - Get user's feed
import { NextRequest } from 'next/server';
import { FeedService } from '@/services/feed-service';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const feedService = new FeedService(db, cache);
    const feed = await feedService.getUserFeed(userId);

    return successResponse(feed);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const feedService = new FeedService(db, cache);
    await feedService.refreshFeed(userId);

    return successResponse({ message: 'Feed refreshed' });
  } catch (error) {
    return errorResponse(error);
  }
}
