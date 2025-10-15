// GET /api/watch/random - Get a random unwatched video
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';
import { FilterService } from '@/services/filter-service';
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    // Get query params for duration filter and recency filter
    const searchParams = request.nextUrl.searchParams;
    const minDuration = searchParams.get('minDuration') ? parseInt(searchParams.get('minDuration')!) : null;
    const maxDuration = searchParams.get('maxDuration') ? parseInt(searchParams.get('maxDuration')!) : null;
    const recencyDays = searchParams.get('recencyDays') ? parseInt(searchParams.get('recencyDays')!) : null;

    // Get user's active sources
    const sources = await db.contentSource.findMany({
      where: { userId, isMuted: false },
    });

    if (sources.length === 0) {
      return successResponse(null);
    }

    // Get user's watched/dismissed/saved content IDs
    const interactions = await db.contentInteraction.findMany({
      where: {
        userId,
        type: { in: ['WATCHED', 'DISMISSED', 'SAVED', 'BLOCKED'] },
      },
      select: { contentId: true },
    });

    const excludeIds = interactions.map((i) => i.contentId);

    // Build query filters
    const whereClause: any = {
      sourceId: { in: sources.map((s) => s.sourceId) },
      sourceType: { in: sources.map((s) => s.type) },
      id: { notIn: excludeIds },
    };

    // Apply duration filter if provided
    if (minDuration !== null || maxDuration !== null) {
      whereClause.duration = {};
      if (minDuration !== null) {
        whereClause.duration.gte = minDuration;
      }
      if (maxDuration !== null) {
        whereClause.duration.lte = maxDuration;
      }
    }

    // Apply recency filter if provided
    if (recencyDays !== null) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - recencyDays);
      whereClause.publishedAt = { gte: cutoffDate };
    }

    // Get total count of matching videos
    const count = await db.contentItem.count({ where: whereClause });

    if (count === 0) {
      return successResponse(null);
    }

    // Get a random offset
    const randomOffset = Math.floor(Math.random() * count);

    // Fetch one random video
    const randomVideo = await db.contentItem.findMany({
      where: whereClause,
      skip: randomOffset,
      take: 1,
    });

    if (randomVideo.length === 0) {
      return successResponse(null);
    }

    // Get the source display name
    const source = sources.find(
      (s) => s.sourceId === randomVideo[0].sourceId && s.type === randomVideo[0].sourceType
    );

    // Return in FeedItem format
    const feedItem = {
      content: randomVideo[0],
      position: 0,
      isNew: new Date(randomVideo[0].publishedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
      sourceDisplayName: source?.displayName || 'Unknown',
      interactionState: null,
    };

    return successResponse(feedItem);
  } catch (error) {
    console.error('Error fetching random video:', error);
    return errorResponse(error);
  }
}
