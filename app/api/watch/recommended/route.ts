// GET /api/watch/recommended - Get a recommended video from outside user's sources
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';
import { YouTubeClient } from '@/adapters/content/youtube/youtube-client';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const log = createLogger('watch-recommended');

function parseDuration(duration: string): number {
  // Parse ISO 8601 duration (e.g., "PT15M33S")
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const minDuration = searchParams.get('minDuration') ? parseInt(searchParams.get('minDuration')!) : null;
    const maxDuration = searchParams.get('maxDuration') ? parseInt(searchParams.get('maxDuration')!) : null;
    const recencyDays = searchParams.get('recencyDays') ? parseInt(searchParams.get('recencyDays')!) : null;
    const relatedToVideoId = searchParams.get('relatedTo'); // Optional: get recommendations related to a specific video

    const youtubeClient = new YouTubeClient();

    // Get user's existing sources to exclude
    const sources = await db.contentSource.findMany({
      where: { userId, type: 'YOUTUBE' },
      select: { sourceId: true },
    });
    const excludeChannelIds = sources.map((s) => s.sourceId);

    // Get user's interacted content to exclude
    const interactions = await db.contentInteraction.findMany({
      where: {
        userId,
        type: { in: ['WATCHED', 'DISMISSED', 'SAVED', 'BLOCKED'] },
      },
      select: { contentId: true },
    });
    const excludeContentIds = interactions.map((i) => i.contentId);

    // Strategy: Get recommendations based on different approaches
    let recommendedVideoId: string | null = null;

    if (relatedToVideoId) {
      // Get related videos using YouTube's relatedToVideoId parameter
      log.info({ relatedToVideoId }, 'Getting recommendations related to video');

      const searchResponse = await youtubeClient.searchVideos({
        relatedToVideoId,
        maxResults: 50,
      });

      // Filter out videos from user's sources and already interacted content
      const candidates = searchResponse.items.filter((item) => {
        if (!item.id.videoId) return false;
        if (excludeChannelIds.includes(item.snippet.channelId)) return false;
        return true;
      });

      if (candidates.length > 0) {
        // Pick a random candidate
        const randomIndex = Math.floor(Math.random() * candidates.length);
        recommendedVideoId = candidates[randomIndex].id.videoId!;
      }
    } else {
      // Get recommendations based on user's most recent watched videos
      const recentWatched = await db.contentInteraction.findMany({
        where: {
          userId,
          type: 'WATCHED',
          content: {
            sourceType: 'YOUTUBE',
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 5,
        include: {
          content: true,
        },
      });

      if (recentWatched.length > 0) {
        // Get a random recent video to base recommendations on
        const baseVideo = recentWatched[Math.floor(Math.random() * recentWatched.length)];
        const videoId = baseVideo.content.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];

        if (videoId) {
          log.info({ videoId }, 'Getting recommendations based on watch history');

          // Get related videos
          const searchResponse = await youtubeClient.searchVideos({
            relatedToVideoId: videoId,
            maxResults: 50,
          });

          const candidates = searchResponse.items.filter((item) => {
            if (!item.id.videoId) return false;
            if (excludeChannelIds.includes(item.snippet.channelId)) return false;
            return true;
          });

          if (candidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * candidates.length);
            recommendedVideoId = candidates[randomIndex].id.videoId!;
          }
        }
      }
    }

    // If we still don't have a recommendation, do a topic-based search
    if (!recommendedVideoId) {
      log.info('No watch history, doing topic-based search');

      // Get some popular tech/educational topics
      const topics = [
        'technology',
        'programming',
        'science',
        'education',
        'tutorial',
        'documentary',
      ];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];

      const searchResponse = await youtubeClient.searchVideos({
        query: randomTopic,
        maxResults: 50,
        order: 'relevance',
      });

      const candidates = searchResponse.items.filter((item) => {
        if (!item.id.videoId) return false;
        if (excludeChannelIds.includes(item.snippet.channelId)) return false;
        return true;
      });

      if (candidates.length > 0) {
        const randomIndex = Math.floor(Math.random() * candidates.length);
        recommendedVideoId = candidates[randomIndex].id.videoId!;
      }
    }

    if (!recommendedVideoId) {
      return successResponse(null);
    }

    // Get full video details
    const videoResponse = await youtubeClient.getVideos([recommendedVideoId]);

    if (videoResponse.items.length === 0) {
      return successResponse(null);
    }

    const video = videoResponse.items[0];
    const duration = parseDuration(video.contentDetails.duration);

    // Apply duration filter if provided
    if (minDuration !== null && duration < minDuration) {
      return successResponse(null);
    }
    if (maxDuration !== null && duration > maxDuration) {
      return successResponse(null);
    }

    // Apply recency filter if provided
    if (recencyDays !== null) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - recencyDays);
      const publishedDate = new Date(video.snippet.publishedAt);
      if (publishedDate < cutoffDate) {
        return successResponse(null);
      }
    }

    // Check if we already have this content in our database
    let contentItem = await db.contentItem.findFirst({
      where: {
        sourceType: 'YOUTUBE',
        originalId: video.id,
      },
    });

    // If not, create it as a recommended item
    if (!contentItem) {
      contentItem = await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: video.snippet.channelId,
          originalId: video.id,
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnailUrl: video.snippet.thumbnails.high.url,
          url: `https://www.youtube.com/watch?v=${video.id}`,
          duration,
          publishedAt: new Date(video.snippet.publishedAt),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });
    }

    // Return in FeedItem format with isRecommended flag
    const feedItem = {
      content: contentItem,
      position: 0,
      isNew: new Date(contentItem.publishedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
      sourceDisplayName: video.snippet.channelTitle,
      interactionState: null,
      isRecommended: true, // Flag to indicate this is a recommendation
    };

    return successResponse(feedItem);
  } catch (error) {
    log.error({ error }, 'Error fetching recommended video');
    return errorResponse(error);
  }
}
