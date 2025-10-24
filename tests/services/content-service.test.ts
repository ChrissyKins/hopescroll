// ContentService Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentService } from '@/services/content-service';
import type { PrismaClient } from '@prisma/client';
import type { ContentAdapter } from '@/adapters/content/base-adapter';
import { ContentItem, SourceType } from '@/domain/content/content-item';

// Mock Prisma
const mockPrisma = {
  contentSource: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  contentItem: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    updateMany: vi.fn(),
  },
} as unknown as PrismaClient;

// Mock ContentAdapter
const mockAdapter: ContentAdapter = {
  sourceType: 'YOUTUBE' as SourceType,
  validateSource: vi.fn(),
  fetchRecent: vi.fn(),
  fetchBacklog: vi.fn(),
  getSourceMetadata: vi.fn(),
};

// Helper function to create mock content items
function createMockContentItem(
  id: string,
  publishedDaysAgo: number = 0
): ContentItem {
  const publishedAt = new Date();
  publishedAt.setDate(publishedAt.getDate() - publishedDaysAgo);

  return {
    sourceType: 'YOUTUBE',
    sourceId: 'test-channel',
    originalId: id,
    title: `Video ${id}`,
    description: `Description for ${id}`,
    thumbnailUrl: `https://example.com/thumb-${id}.jpg`,
    url: `https://youtube.com/watch?v=${id}`,
    duration: 600,
    publishedAt,
  };
}

