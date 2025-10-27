// Startup tasks - Run on app initialization
// Handles background operations that should run periodically

import { db } from './db';
import { getAdapters } from './adapters';
import { CONFIG } from './config';
import { createLogger } from './logger';

const log = createLogger('startup-tasks');

let isRunning = false;
let lastRunTime = 0;

/**
 * Check if it's been long enough since last run (debounce multiple calls)
 */
function shouldRun(): boolean {
  const now = Date.now();
  const minInterval = 60 * 1000; // Don't run more than once per minute

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
      take: 20, // Limit to prevent overwhelming on startup
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
