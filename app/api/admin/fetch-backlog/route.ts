// GET /api/admin/fetch-backlog - Manually trigger backlog fetch (dev/admin)
// For local development where cron jobs don't run automatically

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/get-user-session';
import { db } from '@/lib/db';
import { getAdapters } from '@/lib/adapters';
import { createLogger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

const log = createLogger('admin-fetch-backlog');

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const { userId } = await requireAuth();

    log.info({ userId }, 'Manual backlog fetch triggered');

    // Get user's incomplete sources
    const sources = await db.contentSource.findMany({
      where: {
        userId,
        backlogComplete: false,
      },
      orderBy: [
        { backlogVideoCount: 'asc' },
        { addedAt: 'desc' },
      ],
    });

    if (sources.length === 0) {
      return Response.json({
        success: true,
        message: 'All your sources have complete backlogs!',
        processed: 0,
      });
    }

    const adapters = getAdapters();
    const results = [];

    for (const source of sources) {
      try {
        const adapter = adapters.get(source.type);
        if (!adapter) continue;

        log.info(
          { sourceId: source.sourceId, displayName: source.displayName },
          'Fetching backlog batch'
        );

        // Fetch next batch
        const result = await adapter.fetchBacklog(
          source.sourceId,
          CONFIG.content.dailyBacklogLimit,
          source.backlogPageToken || undefined
        );

        if (result.items.length === 0) {
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

        // Save videos
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

        // Update source
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

        results.push({
          sourceId: source.sourceId,
          displayName: source.displayName,
          fetched: savedCount,
          total: source.backlogVideoCount + savedCount,
          complete: !result.hasMore,
        });
      } catch (error) {
        log.error({ error, sourceId: source.sourceId }, 'Error fetching backlog');
        results.push({
          sourceId: source.sourceId,
          displayName: source.displayName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const totalFetched = results.reduce((sum, r) => sum + (r.fetched || 0), 0);
    const completedCount = results.filter((r) => r.complete).length;

    return Response.json({
      success: true,
      processed: results.length,
      totalFetched,
      completed: completedCount,
      results,
      message: completedCount > 0
        ? `${completedCount} source(s) completed! ${results.length - completedCount} still have more videos.`
        : `Fetched ${totalFetched} videos from ${results.length} source(s). Keep running to fetch more!`,
    });
  } catch (error) {
    log.error({ error }, 'Error in manual backlog fetch');
    return Response.json(
      {
        error: 'Failed to fetch backlog',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
