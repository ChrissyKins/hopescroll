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
      const items = await adapter.fetchRecent(
        source.sourceId,
        CONFIG.content.fetchRecentDays
      );

      log.info(
        { sourceId, fetchedCount: items.length },
        'Fetched items from adapter'
      );

      // Save new content to database (deduplicate)
      const newItemsCount = await this.saveContent(items);

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
   * Save content items to database, deduplicating against existing items
   */
  private async saveContent(items: ContentItem[]): Promise<number> {
    if (items.length === 0) return 0;

    let newCount = 0;

    for (const item of items) {
      try {
        // Check if content already exists
        const existing = await this.db.contentItem.findUnique({
          where: {
            sourceType_originalId: {
              sourceType: item.sourceType,
              originalId: item.originalId,
            },
          },
        });

        if (!existing) {
          // Create new content item
          await this.db.contentItem.create({
            data: {
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
          });
          newCount++;
        } else {
          // Update lastSeenInFeed for existing items
          await this.db.contentItem.update({
            where: { id: existing.id },
            data: { lastSeenInFeed: new Date() },
          });
        }
      } catch (error) {
        log.warn(
          { originalId: item.originalId, error },
          'Failed to save content item'
        );
        // Continue with other items even if one fails
      }
    }

    log.debug({ totalItems: items.length, newCount }, 'Saved content items');
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
