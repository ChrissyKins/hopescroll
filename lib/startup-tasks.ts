// Startup tasks - Run on app initialization
// Handles background operations that should run periodically

import { db } from './db';
import { getAdapters } from './adapters';
import { CONFIG } from './config';
import { createLogger } from './logger';
import { ContentItem } from '@/domain/content/content-item';

const log = createLogger('startup-tasks');

let isRunning = false;
let lastRunTime = 0;

/**
 * Save content items using batch operations (optimized for performance)
 * Based on the efficient implementation in content-service.ts
 */
async function saveContentBatch(items: ContentItem[]): Promise<number> {
  if (items.length === 0) return 0;

  // Batch fetch all existing items in one query
  const existingItems = await db.contentItem.findMany({
    where: {
      OR: items.map(item => ({
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

  // Create a map for quick lookup
  const existingMap = new Map(
    existingItems.map(item => [
      `${item.sourceType}:${item.originalId}`,
      item.id
    ])
  );

  // Separate new items from existing items
  const newItems: ContentItem[] = [];
  const existingIds: string[] = [];

  for (const item of items) {
    const key = `${item.sourceType}:${item.originalId}`;
    const existingId = existingMap.get(key);

    if (existingId) {
      existingIds.push(existingId);
    } else {
      newItems.push(item);
    }
  }

  // Batch insert new items
  let newCount = 0;
  if (newItems.length > 0) {
    try {
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
      log.debug({ newCount }, 'Batch inserted new content items');
    } catch (error) {
      log.error({ error, count: newItems.length }, 'Failed to batch insert content items');
    }
  }

  // Batch update existing items
  if (existingIds.length > 0) {
    try {
      await db.contentItem.updateMany({
        where: { id: { in: existingIds } },
        data: { lastSeenInFeed: new Date() },
      });
      log.debug({ updatedCount: existingIds.length }, 'Batch updated existing content items');
    } catch (error) {
      log.error({ error, count: existingIds.length }, 'Failed to batch update content items');
    }
  }

  return newCount;
}

/**
 * Check if it's been long enough since last run (debounce multiple calls)
 */
function shouldRun(): boolean {
  const now = Date.now();
  const minInterval = 24 * 60 * 60 * 1000; // Don't run more than once per 24 hours

  if (now - lastRunTime < minInterval) {
    return false;
  }

  lastRunTime = now;
  return true;
}

/**
 * Fetch daily backlog quota for incomplete sources
 * Runs automatically on startup if it's been 24+ hours since last fetch
 */
async function fetchDailyBacklog() {
  if (isRunning) {
    log.debug('Backlog fetch already running, skipping');
    return;
  }

  if (!shouldRun()) {
    log.debug('Backlog fetch ran recently, skipping');
    return;
  }

  isRunning = true;

  try {
    log.info('Checking for sources needing backlog fetch');

    // Get sources that need backlog fetching
    const cutoffTime = new Date(Date.now() - 23 * 60 * 60 * 1000); // 23 hours ago

    const sourcesToFetch = await db.contentSource.findMany({
      where: {
        backlogComplete: false,
        OR: [
          { backlogFetchedAt: null },
          { backlogFetchedAt: { lt: cutoffTime } }
        ],
      },
      orderBy: [
        { backlogVideoCount: 'asc' },
        { addedAt: 'desc' },
      ],
      take: 3, // Limit to 3 sources per run to conserve quota
    });

    if (sourcesToFetch.length === 0) {
      log.info('No sources need backlog fetching');
      return;
    }

    log.info({ count: sourcesToFetch.length }, 'Found sources needing backlog fetch');

    const adapters = getAdapters();

    // Process in background (don't await)
    processBacklogFetches(sourcesToFetch, adapters).catch((error) => {
      log.error({ error }, 'Error in background backlog processing');
    });

  } finally {
    isRunning = false;
  }
}

/**
 * Process backlog fetches in background
 */
async function processBacklogFetches(sources: any[], adapters: Map<string, any>) {
  for (const source of sources) {
    try {
      const adapter = adapters.get(source.type);
      if (!adapter) {
        log.warn({ sourceType: source.type }, 'No adapter for source type');
        continue;
      }

      log.info(
        { sourceId: source.sourceId, displayName: source.displayName },
        'Fetching backlog batch in background'
      );

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

        log.info({ sourceId: source.sourceId }, 'Backlog complete');
        continue;
      }

      // Save videos using batch operations (much faster!)
      const savedCount = await saveContentBatch(result.items);

      // Update progress
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
    } catch (error) {
      log.error({ error, sourceId: source.sourceId }, 'Error fetching backlog for source');

      // Update with error
      await db.contentSource.update({
        where: { id: source.id },
        data: {
          lastFetchAt: new Date(),
          lastFetchStatus: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  log.info('Background backlog processing complete');
}

/**
 * Run all startup tasks
 * Call this when the app initializes (e.g., in middleware or API routes)
 */
export async function runStartupTasks() {
  // Run in background - don't block app startup
  fetchDailyBacklog().catch((error) => {
    log.error({ error }, 'Error in startup tasks');
  });
}