describe('ContentService', () => {
  let service: ContentService;
  let adapters: Map<SourceType, ContentAdapter>;

  beforeEach(() => {
    vi.clearAllMocks();
    adapters = new Map();
    adapters.set('YOUTUBE', mockAdapter);
    service = new ContentService(mockPrisma, adapters);
  });

  describe('fetchAllSources', () => {
    it('should fetch content from all non-muted sources', async () => {
      const mockSources = [
        { id: 'source1', type: 'YOUTUBE', sourceId: 'ch1', isMuted: false },
        { id: 'source2', type: 'YOUTUBE', sourceId: 'ch2', isMuted: false },
      ];

      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue(mockSources);

      // Mock fetchSource calls
      const mockFetchRecent = vi.mocked(mockAdapter.fetchRecent);
      mockFetchRecent.mockResolvedValue([createMockContentItem('vid1')]);

      const mockFetchBacklog = vi.mocked(mockAdapter.fetchBacklog);
      mockFetchBacklog.mockResolvedValue([]);

      mockPrisma.contentSource.findUnique = vi
        .fn()
        .mockImplementation((args: any) => {
          return Promise.resolve(
            mockSources.find((s) => s.id === args.where.id)
          );
        });

      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.contentItem.createMany = vi.fn().mockResolvedValue({ count: 1 });
      mockPrisma.contentSource.update = vi.fn().mockResolvedValue({});

      const result = await service.fetchAllSources();

      expect(mockPrisma.contentSource.findMany).toHaveBeenCalledWith({
        where: { isMuted: false },
      });

      expect(result).toMatchObject({
        totalSources: 2,
        successCount: 2,
        errorCount: 0,
      });
      expect(result.newItemsCount).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should return empty stats when no sources exist', async () => {
      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.fetchAllSources();

      expect(result).toEqual({
        totalSources: 0,
        successCount: 0,
        errorCount: 0,
        newItemsCount: 0,
        duration: expect.any(Number),
      });
    });

    it('should skip muted sources', async () => {
      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue([]);

      await service.fetchAllSources();

      expect(mockPrisma.contentSource.findMany).toHaveBeenCalledWith({
        where: { isMuted: false },
      });
    });

    it('should handle partial failures gracefully', async () => {
      const mockSources = [
        { id: 'source1', type: 'YOUTUBE', sourceId: 'ch1', isMuted: false },
        { id: 'source2', type: 'YOUTUBE', sourceId: 'ch2', isMuted: false },
      ];

      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue(mockSources);

      // First source succeeds
      mockPrisma.contentSource.findUnique = vi
        .fn()
        .mockResolvedValueOnce(mockSources[0])
        .mockResolvedValueOnce(null); // Second source fails (not found)

      mockPrisma.contentSource.update = vi.fn().mockResolvedValue({});
      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.contentItem.createMany = vi.fn().mockResolvedValue({ count: 1 });

      vi.mocked(mockAdapter.fetchRecent).mockResolvedValue([
        createMockContentItem('vid1'),
      ]);
      vi.mocked(mockAdapter.fetchBacklog).mockResolvedValue([]);

      const result = await service.fetchAllSources();

      // One succeeds, one fails
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
    });

    it('should count new items correctly', async () => {
      const mockSources = [
        { id: 'source1', type: 'YOUTUBE', sourceId: 'ch1', isMuted: false },
      ];

      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue(mockSources);
      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(mockSources[0]);
      mockPrisma.contentSource.update = vi.fn().mockResolvedValue({});

      // Return 3 new items
      vi.mocked(mockAdapter.fetchRecent).mockResolvedValue([
        createMockContentItem('vid1'),
        createMockContentItem('vid2'),
        createMockContentItem('vid3'),
      ]);
      vi.mocked(mockAdapter.fetchBacklog).mockResolvedValue([]);

      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.contentItem.createMany = vi.fn().mockResolvedValue({ count: 3 });

      const result = await service.fetchAllSources();

      expect(result.newItemsCount).toBe(3);
    });
  });

  describe('fetchSource', () => {
    it('should fetch and save content from a source', async () => {
      const mockSource = {
        id: 'source1',
        type: 'YOUTUBE',
        sourceId: 'ch1',
        displayName: 'Test Channel',
        lastFetchAt: null,
      };

      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(mockSource);

      const mockItems = [
        createMockContentItem('vid1'),
        createMockContentItem('vid2'),
      ];

      vi.mocked(mockAdapter.fetchRecent).mockResolvedValue(mockItems);
      vi.mocked(mockAdapter.fetchBacklog).mockResolvedValue([]);

      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.contentItem.createMany = vi.fn().mockResolvedValue({ count: 2 });
      mockPrisma.contentSource.update = vi.fn().mockResolvedValue({});

      const newItemsCount = await service.fetchSource('source1');

      expect(mockPrisma.contentSource.findUnique).toHaveBeenCalledWith({
        where: { id: 'source1' },
      });

      expect(mockAdapter.fetchRecent).toHaveBeenCalled();
      expect(newItemsCount).toBe(2);

      // Should update status to success
      expect(mockPrisma.contentSource.update).toHaveBeenCalledWith({
        where: { id: 'source1' },
        data: {
          lastFetchStatus: 'success',
          lastFetchAt: expect.any(Date),
          errorMessage: null,
        },
      });
    });

    it('should throw error if source does not exist', async () => {
      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(null);

      await expect(service.fetchSource('nonexistent')).rejects.toThrow(
        'Source not found: nonexistent'
      );
    });

    it('should throw error if adapter does not exist for source type', async () => {
      const mockSource = {
        id: 'source1',
        type: 'RSS', // No adapter registered for RSS
        sourceId: 'feed1',
        displayName: 'Test Feed',
      };

      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(mockSource);
      mockPrisma.contentSource.update = vi.fn().mockResolvedValue({});

      await expect(service.fetchSource('source1')).rejects.toThrow(
        'No adapter for source type: RSS'
      );

      // Should update status to error
      expect(mockPrisma.contentSource.update).toHaveBeenCalledWith({
        where: { id: 'source1' },
        data: {
          lastFetchStatus: 'error',
          errorMessage: 'No adapter for source type: RSS',
          lastFetchAt: expect.any(Date),
        },
      });
    });

    it('should fetch backlog for new sources', async () => {
      const mockSource = {
        id: 'source1',
        type: 'YOUTUBE',
        sourceId: 'ch1',
        displayName: 'Test Channel',
        lastFetchAt: null, // New source, never fetched
      };

      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(mockSource);

      const recentItems = [createMockContentItem('vid1')];
      const backlogItems = [
        createMockContentItem('vid2', 10),
        createMockContentItem('vid3', 20),
      ];

      vi.mocked(mockAdapter.fetchRecent).mockResolvedValue(recentItems);
      vi.mocked(mockAdapter.fetchBacklog).mockResolvedValue(backlogItems);

      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.contentItem.createMany = vi.fn().mockResolvedValue({ count: 3 });
      mockPrisma.contentSource.update = vi.fn().mockResolvedValue({});

      await service.fetchSource('source1');

      expect(mockAdapter.fetchBacklog).toHaveBeenCalled();
    });

    it('should not fetch backlog for recently fetched sources', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3); // 3 days ago

      const mockSource = {
        id: 'source1',
        type: 'YOUTUBE',
        sourceId: 'ch1',
        displayName: 'Test Channel',
        lastFetchAt: recentDate,
      };

      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(mockSource);

      vi.mocked(mockAdapter.fetchRecent).mockResolvedValue([
        createMockContentItem('vid1'),
      ]);
      vi.mocked(mockAdapter.fetchBacklog).mockResolvedValue([]);

      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.contentItem.createMany = vi.fn().mockResolvedValue({ count: 1 });
      mockPrisma.contentSource.update = vi.fn().mockResolvedValue({});

      await service.fetchSource('source1');

      // Should not fetch backlog since source was fetched recently
      expect(mockAdapter.fetchBacklog).not.toHaveBeenCalled();
    });

    it('should fetch backlog for sources not fetched in 7+ days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      const mockSource = {
        id: 'source1',
        type: 'YOUTUBE',
        sourceId: 'ch1',
        displayName: 'Test Channel',
        lastFetchAt: oldDate,
      };

      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(mockSource);

      vi.mocked(mockAdapter.fetchRecent).mockResolvedValue([]);
      vi.mocked(mockAdapter.fetchBacklog).mockResolvedValue([
        createMockContentItem('vid1'),
      ]);

      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.contentItem.createMany = vi.fn().mockResolvedValue({ count: 1 });
      mockPrisma.contentSource.update = vi.fn().mockResolvedValue({});

      await service.fetchSource('source1');

      expect(mockAdapter.fetchBacklog).toHaveBeenCalled();
    });

    it('should force backlog fetch when forceBacklog is true', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1); // 1 day ago

      const mockSource = {
        id: 'source1',
        type: 'YOUTUBE',
        sourceId: 'ch1',
        displayName: 'Test Channel',
        lastFetchAt: recentDate,
      };

      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(mockSource);

      vi.mocked(mockAdapter.fetchRecent).mockResolvedValue([]);
      vi.mocked(mockAdapter.fetchBacklog).mockResolvedValue([
        createMockContentItem('vid1'),
      ]);

      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.contentItem.createMany = vi.fn().mockResolvedValue({ count: 1 });
      mockPrisma.contentSource.update = vi.fn().mockResolvedValue({});

      await service.fetchSource('source1', true); // Force backlog

      expect(mockAdapter.fetchBacklog).toHaveBeenCalled();
    });

    it('should handle adapter errors and update source status', async () => {
      const mockSource = {
        id: 'source1',
        type: 'YOUTUBE',
        sourceId: 'ch1',
        displayName: 'Test Channel',
      };

      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(mockSource);
      mockPrisma.contentSource.update = vi.fn().mockResolvedValue({});

      const error = new Error('API quota exceeded');
      vi.mocked(mockAdapter.fetchRecent).mockRejectedValue(error);

      await expect(service.fetchSource('source1')).rejects.toThrow(
        'API quota exceeded'
      );

      expect(mockPrisma.contentSource.update).toHaveBeenCalledWith({
        where: { id: 'source1' },
        data: {
          lastFetchStatus: 'error',
          errorMessage: 'API quota exceeded',
          lastFetchAt: expect.any(Date),
        },
      });
    });

    it('should deduplicate existing content items', async () => {
      const mockSource = {
        id: 'source1',
        type: 'YOUTUBE',
        sourceId: 'ch1',
        displayName: 'Test Channel',
        lastFetchAt: null,
      };

      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(mockSource);

      const fetchedItems = [
        createMockContentItem('vid1'),
        createMockContentItem('vid2'),
        createMockContentItem('vid3'),
      ];

      vi.mocked(mockAdapter.fetchRecent).mockResolvedValue(fetchedItems);
      vi.mocked(mockAdapter.fetchBacklog).mockResolvedValue([]);

      // vid1 and vid2 already exist
      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([
        {
          id: 'existing1',
          sourceType: 'YOUTUBE',
          originalId: 'vid1',
        },
        {
          id: 'existing2',
          sourceType: 'YOUTUBE',
          originalId: 'vid2',
        },
      ]);

      mockPrisma.contentItem.createMany = vi.fn().mockResolvedValue({ count: 1 }); // Only vid3 is new
      mockPrisma.contentItem.updateMany = vi.fn().mockResolvedValue({ count: 2 }); // Update vid1, vid2
      mockPrisma.contentSource.update = vi.fn().mockResolvedValue({});

      const newItemsCount = await service.fetchSource('source1');

      expect(newItemsCount).toBe(1); // Only 1 new item (vid3)

      // Should update lastSeenInFeed for existing items
      expect(mockPrisma.contentItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['existing1', 'existing2'] } },
        data: { lastSeenInFeed: expect.any(Date) },
      });
    });
  });

  describe('fetchUserSources', () => {
    it('should fetch content for all user sources', async () => {
      const mockSources = [
        { id: 'source1', userId: 'user1', type: 'YOUTUBE', sourceId: 'ch1', isMuted: false },
        { id: 'source2', userId: 'user1', type: 'YOUTUBE', sourceId: 'ch2', isMuted: false },
      ];

      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue(mockSources);
      mockPrisma.contentSource.findUnique = vi
        .fn()
        .mockImplementation((args: any) => {
          return Promise.resolve(
            mockSources.find((s) => s.id === args.where.id)
          );
        });

      vi.mocked(mockAdapter.fetchRecent).mockResolvedValue([
        createMockContentItem('vid1'),
      ]);
      vi.mocked(mockAdapter.fetchBacklog).mockResolvedValue([]);

      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.contentItem.createMany = vi.fn().mockResolvedValue({ count: 1 });
      mockPrisma.contentSource.update = vi.fn().mockResolvedValue({});

      const result = await service.fetchUserSources('user1');

      expect(mockPrisma.contentSource.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          isMuted: false,
        },
      });

      expect(result).toMatchObject({
        totalSources: 2,
        successCount: 2,
        errorCount: 0,
      });
    });

    it('should skip muted sources for user', async () => {
      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue([]);

      await service.fetchUserSources('user1');

      expect(mockPrisma.contentSource.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          isMuted: false,
        },
      });
    });

    it('should force backlog fetch for user sources', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1); // 1 day ago

      const mockSource = {
        id: 'source1',
        userId: 'user1',
        type: 'YOUTUBE',
        sourceId: 'ch1',
        isMuted: false,
        lastFetchAt: recentDate, // Recently fetched
      };

      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue([mockSource]);
      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(mockSource);

      vi.mocked(mockAdapter.fetchRecent).mockResolvedValue([]);
      vi.mocked(mockAdapter.fetchBacklog).mockResolvedValue([
        createMockContentItem('vid1'),
      ]);

      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.contentItem.createMany = vi.fn().mockResolvedValue({ count: 1 });
      mockPrisma.contentSource.update = vi.fn().mockResolvedValue({});

      await service.fetchUserSources('user1');

      // Should force backlog even though recently fetched
      expect(mockAdapter.fetchBacklog).toHaveBeenCalled();
    });

    it('should return empty stats when user has no sources', async () => {
      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.fetchUserSources('user1');

      expect(result).toEqual({
        totalSources: 0,
        successCount: 0,
        errorCount: 0,
        newItemsCount: 0,
        duration: expect.any(Number),
      });
    });

    it('should handle partial failures for user sources', async () => {
      const mockSources = [
        { id: 'source1', userId: 'user1', type: 'YOUTUBE', sourceId: 'ch1', isMuted: false },
        { id: 'source2', userId: 'user1', type: 'YOUTUBE', sourceId: 'ch2', isMuted: false },
      ];

      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue(mockSources);

      // First succeeds, second fails
      mockPrisma.contentSource.findUnique = vi
        .fn()
        .mockResolvedValueOnce(mockSources[0])
        .mockResolvedValueOnce(null);

      vi.mocked(mockAdapter.fetchRecent).mockResolvedValue([
        createMockContentItem('vid1'),
      ]);
      vi.mocked(mockAdapter.fetchBacklog).mockResolvedValue([]);

      mockPrisma.contentItem.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.contentItem.createMany = vi.fn().mockResolvedValue({ count: 1 });
      mockPrisma.contentSource.update = vi.fn().mockResolvedValue({});

      const result = await service.fetchUserSources('user1');

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
    });
  });
});
