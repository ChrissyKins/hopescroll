// Interaction Service - Handles user interactions with content

import { PrismaClient } from '@prisma/client';
import { CacheClient } from '@/lib/cache';
import { createLogger } from '@/lib/logger';

const log = createLogger('interaction-service');

export class InteractionService {
  constructor(
    private db: PrismaClient,
    private cache: CacheClient
  ) {}

  /**
   * Record that a user watched a piece of content
   */
  async recordWatch(
    userId: string,
    contentId: string,
    watchDuration?: number,
    completionRate?: number
  ): Promise<void> {
    log.info({ userId, contentId }, 'Recording watch interaction');

    await this.db.contentInteraction.create({
      data: {
        userId,
        contentId,
        type: 'WATCHED',
        watchDuration,
        completionRate,
      },
    });

    // Invalidate feed cache since interaction state has changed
    await this.invalidateUserCache(userId);
  }

  /**
   * Save content for later viewing
   */
  async saveContent(
    userId: string,
    contentId: string,
    collectionId?: string | null,
    notes?: string
  ): Promise<void> {
    log.info({ userId, contentId, collectionId }, 'Saving content');

    // Check if already saved
    const existing = await this.db.savedContent.findUnique({
      where: {
        userId_contentId: {
          userId,
          contentId,
        },
      },
    });

    if (existing) {
      // Update if already exists
      await this.db.savedContent.update({
        where: { id: existing.id },
        data: { collectionId, notes },
      });
    } else {
      // Create new saved content entry
      await this.db.savedContent.create({
        data: {
          userId,
          contentId,
          collectionId,
          notes,
        },
      });
    }

    // Also record as interaction (collection field is kept for historical tracking)
    await this.db.contentInteraction.create({
      data: {
        userId,
        contentId,
        type: 'SAVED',
        collection: collectionId, // Store ID for now (can be migrated later if needed)
      },
    });

    await this.invalidateUserCache(userId);
  }

  /**
   * Permanently dismiss content from feed
   */
  async dismissContent(
    userId: string,
    contentId: string,
    reason?: string
  ): Promise<void> {
    log.info({ userId, contentId, reason }, 'Dismissing content');

    await this.db.contentInteraction.create({
      data: {
        userId,
        contentId,
        type: 'DISMISSED',
        dismissReason: reason,
      },
    });

    await this.invalidateUserCache(userId);
  }

  /**
   * Temporarily dismiss content - it will resurface later
   */
  async notNowContent(userId: string, contentId: string): Promise<void> {
    log.info({ userId, contentId }, 'Marking content as "not now"');

    await this.db.contentInteraction.create({
      data: {
        userId,
        contentId,
        type: 'NOT_NOW',
      },
    });

    await this.invalidateUserCache(userId);
  }

  /**
   * Block content and optionally extract keywords for filtering
   */
  async blockContent(
    userId: string,
    contentId: string,
    extractKeywords: boolean = false
  ): Promise<string[]> {
    log.info({ userId, contentId, extractKeywords }, 'Blocking content');

    await this.db.contentInteraction.create({
      data: {
        userId,
        contentId,
        type: 'BLOCKED',
      },
    });

    let keywords: string[] = [];
    if (extractKeywords) {
      // Get content to extract keywords
      const content = await this.db.contentItem.findUnique({
        where: { id: contentId },
      });

      if (content) {
        // Simple keyword extraction: take significant words from title
        keywords = this.extractKeywords(content.title);

        // Add keywords to filter list
        for (const keyword of keywords) {
          await this.db.filterKeyword.create({
            data: {
              userId,
              keyword,
              isWildcard: false,
            },
          });
        }
      }
    }

    await this.invalidateUserCache(userId);
    return keywords;
  }

  /**
   * Get interaction history for a user
   */
  async getHistory(
    userId: string,
    type?: 'WATCHED' | 'SAVED' | 'DISMISSED' | 'NOT_NOW' | 'BLOCKED',
    limit: number = 50
  ) {
    const interactions = await this.db.contentInteraction.findMany({
      where: {
        userId,
        ...(type && { type }),
      },
      include: {
        content: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    return interactions;
  }

  /**
   * Get saved content for a user
   */
  async getSavedContent(userId: string, collectionId?: string | null) {
    const saved = await this.db.savedContent.findMany({
      where: {
        userId,
        ...(collectionId !== undefined && { collectionId }),
      },
      include: {
        content: true,
        collection: true,
      },
      orderBy: {
        savedAt: 'desc',
      },
    });

    return saved;
  }

  /**
   * Remove content from saved list
   */
  async unsaveContent(userId: string, contentId: string): Promise<void> {
    log.info({ userId, contentId }, 'Removing from saved');

    await this.db.savedContent.deleteMany({
      where: {
        userId,
        contentId,
      },
    });

    await this.invalidateUserCache(userId);
  }

  /**
   * Invalidate user's cached data
   */
  private async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.cache.delete(`feed:${userId}`),
      this.cache.delete(`saved:${userId}`),
      this.cache.delete(`history:${userId}`),
    ]);
  }

  /**
   * Extract meaningful keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction:
    // 1. Split on spaces
    // 2. Filter out common words
    // 3. Take words longer than 3 characters
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these',
      'those', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
    ]);

    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .slice(0, 5); // Take top 5 keywords
  }
}
