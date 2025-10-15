// Feed Service - Orchestrates feed generation

import { PrismaClient } from '@prisma/client';
import { CacheClient } from '@/lib/cache';
import { FilterEngine } from '@/domain/filtering/filter-engine';
import {
  FilterRule,
  KeywordFilterRule,
  DurationFilterRule,
} from '@/domain/filtering/filter-rule';
import { FeedGenerator } from '@/domain/feed/feed-generator';
import { DiversityEnforcer } from '@/domain/feed/diversity-enforcer';
import { BacklogMixer } from '@/domain/feed/backlog-mixer';
import { FeedItem } from '@/domain/feed/feed-item';
import { ContentItem, FeedPreferences } from '@/domain/content/content-item';
import { createLogger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';

const log = createLogger('feed-service');

export class FeedService {
  private feedGenerator: FeedGenerator;

  constructor(
    private db: PrismaClient,
    private cache: CacheClient
  ) {
    this.feedGenerator = new FeedGenerator(
      new DiversityEnforcer(),
      new BacklogMixer()
    );
  }

  async getUserFeed(userId: string): Promise<FeedItem[]> {
    // Try cache first
    const cached = await this.cache.get<FeedItem[]>(`feed:${userId}`);
    if (cached) {
      log.info({ userId }, 'Feed cache hit');
      return cached;
    }

    log.info({ userId }, 'Generating fresh feed');

    // 1. Load user configuration
    const [sources, filterConfig, preferences, interactions] = await Promise.all([
      this.db.contentSource.findMany({
        where: { userId, isMuted: false },
      }),
      this.loadFilterConfig(userId),
      this.loadPreferences(userId),
      this.db.contentInteraction.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    if (sources.length === 0) {
      log.info({ userId }, 'No sources configured, returning empty feed');
      return [];
    }

    // 2. Load content from all sources
    const allContent = await this.db.contentItem.findMany({
      where: {
        sourceId: { in: sources.map((s) => s.sourceId) },
        sourceType: { in: sources.map((s) => s.type) },
      },
      orderBy: { publishedAt: 'desc' },
      take: CONFIG.feed.maxItemsInFeed * 2, // Get extra for filtering
    });

    if (allContent.length === 0) {
      log.info({ userId }, 'No content available, returning empty feed');
      return [];
    }

    // 3. Build filter engine
    const filterRules: FilterRule[] = [
      ...filterConfig.keywords.map(
        (k) => new KeywordFilterRule(k.keyword, k.isWildcard)
      ),
    ];

    if (filterConfig.durationRange?.min || filterConfig.durationRange?.max) {
      filterRules.push(
        new DurationFilterRule(
          filterConfig.durationRange.min,
          filterConfig.durationRange.max
        )
      );
    }

    log.info(
      {
        userId,
        keywordFilters: filterConfig.keywords.length,
        durationFilter: filterConfig.durationRange ? 'active' : 'none',
        totalRules: filterRules.length
      },
      'Filter configuration loaded'
    );

    const filterEngine = new FilterEngine(filterRules);

    // 4. Apply filters
    const filtered = filterEngine.evaluateBatch(
      allContent.map((c) => this.mapToContentItem(c))
    );

    log.info(
      { userId, total: allContent.length, filtered: filtered.length },
      'Content filtered'
    );

    // 5. Generate feed
    const feed = this.feedGenerator.generate(
      sources.map((s) => ({
        id: s.id,
        userId: s.userId,
        type: s.type,
        sourceId: s.sourceId,
        displayName: s.displayName,
        avatarUrl: s.avatarUrl,
        isMuted: s.isMuted,
        alwaysSafe: s.alwaysSafe,
        addedAt: s.addedAt,
        lastFetchAt: s.lastFetchAt,
        lastFetchStatus: s.lastFetchStatus as 'success' | 'error' | 'pending',
        errorMessage: s.errorMessage,
      })),
      filtered,
      preferences,
      interactions.map((i) => ({
        id: i.id,
        userId: i.userId,
        contentId: i.contentId,
        type: i.type,
        timestamp: i.timestamp,
        watchDuration: i.watchDuration ?? undefined,
        completionRate: i.completionRate ?? undefined,
        dismissReason: i.dismissReason ?? undefined,
        collection: i.collection ?? undefined,
      }))
    );

    // 6. Limit to max feed size
    const limitedFeed = feed.slice(0, CONFIG.feed.maxItemsInFeed);

    // 7. Cache result
    await this.cache.set(
      `feed:${userId}`,
      limitedFeed,
      CONFIG.feed.cacheTimeSeconds
    );

    log.info({ userId, itemCount: limitedFeed.length }, 'Feed generated');
    return limitedFeed;
  }

  async refreshFeed(userId: string): Promise<void> {
    log.info({ userId }, 'Manual feed refresh requested');
    await this.cache.delete(`feed:${userId}`);
  }

  private async loadFilterConfig(userId: string) {
    const keywords = await this.db.filterKeyword.findMany({
      where: { userId },
    });
    const prefs = await this.db.userPreferences.findUnique({
      where: { userId },
    });

    return {
      userId,
      keywords: keywords.map((k) => ({
        id: k.id,
        keyword: k.keyword,
        isWildcard: k.isWildcard,
        createdAt: k.createdAt,
      })),
      durationRange: prefs
        ? {
            min: prefs.minDuration,
            max: prefs.maxDuration,
          }
        : null,
      contentTypePreferences: [],
    };
  }

  private async loadPreferences(userId: string): Promise<FeedPreferences> {
    const prefs = await this.db.userPreferences.findUnique({
      where: { userId },
    });

    return {
      userId,
      backlogRatio: prefs?.backlogRatio ?? CONFIG.feed.defaultBacklogRatio,
      maxConsecutiveFromSource:
        prefs?.diversityLimit ?? CONFIG.feed.maxConsecutiveFromSource,
      theme: (prefs?.theme as 'light' | 'dark') ?? 'dark',
      density: (prefs?.density as 'compact' | 'cozy' | 'comfortable') ?? 'cozy',
      autoPlay: prefs?.autoPlay ?? false,
      updatedAt: prefs?.updatedAt ?? new Date(),
    };
  }

  private mapToContentItem(dbItem: {
    id: string;
    sourceType: string;
    sourceId: string;
    originalId: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    url: string;
    duration: number | null;
    publishedAt: Date;
    fetchedAt: Date;
    lastSeenInFeed: Date;
  }): ContentItem {
    return {
      id: dbItem.id,
      sourceType: dbItem.sourceType as ContentItem['sourceType'],
      sourceId: dbItem.sourceId,
      originalId: dbItem.originalId,
      title: dbItem.title,
      description: dbItem.description,
      thumbnailUrl: dbItem.thumbnailUrl,
      url: dbItem.url,
      duration: dbItem.duration,
      publishedAt: dbItem.publishedAt,
      fetchedAt: dbItem.fetchedAt,
      lastSeenInFeed: dbItem.lastSeenInFeed,
    };
  }
}
