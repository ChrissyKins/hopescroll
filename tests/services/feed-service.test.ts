// FeedService Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedService } from '@/services/feed-service';
import type { PrismaClient } from '@prisma/client';
import type { CacheClient } from '@/lib/cache';

// Mock Prisma and Cache
const mockPrisma = {
  contentSource: {
    findMany: vi.fn(),
  },
  contentItem: {
    findMany: vi.fn(),
  },
  filterKeyword: {
    findMany: vi.fn(),
  },
  userPreferences: {
    findUnique: vi.fn(),
  },
  contentInteraction: {
    findMany: vi.fn(),
  },
} as unknown as PrismaClient;

const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
} as unknown as CacheClient;

describe('FeedService', () => {
  let service: FeedService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FeedService(mockPrisma, mockCache);
  });

  describe('getUserFeed', () => {
    it('should return cached feed if available', async () => {
      const cachedFeed = [{ content: { id: '1', title: 'Test' } }];
      mockCache.get = vi.fn().mockResolvedValue(cachedFeed);

      const result = await service.getUserFeed('user1');

      expect(result).toEqual(cachedFeed);
      expect(mockPrisma.contentSource.findMany).not.toHaveBeenCalled();
    });

    it('should return empty feed if no sources configured', async () => {
      mockCache.get = vi.fn().mockResolvedValue(null);
      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.filterKeyword.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.userPreferences.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.contentInteraction.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.getUserFeed('user1');

      expect(result).toEqual([]);
    });

    it('should return empty feed if no content available', async () => {
      mockCache.get = vi.fn().mockResolvedValue(null);
      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue([
        { id: 's1', sourceId: 'ch1', type: 'YOUTUBE' },
      ]);
      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.filterKeyword.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.userPreferences.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.contentInteraction.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.getUserFeed('user1');

      expect(result).toEqual([]);
    });

    it('should generate feed with content and filters', async () => {
      mockCache.get = vi.fn().mockResolvedValue(null);
      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue([
        {
          id: 's1',
          userId: 'user1',
          type: 'YOUTUBE',
          sourceId: 'ch1',
          displayName: 'Test Channel',
          isMuted: false,
        },
      ]);
      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([
        {
          id: 'c1',
          sourceType: 'YOUTUBE',
          sourceId: 'ch1',
          title: 'Good Video',
          description: 'Nice content',
          duration: 600,
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
          url: 'https://youtube.com/watch?v=123',
        },
        {
          id: 'c2',
          sourceType: 'YOUTUBE',
          sourceId: 'ch1',
          title: 'Politics Election',
          description: 'Bad content',
          duration: 600,
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
          url: 'https://youtube.com/watch?v=456',
        },
      ]);
      mockPrisma.filterKeyword.findMany = vi.fn().mockResolvedValue([
        { id: 'f1', keyword: 'politics', isWildcard: false },
      ]);
      mockPrisma.userPreferences.findUnique = vi.fn().mockResolvedValue({
        minDuration: null,
        maxDuration: null,
        backlogRatio: 0.3,
        diversityLimit: 3,
      });
      mockPrisma.contentInteraction.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.getUserFeed('user1');

      // Should filter out "Politics Election" video
      expect(result.length).toBeLessThan(2);
      expect(result.some((item: any) => item.content.title.includes('Politics'))).toBe(
        false
      );
    });

    it('should cache generated feed', async () => {
      mockCache.get = vi.fn().mockResolvedValue(null);
      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue([
        { id: 's1', sourceId: 'ch1', type: 'YOUTUBE', isMuted: false },
      ]);
      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([
        {
          id: 'c1',
          sourceType: 'YOUTUBE',
          sourceId: 'ch1',
          title: 'Test',
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      ]);
      mockPrisma.filterKeyword.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.userPreferences.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.contentInteraction.findMany = vi.fn().mockResolvedValue([]);

      await service.getUserFeed('user1');

      expect(mockCache.set).toHaveBeenCalledWith(
        'feed:user1',
        expect.any(Array),
        expect.any(Number)
      );
    });

    it('should exclude muted sources', async () => {
      mockCache.get = vi.fn().mockResolvedValue(null);
      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue([
        { id: 's1', sourceId: 'ch1', type: 'YOUTUBE', isMuted: false },
      ]);

      await service.getUserFeed('user1');

      expect(mockPrisma.contentSource.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1', isMuted: false },
      });
    });
  });

  describe('refreshFeed', () => {
    it('should delete cached feed', async () => {
      await service.refreshFeed('user1');

      expect(mockCache.delete).toHaveBeenCalledWith('feed:user1');
    });
  });
});
