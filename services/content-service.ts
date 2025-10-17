// Content Service - Orchestrates content fetching from all sources

import { PrismaClient } from '@prisma/client';
import { ContentAdapter } from '@/adapters/content/base-adapter';
import { createLogger } from '@/lib/logger';
import { ContentItem, SourceType } from '@/domain/content/content-item';
import { CONFIG } from '@/lib/config';

const log = createLogger('content-service');

export class ContentService {
  constructor(
    private db: PrismaClient,
    private adapters: Map<SourceType, ContentAdapter>
  ) {}

  /**
   * Fetch content from all active sources
   * Called by background cron job
   */
  async fetchAllSources(): Promise<FetchStats> {
    log.info('Starting content fetch for all sources');
    const startTime = Date.now();

    // Get all sources that need fetching
    const sources = await this.db.contentSource.findMany({
      where: {
        // Don't fetch from muted sources
        isMuted: false,
      },
    });

    if (sources.length === 0) {
      log.info('No sources to fetch');
      return {
        totalSources: 0,
        successCount: 0,
        errorCount: 0,
        newItemsCount: 0,
        duration: Date.now() - startTime,
      };
    }

    log.info({ sourceCount: sources.length }, 'Fetching from sources');

    const results = await Promise.allSettled(
      sources.map((source) => this.fetchSource(source.id))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const errorCount = results.filter((r) => r.status === 'rejected').length;
    const newItemsCount = results
      .filter((r): r is PromiseFulfilledResult<number> => r.status === 'fulfilled')
      .reduce((sum, r) => sum + r.value, 0);

    const stats = {
      totalSources: sources.length,
      successCount,
      errorCount,
      newItemsCount,
      duration: Date.now() - startTime,
    };

    log.info(stats, 'Content fetch completed');
    return stats;
  }

  /**
   * Fetch content for a specific source
   */
  async fetchSource(sourceId: string): Promise<number> {
    const source = await this.db.contentSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    log.info(
      { sourceId, type: source.type, displayName: source.displayName },
      'Fetching content from source'
    );

    const adapter = this.adapters.get(source.type);
    if (!adapter) {
      const error = `No adapter for source type: ${source.type}`;
      log.error({ sourceId, type: source.type }, error);

      await this.db.contentSource.update({
        where: { id: sourceId },
        data: {
          lastFetchStatus: 'error',
          errorMessage: error,
          lastFetchAt: new Date(),
        },
      });

      throw new Error(error);
    }

    try {
      // Fetch recent content (last N days)
      const recentItems = await adapter.fetchRecent(
        source.sourceId,
        CONFIG.content.fetchRecentDays
      );

      log.info(
        { sourceId, fetchedCount: recentItems.length },
        'Fetched recent items from adapter'
      );

      // Also fetch some backlog content if this is a new source or hasn't been fetched in a while
      let backlogItems: ContentItem[] = [];
      const shouldFetchBacklog = this.shouldFetchBacklog(source);

      if (shouldFetchBacklog) {
        log.info({ sourceId }, 'Fetching backlog content');
        backlogItems = await adapter.fetchBacklog(
          source.sourceId,
          CONFIG.content.backlogBatchSize,
          0
        );
        log.info(
          { sourceId, backlogCount: backlogItems.length },
          'Fetched backlog items from adapter'
        );
      }

      const allItems = [...recentItems, ...backlogItems];

      // Save new content to database (deduplicate)
      const newItemsCount = await this.saveContent(allItems);

      // Update source status
      await this.db.contentSource.update({
        where: { id: sourceId },
        data: {
          lastFetchStatus: 'success',
          lastFetchAt: new Date(),
          errorMessage: null,
        },
      });

      log.info(
        { sourceId, newItemsCount },
        'Successfully fetched and saved content'
      );

      return newItemsCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      log.error(
        { sourceId, error: errorMessage },
        'Failed to fetch content from source'
      );

      await this.db.contentSource.update({
        where: { id: sourceId },
        data: {
          lastFetchStatus: 'error',
          errorMessage,
          lastFetchAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Determine if we should fetch backlog for a source
   * Fetch backlog for new sources or sources that haven't been fetched recently
   */
  private shouldFetchBacklog(source: any): boolean {
    // Always fetch backlog for new sources (never fetched before)
    if (!source.lastFetchAt) {
      return true;
    }

    // Fetch backlog if it's been more than 7 days since last fetch
    const daysSinceLastFetch =
      (Date.now() - source.lastFetchAt.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceLastFetch > 7;
  }

  /**
   * Save content items to database, deduplicating against existing items
   * Optimized with batch operations to avoid N+1 queries
   */
  private async saveContent(items: ContentItem[]): Promise<number> {
    if (items.length === 0) return 0;

    // Batch fetch all existing items in one query
    const existingItems = await this.db.contentItem.findMany({
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
        await this.db.contentItem.createMany({
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
      } catch (error) {
        log.error({ error, count: newItems.length }, 'Failed to batch insert content items');
      }
    }

    // Batch update existing items
    if (existingIds.length > 0) {
      try {
        await this.db.contentItem.updateMany({
          where: { id: { in: existingIds } },
          data: { lastSeenInFeed: new Date() },
        });
      } catch (error) {
        log.error({ error, count: existingIds.length }, 'Failed to batch update content items');
      }
    }

    log.debug({ totalItems: items.length, newCount, updatedCount: existingIds.length }, 'Saved content items');
    return newCount;
  }

  /**
   * Fetch content for a specific user's sources
   * Useful for manual refresh
   */
  async fetchUserSources(userId: string): Promise<FetchStats> {
    log.info({ userId }, 'Starting content fetch for user sources');
    const startTime = Date.now();

    const sources = await this.db.contentSource.findMany({
      where: {
        userId,
        isMuted: false,
      },
    });

    if (sources.length === 0) {
      log.info({ userId }, 'No sources to fetch for user');
      return {
        totalSources: 0,
        successCount: 0,
        errorCount: 0,
        newItemsCount: 0,
        duration: Date.now() - startTime,
      };
    }

    const results = await Promise.allSettled(
      sources.map((source) => this.fetchSource(source.id))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const errorCount = results.filter((r) => r.status === 'rejected').length;
    const newItemsCount = results
      .filter((r): r is PromiseFulfilledResult<number> => r.status === 'fulfilled')
      .reduce((sum, r) => sum + r.value, 0);

    const stats = {
      totalSources: sources.length,
      successCount,
      errorCount,
      newItemsCount,
      duration: Date.now() - startTime,
    };

    log.info({ userId, ...stats }, 'User content fetch completed');
    return stats;
  }
}

export interface FetchStats {
  totalSources: number;
  successCount: number;
  errorCount: number;
  newItemsCount: number;
  duration: number;
}
