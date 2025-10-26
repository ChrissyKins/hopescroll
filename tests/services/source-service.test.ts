// SourceService Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SourceService } from '@/services/source-service';
import type { PrismaClient } from '@prisma/client';
import type { ContentAdapter } from '@/adapters/content/base-adapter';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { SourceType } from '@/domain/content/content-item';

// Mock Prisma
const mockPrisma = {
  contentSource: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  contentItem: {
    count: vi.fn().mockResolvedValue(0),
    deleteMany: vi.fn(),
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

describe('SourceService', () => {
  let service: SourceService;
  let adapters: Map<SourceType, ContentAdapter>;

  beforeEach(() => {
    vi.clearAllMocks();
    adapters = new Map();
    adapters.set('YOUTUBE', mockAdapter);
    service = new SourceService(mockPrisma, adapters);
  });

  describe('addSource', () => {
    it('should add a valid source', async () => {
      vi.mocked(mockAdapter.validateSource).mockResolvedValue({
        isValid: true,
        displayName: 'Test Channel',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.contentSource.create = vi.fn().mockResolvedValue({
        id: 'source123',
        displayName: 'Test Channel',
      });

      const result = await service.addSource('user1', 'YOUTUBE', 'channel123');

      expect(mockAdapter.validateSource).toHaveBeenCalledWith('channel123');
      expect(mockPrisma.contentSource.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          type: 'YOUTUBE',
          sourceId: 'channel123',
          displayName: 'Test Channel',
          avatarUrl: 'https://example.com/avatar.jpg',
          isMuted: false,
          alwaysSafe: false,
          lastFetchStatus: 'pending',
        },
      });
      expect(result).toEqual({
        id: 'source123',
        displayName: 'Test Channel',
      });
    });

    it('should throw ValidationError for unsupported source type', async () => {
      await expect(
        service.addSource('user1', 'UNSUPPORTED' as SourceType, 'test123')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if source validation fails', async () => {
      vi.mocked(mockAdapter.validateSource).mockResolvedValue({
        isValid: false,
        errorMessage: 'Channel not found',
      });

      await expect(service.addSource('user1', 'YOUTUBE', 'invalid123')).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError if source already exists for user', async () => {
      vi.mocked(mockAdapter.validateSource).mockResolvedValue({
        isValid: true,
        displayName: 'Test Channel',
      });

      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue({
        id: 'existing123',
        userId: 'user1',
        type: 'YOUTUBE',
        sourceId: 'channel123',
      });

      await expect(service.addSource('user1', 'YOUTUBE', 'channel123')).rejects.toThrow(
        ValidationError
      );
    });

    it('should use sourceId as displayName if not provided by adapter', async () => {
      vi.mocked(mockAdapter.validateSource).mockResolvedValue({
        isValid: true,
      });

      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.contentSource.create = vi.fn().mockResolvedValue({
        id: 'source123',
        displayName: 'channel123',
      });

      await service.addSource('user1', 'YOUTUBE', 'channel123');

      expect(mockPrisma.contentSource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayName: 'channel123',
          }),
        })
      );
    });
  });

  describe('removeSource', () => {
    it('should remove existing source', async () => {
      mockPrisma.contentSource.findFirst = vi.fn().mockResolvedValue({
        id: 'source123',
        userId: 'user1',
      });

      await service.removeSource('user1', 'source123');

      expect(mockPrisma.contentSource.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'source123',
          userId: 'user1',
        },
      });
      expect(mockPrisma.contentSource.delete).toHaveBeenCalledWith({
        where: { id: 'source123' },
      });
    });

    it('should throw NotFoundError if source does not exist', async () => {
      mockPrisma.contentSource.findFirst = vi.fn().mockResolvedValue(null);

      await expect(service.removeSource('user1', 'nonexistent')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError if source belongs to different user', async () => {
      mockPrisma.contentSource.findFirst = vi.fn().mockResolvedValue(null);

      await expect(service.removeSource('user1', 'source123')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateSource', () => {
    it('should update source with new values', async () => {
      mockPrisma.contentSource.findFirst = vi.fn().mockResolvedValue({
        id: 'source123',
        userId: 'user1',
      });

      await service.updateSource('user1', 'source123', {
        isMuted: true,
        alwaysSafe: false,
      });

      expect(mockPrisma.contentSource.update).toHaveBeenCalledWith({
        where: { id: 'source123' },
        data: {
          isMuted: true,
          alwaysSafe: false,
        },
      });
    });

    it('should allow updating only isMuted', async () => {
      mockPrisma.contentSource.findFirst = vi.fn().mockResolvedValue({
        id: 'source123',
        userId: 'user1',
      });

      await service.updateSource('user1', 'source123', { isMuted: true });

      expect(mockPrisma.contentSource.update).toHaveBeenCalledWith({
        where: { id: 'source123' },
        data: { isMuted: true },
      });
    });

    it('should allow updating only alwaysSafe', async () => {
      mockPrisma.contentSource.findFirst = vi.fn().mockResolvedValue({
        id: 'source123',
        userId: 'user1',
      });

      await service.updateSource('user1', 'source123', { alwaysSafe: true });

      expect(mockPrisma.contentSource.update).toHaveBeenCalledWith({
        where: { id: 'source123' },
        data: { alwaysSafe: true },
      });
    });

    it('should throw NotFoundError if source does not exist', async () => {
      mockPrisma.contentSource.findFirst = vi.fn().mockResolvedValue(null);

      await expect(
        service.updateSource('user1', 'nonexistent', { isMuted: true })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if source belongs to different user', async () => {
      mockPrisma.contentSource.findFirst = vi.fn().mockResolvedValue(null);

      await expect(
        service.updateSource('user1', 'source123', { isMuted: true })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listSources', () => {
    it('should retrieve all sources for user', async () => {
      const mockSources = [
        {
          id: 's1',
          userId: 'user1',
          type: 'YOUTUBE',
          sourceId: 'ch1',
          displayName: 'Channel 1',
          addedAt: new Date('2024-01-01'),
        },
        {
          id: 's2',
          userId: 'user1',
          type: 'YOUTUBE',
          sourceId: 'ch2',
          displayName: 'Channel 2',
          addedAt: new Date('2024-01-02'),
        },
      ];

      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue(mockSources);
      mockPrisma.contentItem.count = vi.fn().mockResolvedValue(0); // No videos yet

      const result = await service.listSources('user1');

      expect(mockPrisma.contentSource.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        orderBy: { addedAt: 'desc' },
      });
      // Service now adds videoStats, createdAt, and contentCount to each source
      expect(result).toEqual([
        {
          ...mockSources[0],
          createdAt: mockSources[0].addedAt,
          contentCount: 0,
          videoStats: { totalFetched: 0, unwatched: 0 }
        },
        {
          ...mockSources[1],
          createdAt: mockSources[1].addedAt,
          contentCount: 0,
          videoStats: { totalFetched: 0, unwatched: 0 }
        },
      ]);
    });

    it('should return empty array if no sources', async () => {
      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.listSources('user1');

      expect(result).toEqual([]);
    });

    it('should order sources by added date descending', async () => {
      mockPrisma.contentSource.findMany = vi.fn().mockResolvedValue([]);

      await service.listSources('user1');

      expect(mockPrisma.contentSource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { addedAt: 'desc' },
        })
      );
    });
  });

  describe('getSource', () => {
    it('should retrieve specific source', async () => {
      const mockSource = {
        id: 'source123',
        userId: 'user1',
        type: 'YOUTUBE',
        sourceId: 'ch1',
        displayName: 'Channel 1',
      };

      mockPrisma.contentSource.findFirst = vi.fn().mockResolvedValue(mockSource);

      const result = await service.getSource('user1', 'source123');

      expect(mockPrisma.contentSource.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'source123',
          userId: 'user1',
        },
      });
      expect(result).toEqual(mockSource);
    });

    it('should throw NotFoundError if source does not exist', async () => {
      mockPrisma.contentSource.findFirst = vi.fn().mockResolvedValue(null);

      await expect(service.getSource('user1', 'nonexistent')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError if source belongs to different user', async () => {
      mockPrisma.contentSource.findFirst = vi.fn().mockResolvedValue(null);

      await expect(service.getSource('user1', 'source123')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('adapter integration', () => {
    it('should use correct adapter for YouTube', async () => {
      const youtubeAdapter: ContentAdapter = {
        sourceType: 'YOUTUBE' as SourceType,
        validateSource: vi.fn().mockResolvedValue({
          isValid: true,
          displayName: 'YT Channel',
        }),
        fetchRecent: vi.fn(),
        fetchBacklog: vi.fn(),
        getSourceMetadata: vi.fn(),
      };

      const adapters = new Map();
      adapters.set('YOUTUBE', youtubeAdapter);
      const service = new SourceService(mockPrisma, adapters);

      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.contentSource.create = vi.fn().mockResolvedValue({
        id: 'source123',
        displayName: 'YT Channel',
      });

      await service.addSource('user1', 'YOUTUBE', 'channel123');

      expect(youtubeAdapter.validateSource).toHaveBeenCalledWith('channel123');
    });

    it('should use correct adapter for Twitch', async () => {
      const twitchAdapter: ContentAdapter = {
        sourceType: 'TWITCH' as SourceType,
        validateSource: vi.fn().mockResolvedValue({
          isValid: true,
          displayName: 'Twitch Stream',
        }),
        fetchRecent: vi.fn(),
        fetchBacklog: vi.fn(),
        getSourceMetadata: vi.fn(),
      };

      const adapters = new Map();
      adapters.set('TWITCH', twitchAdapter);
      const service = new SourceService(mockPrisma, adapters);

      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.contentSource.create = vi.fn().mockResolvedValue({
        id: 'source123',
        displayName: 'Twitch Stream',
      });

      await service.addSource('user1', 'TWITCH', 'streamer123');

      expect(twitchAdapter.validateSource).toHaveBeenCalledWith('streamer123');
    });

    it('should handle multiple adapter types', async () => {
      const youtubeAdapter = {
        sourceType: 'YOUTUBE',
        validateSource: vi.fn().mockResolvedValue({ isValid: true, displayName: 'YT' }),
        fetchRecent: vi.fn(),
        fetchBacklog: vi.fn(),
        getSourceMetadata: vi.fn(),
      } as unknown as ContentAdapter;

      const twitchAdapter = {
        sourceType: 'TWITCH',
        validateSource: vi.fn().mockResolvedValue({ isValid: true, displayName: 'TW' }),
        fetchRecent: vi.fn(),
        fetchBacklog: vi.fn(),
        getSourceMetadata: vi.fn(),
      } as unknown as ContentAdapter;

      const adapters = new Map();
      adapters.set('YOUTUBE', youtubeAdapter);
      adapters.set('TWITCH', twitchAdapter);

      const service = new SourceService(mockPrisma, adapters);

      mockPrisma.contentSource.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.contentSource.create = vi.fn().mockResolvedValue({
        id: 'source123',
        displayName: 'test',
      });

      // Add YouTube source
      await service.addSource('user1', 'YOUTUBE', 'yt123');
      expect(youtubeAdapter.validateSource).toHaveBeenCalled();

      // Add Twitch source
      await service.addSource('user1', 'TWITCH', 'tw123');
      expect(twitchAdapter.validateSource).toHaveBeenCalled();
    });
  });
});
