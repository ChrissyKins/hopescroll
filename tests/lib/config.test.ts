// Configuration Tests
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CONFIG, ENV, validateEnv } from '@/lib/config';

describe('CONFIG', () => {
  describe('Feed Configuration', () => {
    it('should have default backlog ratio', () => {
      expect(CONFIG.feed.defaultBacklogRatio).toBe(0.3);
      expect(CONFIG.feed.defaultBacklogRatio).toBeGreaterThanOrEqual(0);
      expect(CONFIG.feed.defaultBacklogRatio).toBeLessThanOrEqual(1);
    });

    it('should have max consecutive from source limit', () => {
      expect(CONFIG.feed.maxConsecutiveFromSource).toBe(3);
      expect(CONFIG.feed.maxConsecutiveFromSource).toBeGreaterThan(0);
    });

    it('should have cache time in seconds', () => {
      expect(CONFIG.feed.cacheTimeSeconds).toBe(300);
      expect(CONFIG.feed.cacheTimeSeconds).toBeGreaterThan(0);
    });

    it('should have max items in feed limit', () => {
      expect(CONFIG.feed.maxItemsInFeed).toBe(200);
      expect(CONFIG.feed.maxItemsInFeed).toBeGreaterThan(0);
    });

    it('should have not-now return threshold', () => {
      expect(CONFIG.feed.notNowReturnAfterItems).toBe(50);
      expect(CONFIG.feed.notNowReturnAfterItems).toBeGreaterThan(0);
    });
  });

  describe('Content Configuration', () => {
    it('should have fetch interval in minutes', () => {
      expect(CONFIG.content.fetchIntervalMinutes).toBe(30);
      expect(CONFIG.content.fetchIntervalMinutes).toBeGreaterThan(0);
    });

    it('should have recent days window', () => {
      expect(CONFIG.content.fetchRecentDays).toBe(7);
      expect(CONFIG.content.fetchRecentDays).toBeGreaterThan(0);
    });

    it('should have backlog batch size', () => {
      expect(CONFIG.content.backlogBatchSize).toBe(50);
      expect(CONFIG.content.backlogBatchSize).toBeGreaterThan(0);
    });

    it('should have max backlog depth', () => {
      expect(CONFIG.content.maxBacklogDepth).toBe(500);
      expect(CONFIG.content.maxBacklogDepth).toBeGreaterThan(0);
    });

    it('should have deduplication window', () => {
      expect(CONFIG.content.deduplicationWindowDays).toBe(90);
      expect(CONFIG.content.deduplicationWindowDays).toBeGreaterThan(0);
    });
  });

  describe('Filtering Configuration', () => {
    it('should have default keyword mode', () => {
      expect(CONFIG.filtering.defaultKeywordMode).toBe('whole-word');
    });

    it('should have case sensitivity setting', () => {
      expect(CONFIG.filtering.caseSensitive).toBe(false);
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should have YouTube rate limits', () => {
      expect(CONFIG.rateLimit.youtube.requestsPerMinute).toBe(100);
      expect(CONFIG.rateLimit.youtube.dailyQuota).toBe(10000);
    });

    it('should have Twitch rate limits', () => {
      expect(CONFIG.rateLimit.twitch.requestsPerMinute).toBe(800);
    });
  });

  describe('UI Configuration', () => {
    it('should have default theme', () => {
      expect(CONFIG.ui.defaultTheme).toBe('dark');
    });

    it('should have default density', () => {
      expect(CONFIG.ui.defaultDensity).toBe('cozy');
    });

    it('should have content card image ratio', () => {
      expect(CONFIG.ui.contentCardImageRatio).toBe(16 / 9);
      expect(CONFIG.ui.contentCardImageRatio).toBeGreaterThan(0);
    });
  });
});

describe('ENV', () => {
  describe('Environment Variables', () => {
    it('should have database URL', () => {
      expect(typeof ENV.databaseUrl).toBe('string');
    });

    it('should have Redis configuration', () => {
      expect(typeof ENV.redisUrl).toBe('string');
      expect(typeof ENV.redisToken).toBe('string');
    });

    it('should have blob storage token', () => {
      expect(typeof ENV.blobToken).toBe('string');
    });

    it('should have API keys', () => {
      expect(typeof ENV.youtubeApiKey).toBe('string');
      expect(typeof ENV.twitchClientId).toBe('string');
      expect(typeof ENV.twitchClientSecret).toBe('string');
    });

    it('should have authentication config', () => {
      expect(typeof ENV.nextAuthSecret).toBe('string');
      expect(typeof ENV.nextAuthUrl).toBe('string');
    });

    it('should have cron secret', () => {
      expect(typeof ENV.cronSecret).toBe('string');
    });

    it('should have log level', () => {
      expect(ENV.logLevel).toBeDefined();
      expect(['debug', 'info', 'warn', 'error']).toContain(ENV.logLevel);
    });

    it('should have feature flags', () => {
      expect(typeof ENV.enableUsageTracking).toBe('boolean');
      expect(typeof ENV.enablePaletteCleanser).toBe('boolean');
    });

    it('should have node environment flags', () => {
      expect(typeof ENV.nodeEnv).toBe('string');
      expect(typeof ENV.isDevelopment).toBe('boolean');
      expect(typeof ENV.isProduction).toBe('boolean');
    });
  });
});

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  it('should pass when all required vars are present', () => {
    process.env.POSTGRES_PRISMA_URL = 'postgresql://test';
    process.env.NEXTAUTH_SECRET = 'test-secret';

    expect(() => validateEnv()).not.toThrow();
  });

  it('should throw when POSTGRES_PRISMA_URL is missing', () => {
    delete process.env.POSTGRES_PRISMA_URL;
    process.env.NEXTAUTH_SECRET = 'test-secret';

    expect(() => validateEnv()).toThrow('Missing required environment variables');
    expect(() => validateEnv()).toThrow('POSTGRES_PRISMA_URL');
  });

  it('should throw when NEXTAUTH_SECRET is missing', () => {
    process.env.POSTGRES_PRISMA_URL = 'postgresql://test';
    delete process.env.NEXTAUTH_SECRET;

    expect(() => validateEnv()).toThrow('Missing required environment variables');
    expect(() => validateEnv()).toThrow('NEXTAUTH_SECRET');
  });

  it('should throw when multiple required vars are missing', () => {
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.NEXTAUTH_SECRET;

    expect(() => validateEnv()).toThrow('Missing required environment variables');
    expect(() => validateEnv()).toThrow('POSTGRES_PRISMA_URL');
    expect(() => validateEnv()).toThrow('NEXTAUTH_SECRET');
  });
});
