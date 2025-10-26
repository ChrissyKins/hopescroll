// InteractionService Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InteractionService } from '@/services/interaction-service';
import type { PrismaClient } from '@prisma/client';
import type { CacheClient } from '@/lib/cache';

// Mock Prisma and Cache
const mockPrisma = {
  contentInteraction: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  savedContent: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  contentItem: {
    findUnique: vi.fn(),
  },
  filterKeyword: {
    create: vi.fn(),
  },
} as unknown as PrismaClient;

const mockCache = {
  delete: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
} as unknown as CacheClient;

describe('InteractionService', () => {
  let service: InteractionService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: content exists
    mockPrisma.contentItem.findUnique = vi.fn().mockResolvedValue({ id: 'content1' });

    // Default mock: no existing interaction
    mockPrisma.contentInteraction.findFirst = vi.fn().mockResolvedValue(null);

    service = new InteractionService(mockPrisma, mockCache);
  });

  describe('recordWatch', () => {
    it('should create a WATCHED interaction', async () => {
      await service.recordWatch('user1', 'content1', 300, 0.75);

      expect(mockPrisma.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          contentId: 'content1',
          type: 'WATCHED',
          watchDuration: 300,
          completionRate: 0.75,
        },
      });
    });

    it('should invalidate user cache after recording watch', async () => {
      await service.recordWatch('user1', 'content1');

      expect(mockCache.delete).toHaveBeenCalledWith('feed:user1');
      expect(mockCache.delete).toHaveBeenCalledWith('saved:user1');
      expect(mockCache.delete).toHaveBeenCalledWith('history:user1');
    });

    it('should work without optional parameters', async () => {
      await service.recordWatch('user1', 'content1');

      expect(mockPrisma.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          contentId: 'content1',
          type: 'WATCHED',
          watchDuration: undefined,
          completionRate: undefined,
        },
      });
    });
  });

  describe('saveContent', () => {
    it('should create new saved content if not exists', async () => {
      mockPrisma.savedContent.findUnique = vi.fn().mockResolvedValue(null);

      await service.saveContent('user1', 'content1', 'collection-id-123', 'Good stuff');

      expect(mockPrisma.savedContent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          contentId: 'content1',
          collectionId: 'collection-id-123',
          notes: 'Good stuff',
        },
      });
    });

    it('should update saved content if already exists', async () => {
      mockPrisma.savedContent.findUnique = vi.fn().mockResolvedValue({
        id: 'saved1',
        userId: 'user1',
        contentId: 'content1',
      });

      await service.saveContent('user1', 'content1', 'new-collection-id');

      expect(mockPrisma.savedContent.update).toHaveBeenCalledWith({
        where: { id: 'saved1' },
        data: { collectionId: 'new-collection-id', notes: undefined },
      });
    });

    it('should create SAVED interaction', async () => {
      mockPrisma.savedContent.findUnique = vi.fn().mockResolvedValue(null);

      await service.saveContent('user1', 'content1', 'collection-id-watch-later');

      expect(mockPrisma.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          contentId: 'content1',
          type: 'SAVED',
          collection: 'collection-id-watch-later',
        },
      });
    });

    it('should invalidate cache after saving', async () => {
      mockPrisma.savedContent.findUnique = vi.fn().mockResolvedValue(null);

      await service.saveContent('user1', 'content1');

      expect(mockCache.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe('dismissContent', () => {
    it('should create DISMISSED interaction', async () => {
      await service.dismissContent('user1', 'content1', 'Not interested');

      expect(mockPrisma.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          contentId: 'content1',
          type: 'DISMISSED',
          dismissReason: 'Not interested',
        },
      });
    });

    it('should work without reason', async () => {
      await service.dismissContent('user1', 'content1');

      expect(mockPrisma.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          contentId: 'content1',
          type: 'DISMISSED',
          dismissReason: undefined,
        },
      });
    });

    it('should invalidate cache', async () => {
      await service.dismissContent('user1', 'content1');
      expect(mockCache.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe('notNowContent', () => {
    it('should create NOT_NOW interaction', async () => {
      await service.notNowContent('user1', 'content1');

      expect(mockPrisma.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          contentId: 'content1',
          type: 'NOT_NOW',
        },
      });
    });

    it('should invalidate cache', async () => {
      await service.notNowContent('user1', 'content1');
      expect(mockCache.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe('blockContent', () => {
    it('should create BLOCKED interaction', async () => {
      await service.blockContent('user1', 'content1', false);

      expect(mockPrisma.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          contentId: 'content1',
          type: 'BLOCKED',
        },
      });
    });

    it('should extract keywords when requested', async () => {
      mockPrisma.contentItem.findUnique = vi.fn().mockResolvedValue({
        id: 'content1',
        title: 'Politics Election News Trump Biden',
      });

      const keywords = await service.blockContent('user1', 'content1', true);

      expect(keywords.length).toBeGreaterThan(0);
      expect(mockPrisma.filterKeyword.create).toHaveBeenCalled();
    });

    it('should not extract keywords when not requested', async () => {
      await service.blockContent('user1', 'content1', false);

      // Content validation is still called once, but keyword extraction is not
      expect(mockPrisma.contentItem.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.contentItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'content1' },
        select: { id: true },
      });
      expect(mockPrisma.filterKeyword.create).not.toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('should retrieve all history when no type specified', async () => {
      const mockHistory = [
        { id: '1', type: 'WATCHED', timestamp: new Date() },
        { id: '2', type: 'SAVED', timestamp: new Date() },
      ];
      mockPrisma.contentInteraction.findMany = vi.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory('user1');

      expect(mockPrisma.contentInteraction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        include: { content: true },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });
      expect(result).toEqual(mockHistory);
    });

    it('should filter by type when specified', async () => {
      await service.getHistory('user1', 'WATCHED');

      expect(mockPrisma.contentInteraction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1', type: 'WATCHED' },
        include: { content: true },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });
    });

    it('should respect limit parameter', async () => {
      await service.getHistory('user1', undefined, 10);

      expect(mockPrisma.contentInteraction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });
  });

  describe('getSavedContent', () => {
    it('should retrieve all saved content', async () => {
      const mockSaved = [
        { id: '1', contentId: 'c1', collectionId: null },
        { id: '2', contentId: 'c2', collectionId: 'collection-123' },
      ];
      mockPrisma.savedContent.findMany = vi.fn().mockResolvedValue(mockSaved);

      const result = await service.getSavedContent('user1');

      expect(mockPrisma.savedContent.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        include: { content: true, collection: true },
        orderBy: { savedAt: 'desc' },
      });
      expect(result).toEqual(mockSaved);
    });

    it('should filter by collection when specified', async () => {
      await service.getSavedContent('user1', 'collection-watch-later');

      expect(mockPrisma.savedContent.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1', collectionId: 'collection-watch-later' },
        include: { content: true, collection: true },
        orderBy: { savedAt: 'desc' },
      });
    });
  });

  describe('unsaveContent', () => {
    it('should delete saved content', async () => {
      await service.unsaveContent('user1', 'content1');

      expect(mockPrisma.savedContent.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user1', contentId: 'content1' },
      });
    });

    it('should invalidate cache', async () => {
      await service.unsaveContent('user1', 'content1');
      expect(mockCache.delete).toHaveBeenCalledTimes(3);
    });
  });
});
