// Redis Cache Client (Upstash)
import { Redis } from '@upstash/redis';
import { ENV } from './config';
import { createLogger } from './logger';

const log = createLogger('cache');

// Initialize Redis client
let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!ENV.redisUrl || !ENV.redisToken) {
    log.warn('Redis credentials not configured, caching disabled');
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url: ENV.redisUrl,
      token: ENV.redisToken,
    });
    log.info('Redis client initialized');
  }

  return redis;
}

// Cache abstraction layer
export class CacheClient {
  private redis: Redis | null;

  constructor() {
    this.redis = getRedisClient();
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const value = await this.redis.get<T>(key);
      if (value) {
        log.debug({ key }, 'Cache hit');
      } else {
        log.debug({ key }, 'Cache miss');
      }
      return value;
    } catch (error) {
      log.error({ error, key }, 'Cache get error');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.redis) return;

    try {
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      } else {
        await this.redis.set(key, JSON.stringify(value));
      }
      log.debug({ key, ttl: ttlSeconds }, 'Cache set');
    } catch (error) {
      log.error({ error, key }, 'Cache set error');
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.del(key);
      log.debug({ key }, 'Cache invalidated');
    } catch (error) {
      log.error({ error, key }, 'Cache delete error');
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!this.redis) return;

    try {
      // Upstash Redis doesn't support SCAN, so we'll use a simple approach
      // In production, you might want to track keys in a set
      log.warn({ pattern }, 'Pattern deletion not fully supported, consider key tracking');
    } catch (error) {
      log.error({ error, pattern }, 'Cache pattern delete error');
    }
  }
}

// Singleton instance
export const cache = new CacheClient();
