// YouTube Cache Service
// Caches YouTube API responses to reduce quota usage

import { PrismaClient } from '@prisma/client';
import { createLogger } from '@/lib/logger';
import { createHash } from 'crypto';

const log = createLogger('youtube-cache');

// Cache TTLs (in seconds)
const CACHE_TTL = {
  channel: 24 * 60 * 60,       // 24 hours - channel info changes rarely
  videos: 6 * 60 * 60,          // 6 hours - new videos might appear
  search: 1 * 60 * 60,          // 1 hour - search results can change
  playlist: 6 * 60 * 60,        // 6 hours - playlists updated occasionally
} as const;

type CacheType = keyof typeof CACHE_TTL;

export class YouTubeCache {
  constructor(private db: PrismaClient) {}

  /**
   * Get cached response if available and not expired
   */
  async get<T>(cacheType: CacheType, params: Record<string, any>): Promise<T | null> {
    try {
      const cacheKey = this.generateCacheKey(cacheType, params);

      const cached = await this.db.youTubeCache.findUnique({
        where: { cacheKey },
      });

      if (!cached) {
        log.debug({ cacheType, cacheKey }, 'Cache miss');
        return null;
      }

      // Check if expired
      if (new Date() > cached.expiresAt) {
        log.debug({ cacheType, cacheKey }, 'Cache expired');
        // Delete expired entry asynchronously
        this.db.youTubeCache.delete({ where: { id: cached.id } }).catch(err => {
          log.warn({ error: err }, 'Failed to delete expired cache entry');
        });
        return null;
      }

      log.info({ cacheType, cacheKey }, 'Cache hit');
      return JSON.parse(cached.response) as T;
    } catch (error) {
      log.error({ error, cacheType }, 'Failed to get from cache');
      return null; // Fail gracefully
    }
  }

  /**
   * Store response in cache
   */
  async set(cacheType: CacheType, params: Record<string, any>, response: any): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(cacheType, params);
      const ttl = CACHE_TTL[cacheType];
      const expiresAt = new Date(Date.now() + ttl * 1000);

      await this.db.youTubeCache.upsert({
        where: { cacheKey },
        create: {
          cacheKey,
          cacheType,
          response: JSON.stringify(response),
          expiresAt,
        },
        update: {
          response: JSON.stringify(response),
          expiresAt,
        },
      });

      log.debug({ cacheType, cacheKey, ttl }, 'Cached response');
    } catch (error) {
      log.error({ error, cacheType }, 'Failed to set cache');
      // Don't throw - caching failures shouldn't break the app
    }
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidate(cacheType: CacheType, params: Record<string, any>): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(cacheType, params);
      await this.db.youTubeCache.delete({ where: { cacheKey } });
      log.info({ cacheType, cacheKey }, 'Invalidated cache');
    } catch (error) {
      // Ignore not found errors
      if (error && typeof error === 'object' && 'code' in error && error.code !== 'P2025') {
        log.error({ error, cacheType }, 'Failed to invalidate cache');
      }
    }
  }

  /**
   * Invalidate all cache entries of a specific type
   */
  async invalidateType(cacheType: CacheType): Promise<void> {
    try {
      const result = await this.db.youTubeCache.deleteMany({
        where: { cacheType },
      });
      log.info({ cacheType, count: result.count }, 'Invalidated cache type');
    } catch (error) {
      log.error({ error, cacheType }, 'Failed to invalidate cache type');
    }
  }

  /**
   * Clean up expired cache entries (run periodically)
   */
  async cleanExpired(): Promise<number> {
    try {
      const result = await this.db.youTubeCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (result.count > 0) {
        log.info({ count: result.count }, 'Cleaned expired cache entries');
      }

      return result.count;
    } catch (error) {
      log.error({ error }, 'Failed to clean expired cache');
      return 0;
    }
  }

  /**
   * Generate deterministic cache key from params
   */
  private generateCacheKey(cacheType: CacheType, params: Record<string, any>): string {
    // Sort keys to ensure consistent hashing
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);

    const data = `${cacheType}:${JSON.stringify(sortedParams)}`;
    return createHash('sha256').update(data).digest('hex');
  }
}
