// FilterService Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterService } from '@/services/filter-service';
import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '@/lib/errors';

// Mock Prisma
const mockPrisma = {
  filterKeyword: {
    create: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  userPreferences: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
} as unknown as PrismaClient;

describe('FilterService', () => {
  let service: FilterService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FilterService(mockPrisma);
  });

  describe('addKeyword', () => {
    it('should create a new filter keyword', async () => {
      mockPrisma.filterKeyword.create = vi.fn().mockResolvedValue({
        id: 'filter123',
        keyword: 'politics',
        isWildcard: false,
      });

      const result = await service.addKeyword('user1', 'politics', false);

      expect(mockPrisma.filterKeyword.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          keyword: 'politics',
          isWildcard: false,
        },
      });
      expect(result.id).toBe('filter123');
    });

    it('should trim whitespace from keyword', async () => {
      mockPrisma.filterKeyword.create = vi.fn().mockResolvedValue({
        id: 'filter123',
        keyword: 'election',
        isWildcard: false,
      });

      await service.addKeyword('user1', '  election  ', false);

      expect(mockPrisma.filterKeyword.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          keyword: 'election',
          isWildcard: false,
        },
      });
    });

    it('should create wildcard filter when specified', async () => {
      mockPrisma.filterKeyword.create = vi.fn().mockResolvedValue({
        id: 'filter123',
        keyword: '*politic*',
        isWildcard: true,
      });

      await service.addKeyword('user1', '*politic*', true);

      expect(mockPrisma.filterKeyword.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          keyword: '*politic*',
          isWildcard: true,
        },
      });
    });

    it('should default to non-wildcard if not specified', async () => {
      mockPrisma.filterKeyword.create = vi.fn().mockResolvedValue({
        id: 'filter123',
        keyword: 'test',
        isWildcard: false,
      });

      await service.addKeyword('user1', 'test');

      expect(mockPrisma.filterKeyword.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isWildcard: false,
          }),
        })
      );
    });
  });

  describe('removeKeyword', () => {
    it('should remove existing filter keyword', async () => {
      mockPrisma.filterKeyword.findFirst = vi.fn().mockResolvedValue({
        id: 'filter123',
        userId: 'user1',
        keyword: 'politics',
      });

      await service.removeKeyword('user1', 'filter123');

      expect(mockPrisma.filterKeyword.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'filter123',
          userId: 'user1',
        },
      });
      expect(mockPrisma.filterKeyword.delete).toHaveBeenCalledWith({
        where: { id: 'filter123' },
      });
    });

    it('should throw NotFoundError if filter does not exist', async () => {
      mockPrisma.filterKeyword.findFirst = vi.fn().mockResolvedValue(null);

      await expect(service.removeKeyword('user1', 'nonexistent')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError if filter belongs to different user', async () => {
      mockPrisma.filterKeyword.findFirst = vi.fn().mockResolvedValue(null);

      await expect(service.removeKeyword('user1', 'filter123')).rejects.toThrow(
        NotFoundError
      );

      expect(mockPrisma.filterKeyword.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'filter123',
          userId: 'user1',
        },
      });
    });
  });

  describe('listKeywords', () => {
    it('should retrieve all keywords for user', async () => {
      const mockKeywords = [
        { id: 'f1', keyword: 'politics', isWildcard: false, createdAt: new Date() },
        { id: 'f2', keyword: '*trump*', isWildcard: true, createdAt: new Date() },
      ];

      mockPrisma.filterKeyword.findMany = vi.fn().mockResolvedValue(mockKeywords);

      const result = await service.listKeywords('user1');

      expect(mockPrisma.filterKeyword.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockKeywords);
    });

    it('should return empty array if no keywords', async () => {
      mockPrisma.filterKeyword.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.listKeywords('user1');

      expect(result).toEqual([]);
    });

    it('should order keywords by creation date descending', async () => {
      mockPrisma.filterKeyword.findMany = vi.fn().mockResolvedValue([]);

      await service.listKeywords('user1');

      expect(mockPrisma.filterKeyword.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('updateDurationFilter', () => {
    it('should create preferences if they do not exist', async () => {
      await service.updateDurationFilter('user1', 300, 1800);

      expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        update: {
          minDuration: 300,
          maxDuration: 1800,
        },
        create: {
          userId: 'user1',
          minDuration: 300,
          maxDuration: 1800,
        },
      });
    });

    it('should update existing preferences', async () => {
      await service.updateDurationFilter('user1', 600, 3600);

      expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        update: {
          minDuration: 600,
          maxDuration: 3600,
        },
        create: {
          userId: 'user1',
          minDuration: 600,
          maxDuration: 3600,
        },
      });
    });

    it('should allow null values for no limits', async () => {
      await service.updateDurationFilter('user1', null, null);

      expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        update: {
          minDuration: null,
          maxDuration: null,
        },
        create: {
          userId: 'user1',
          minDuration: null,
          maxDuration: null,
        },
      });
    });

    it('should allow setting only minimum duration', async () => {
      await service.updateDurationFilter('user1', 300, null);

      expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            minDuration: 300,
            maxDuration: null,
          },
        })
      );
    });

    it('should allow setting only maximum duration', async () => {
      await service.updateDurationFilter('user1', null, 1800);

      expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            minDuration: null,
            maxDuration: 1800,
          },
        })
      );
    });
  });

  describe('getFilterConfiguration', () => {
    it('should retrieve complete filter configuration', async () => {
      const mockKeywords = [
        {
          id: 'f1',
          keyword: 'politics',
          isWildcard: false,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'f2',
          keyword: '*election*',
          isWildcard: true,
          createdAt: new Date('2024-01-02'),
        },
      ];

      const mockPreferences = {
        userId: 'user1',
        minDuration: 300,
        maxDuration: 1800,
      };

      mockPrisma.filterKeyword.findMany = vi.fn().mockResolvedValue(mockKeywords);
      mockPrisma.userPreferences.findUnique = vi.fn().mockResolvedValue(mockPreferences);

      const result = await service.getFilterConfiguration('user1');

      expect(result).toEqual({
        userId: 'user1',
        keywords: mockKeywords,
        durationRange: {
          min: 300,
          max: 1800,
        },
        contentTypePreferences: [],
      });
    });

    it('should return null duration range if no preferences', async () => {
      mockPrisma.filterKeyword.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.userPreferences.findUnique = vi.fn().mockResolvedValue(null);

      const result = await service.getFilterConfiguration('user1');

      expect(result.durationRange).toBeNull();
    });

    it('should return empty keywords array if none exist', async () => {
      mockPrisma.filterKeyword.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.userPreferences.findUnique = vi.fn().mockResolvedValue(null);

      const result = await service.getFilterConfiguration('user1');

      expect(result.keywords).toEqual([]);
    });

    it('should load keywords and preferences in parallel', async () => {
      mockPrisma.filterKeyword.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.userPreferences.findUnique = vi.fn().mockResolvedValue(null);

      await service.getFilterConfiguration('user1');

      // Both should be called
      expect(mockPrisma.filterKeyword.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
      });
      expect(mockPrisma.userPreferences.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user1' },
      });
    });
  });
});
