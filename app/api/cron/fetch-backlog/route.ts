// GET /api/cron/fetch-backlog - Incrementally fetch backlog for sources
// Runs daily to fetch 100 videos per channel until complete

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAdapters } from '@/lib/adapters';
import { createLogger } from '@/lib/logger';
import { ENV } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

const log = createLogger('cron-fetch-backlog');

const DAILY_BACKLOG_LIMIT = 100; // Videos per channel per day

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (ENV.cronSecret && authHeader !== `Bearer ${ENV.cronSecret}`) {
      log.warn('Unauthorized cron request');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    log.info('Starting incremental backlog fetch');

    // Get sources that need backlog fetching
    // Criteria: backlogComplete = false AND (backlogFetchedAt is null OR > 23 hours ago)
    const cutoffTime = new Date(Date.now() - 23 * 60 * 60 * 1000);

    const sourcesToFetch = await db.contentSource.findMany({
      where: {
        backlogComplete: false,
        OR: [
          { backlogFetchedAt: null },
          { backlogFetchedAt: { lt: cutoffTime } }
        ],
      },
      orderBy: [
        { backlogVideoCount: 'asc' }, // Prioritize sources with fewer fetched
        { addedAt: 'desc' }, // Then by newest
      ],
      take: 20, // Limit to 20 sources per run
    });

    if (sourcesToFetch.length === 0) {
      log.info('No sources need backlog fetching');
      return Response.json({
        success: true,
        message: 'No sources to fetch',
        processed: 0,
      });
    }

    log.info({ count: sourcesToFetch.length }, 'Found sources needing backlog fetch');

    const adapters = getAdapters();
    const results = [];

    for (const source of sourcesToFetch) {
      try {
        const adapter = adapters.get(source.type);
        if (!adapter) {
          log.warn({ sourceType: source.type }, 'No adapter found for source type');
          continue;
        }

        log.info(
          { sourceId: source.sourceId, displayName: source.displayName },
          'Fetching backlog batch'
        );

        // Fetch next batch (100 videos)
        const result = await adapter.fetchBacklog(
          source.sourceId,
          DAILY_BACKLOG_LIMIT,
          source.backlogPageToken || undefined
        );

        if (result.items.length === 0) {
          log.info({ sourceId: source.sourceId }, 'No new videos in backlog');

          // Mark as complete
          await db.contentSource.update({
            where: { id: source.id },
            data: {
              backlogComplete: true,
              backlogFetchedAt: new Date(),
            },
          });

          results.push({
            sourceId: source.sourceId,
            displayName: source.displayName,
            fetched: 0,
            complete: true,
          });
          continue;
        }

        // Save videos to database
        let savedCount = 0;
        for (const item of result.items) {
          try {
            await db.contentItem.upsert({
              where: {
                sourceType_originalId: {
                  sourceType: item.sourceType,
                  originalId: item.originalId,
                },
              },
              create: {
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
              },
              update: {
                lastSeenInFeed: new Date(),
              },
            });
            savedCount++;
          } catch (error) {
            log.error({ error, videoId: item.originalId }, 'Failed to save video');
          }
        }

        // Update source with progress
        await db.contentSource.update({
          where: { id: source.id },
          data: {
            backlogPageToken: result.nextPageToken,
            backlogFetchedAt: new Date(),
            backlogComplete: !result.hasMore,
            backlogVideoCount: source.backlogVideoCount + savedCount,
            lastFetchAt: new Date(),
            lastFetchStatus: 'success',
          },
        });

        log.info(
          {
            sourceId: source.sourceId,
            fetched: savedCount,
            total: source.backlogVideoCount + savedCount,
            complete: !result.hasMore,
          },
          'Backlog batch complete'
        );

        results.push({
          sourceId: source.sourceId,
          displayName: source.displayName,
          fetched: savedCount,
          total: source.backlogVideoCount + savedCount,
          complete: !result.hasMore,
        });
      } catch (error) {
        log.error(
          { error, sourceId: source.sourceId },
          'Error fetching backlog for source'
        );

        // Update source with error
        await db.contentSource.update({
          where: { id: source.id },
          data: {
            lastFetchAt: new Date(),
            lastFetchStatus: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        results.push({
          sourceId: source.sourceId,
          displayName: source.displayName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const totalFetched = results.reduce((sum, r) => sum + (r.fetched || 0), 0);
    const completedCount = results.filter((r) => r.complete).length;

    log.info(
      { totalFetched, processed: results.length, completed: completedCount },
      'Backlog fetch complete'
    );

    return Response.json({
      success: true,
      processed: results.length,
      totalFetched,
      completed: completedCount,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error({ error }, 'Error in backlog fetch cron');
    return Response.json(
      {
        error: 'Failed to fetch backlog',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
