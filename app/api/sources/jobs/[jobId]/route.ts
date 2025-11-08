// GET /api/sources/jobs/:jobId - Check status of a scraping job and process results when complete
// Polls yt-dlp service for job status and saves videos to database when complete

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/get-user-session';
import { createLogger } from '@/lib/logger';
import { ENV } from '@/lib/config';
import { ContentService } from '@/services/content-service';
import { getAdapters } from '@/lib/adapters';

export const dynamic = 'force-dynamic';

const log = createLogger('api-source-job');

interface YtDlpJobStatus {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_video: number;
  total_videos: number;
  channel_id: string;
  channel_name: string;
  created_at: string;
  updated_at: string;
  error_message: string | null;
  result: {
    id: string;
    name: string;
    description: string | null;
    subscriber_count: number | null;
    video_count: number;
    videos: Array<{
      id: string;
      title: string;
      description: string;
      thumbnail: string;
      duration: number;
      view_count: number;
      upload_date: string;
      timestamp: number;
      channel_id: string;
      channel_name: string;
      url: string;
    }>;
  } | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { jobId } = await params;

    log.info({ jobId, userId }, 'Checking job status');

    // Poll yt-dlp service for job status
    const ytDlpServiceUrl = ENV.ytDlpServiceUrl;
    if (!ytDlpServiceUrl) {
      return errorResponse(new Error('yt-dlp service not configured'));
    }

    const jobResponse = await fetch(
      `${ytDlpServiceUrl}/api/jobs/${jobId}`,
      {
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );

    if (!jobResponse.ok) {
      if (jobResponse.status === 404) {
        return new Response('Job not found', { status: 404 });
      }
      const error = await jobResponse.json().catch(() => ({ detail: jobResponse.statusText }));
      throw new Error(error.detail || `Failed to fetch job status: ${jobResponse.statusText}`);
    }

    const jobData: YtDlpJobStatus = await jobResponse.json();

    log.info({ jobId, status: jobData.status, progress: jobData.progress }, 'Job status retrieved');

    // If job is complete, process the results
    if (jobData.status === 'completed' && jobData.result) {
      log.info({ jobId, videoCount: jobData.result.video_count }, 'Job completed, processing results');

      // Find the source by channelId (need to verify user owns it)
      const source = await db.contentSource.findFirst({
        where: {
          sourceId: jobData.channel_id,
          userId,
          type: 'YOUTUBE',
        },
      });

      if (!source) {
        log.warn({ jobId, channelId: jobData.channel_id }, 'Source not found for completed job');
        return successResponse({
          ...jobData,
          processed: false,
          message: 'Source not found',
        });
      }

      // Process and save the videos
      const adapters = getAdapters();
      const contentService = new ContentService(db, adapters);

      // Map yt-dlp videos to ContentItems
      const contentItems = jobData.result.videos.map((video) => ({
        id: crypto.randomUUID(),
        sourceType: 'YOUTUBE' as const,
        sourceId: source.sourceId,
        originalId: video.id,
        title: video.title,
        description: video.description || '',
        thumbnailUrl: video.thumbnail || '',
        url: video.url || `https://youtube.com/watch?v=${video.id}`,
        duration: video.duration || null,
        publishedAt: video.timestamp ? new Date(video.timestamp * 1000) : new Date(),
        fetchedAt: new Date(),
        lastSeenInFeed: new Date(),
      }));

      // Save to database using ContentService's private method
      // We'll need to use a workaround since saveContent is private
      // Instead, we'll directly insert using the same logic
      const existingItems = await db.contentItem.findMany({
        where: {
          OR: contentItems.map(item => ({
            sourceType: item.sourceType,
            originalId: item.originalId,
          })),
        },
        select: {
          id: true,
          sourceType: true,
          originalId: true,
        },
      });

      const existingMap = new Map(
        existingItems.map(item => [
          `${item.sourceType}:${item.originalId}`,
          item.id
        ])
      );

      const newItems = contentItems.filter(item => {
        const key = `${item.sourceType}:${item.originalId}`;
        return !existingMap.has(key);
      });

      const existingIds = contentItems
        .map(item => {
          const key = `${item.sourceType}:${item.originalId}`;
          return existingMap.get(key);
        })
        .filter((id): id is string => id !== undefined);

      // Insert new items
      let newCount = 0;
      if (newItems.length > 0) {
        await db.contentItem.createMany({
          data: newItems.map(item => ({
            sourceType: item.sourceType,
            sourceId: item.sourceId,
            originalId: item.originalId,
            title: item.title,
            description: item.description,
            thumbnailUrl: item.thumbnailUrl,
            url: item.url,
            duration: item.duration,
            publishedAt: item.publishedAt,
            fetchedAt: new Date(),
            lastSeenInFeed: new Date(),
          })),
          skipDuplicates: true,
        });
        newCount = newItems.length;
      }

      // Update existing items
      if (existingIds.length > 0) {
        await db.contentItem.updateMany({
          where: { id: { in: existingIds } },
          data: { lastSeenInFeed: new Date() },
        });
      }

      // Update source status
      await db.contentSource.update({
        where: { id: source.id },
        data: {
          lastFetchStatus: 'success',
          lastFetchAt: new Date(),
          errorMessage: null,
        },
      });

      log.info(
        { jobId, sourceId: source.id, newCount, totalVideos: contentItems.length },
        'Successfully processed job results'
      );

      return successResponse({
        ...jobData,
        processed: true,
        newItemsCount: newCount,
        totalItemsCount: contentItems.length,
      });
    }

    // If job failed, update source status
    if (jobData.status === 'failed') {
      const source = await db.contentSource.findFirst({
        where: {
          sourceId: jobData.channel_id,
          userId,
          type: 'YOUTUBE',
        },
      });

      if (source) {
        await db.contentSource.update({
          where: { id: source.id },
          data: {
            lastFetchStatus: 'error',
            errorMessage: jobData.error_message || 'Scraping failed',
            lastFetchAt: new Date(),
          },
        });
      }
    }

    // Return job status as-is for queued/processing
    return successResponse(jobData);
  } catch (error) {
    log.error({ error }, 'Failed to check job status');
    return errorResponse(error);
  }
}
