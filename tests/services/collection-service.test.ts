// CollectionService Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CollectionService } from '@/services/collection-service';
import type { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  collection: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  savedContent: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
} as unknown as PrismaClient;

describe('CollectionService', () => {
  let service: CollectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CollectionService(mockPrisma);
  });

  describe('getUserCollections', () => {
    it('should retrieve all collections for user with item counts', async () => {
      const mockCollections = [
        {
          id: 'col1',
          userId: 'user1',
          name: 'Watch Later',
          description: 'Videos to watch',
          color: '#ff0000',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          _count: { savedItems: 5 },
        },
        {
          id: 'col2',
          userId: 'user1',
          name: 'Favorites',
          description: null,
          color: '#00ff00',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          _count: { savedItems: 3 },
        },
      ];

      mockPrisma.collection.findMany = vi.fn().mockResolvedValue(mockCollections);

      const result = await service.getUserCollections('user1');

      expect(mockPrisma.collection.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        include: {
          _count: {
            select: { savedItems: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toEqual([
        {
          id: 'col1',
          userId: 'user1',
          name: 'Watch Later',
          description: 'Videos to watch',
          color: '#ff0000',
          createdAt: mockCollections[0].createdAt,
          updatedAt: mockCollections[0].updatedAt,
          itemCount: 5,
        },
        {
          id: 'col2',
          userId: 'user1',
          name: 'Favorites',
          description: null,
          color: '#00ff00',
          createdAt: mockCollections[1].createdAt,
          updatedAt: mockCollections[1].updatedAt,
          itemCount: 3,
        },
      ]);
    });

    it('should return empty array if no collections exist', async () => {
      mockPrisma.collection.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.getUserCollections('user1');

      expect(result).toEqual([]);
    });

    it('should order collections by created date descending', async () => {
      mockPrisma.collection.findMany = vi.fn().mockResolvedValue([]);

      await service.getUserCollections('user1');

      expect(mockPrisma.collection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('getCollection', () => {
    it('should retrieve specific collection with item count', async () => {
      const mockCollection = {
        id: 'col1',
        userId: 'user1',
        name: 'Watch Later',
        description: 'Videos to watch',
        color: '#ff0000',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        _count: { savedItems: 5 },
      };

      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(mockCollection);

      const result = await service.getCollection('user1', 'col1');

      expect(mockPrisma.collection.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'col1',
          userId: 'user1',
        },
        include: {
          _count: {
            select: { savedItems: true },
          },
        },
      });

      expect(result).toEqual({
        id: 'col1',
        userId: 'user1',
        name: 'Watch Later',
        description: 'Videos to watch',
        color: '#ff0000',
        createdAt: mockCollection.createdAt,
        updatedAt: mockCollection.updatedAt,
        itemCount: 5,
      });
    });

    it('should throw error if collection does not exist', async () => {
      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(null);

      await expect(service.getCollection('user1', 'nonexistent')).rejects.toThrow(
        'Collection not found'
      );
    });

    it('should throw error if collection belongs to different user', async () => {
      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(null);

      await expect(service.getCollection('user1', 'col1')).rejects.toThrow(
        'Collection not found'
      );
    });
  });

  describe('createCollection', () => {
    it('should create a new collection with all fields', async () => {
      const mockCreated = {
        id: 'col1',
        userId: 'user1',
        name: 'Watch Later',
        description: 'Videos to watch',
        color: '#ff0000',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        _count: { savedItems: 0 },
      };

      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(null);
      mockPrisma.collection.create = vi.fn().mockResolvedValue(mockCreated);

      const result = await service.createCollection('user1', {
        name: 'Watch Later',
        description: 'Videos to watch',
        color: '#ff0000',
      });

      expect(mockPrisma.collection.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          name: 'Watch Later',
        },
      });

      expect(mockPrisma.collection.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          name: 'Watch Later',
          description: 'Videos to watch',
          color: '#ff0000',
        },
        include: {
          _count: {
            select: { savedItems: true },
          },
        },
      });

      expect(result).toEqual({
        id: 'col1',
        userId: 'user1',
        name: 'Watch Later',
        description: 'Videos to watch',
        color: '#ff0000',
        createdAt: mockCreated.createdAt,
        updatedAt: mockCreated.updatedAt,
        itemCount: 0,
      });
    });

    it('should create collection with minimal fields', async () => {
      const mockCreated = {
        id: 'col1',
        userId: 'user1',
        name: 'Simple Collection',
        description: null,
        color: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        _count: { savedItems: 0 },
      };

      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(null);
      mockPrisma.collection.create = vi.fn().mockResolvedValue(mockCreated);

      const result = await service.createCollection('user1', {
        name: 'Simple Collection',
      });

      expect(mockPrisma.collection.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          name: 'Simple Collection',
          description: undefined,
          color: undefined,
        },
        include: {
          _count: {
            select: { savedItems: true },
          },
        },
      });

      expect(result.itemCount).toBe(0);
    });

    it('should throw error if collection name already exists for user', async () => {
      const existingCollection = {
        id: 'existing',
        userId: 'user1',
        name: 'Watch Later',
      };

      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(existingCollection);

      await expect(
        service.createCollection('user1', {
          name: 'Watch Later',
        })
      ).rejects.toThrow('A collection with this name already exists');

      expect(mockPrisma.collection.create).not.toHaveBeenCalled();
    });

    it('should allow same collection name for different users', async () => {
      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(null);
      mockPrisma.collection.create = vi.fn().mockResolvedValue({
        id: 'col1',
        userId: 'user2',
        name: 'Watch Later',
        description: null,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { savedItems: 0 },
      });

      await service.createCollection('user2', {
        name: 'Watch Later',
      });

      expect(mockPrisma.collection.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user2',
          name: 'Watch Later',
        },
      });
    });
  });

  describe('updateCollection', () => {
    it('should update collection with new values', async () => {
      const existingCollection = {
        id: 'col1',
        userId: 'user1',
        name: 'Old Name',
        description: 'Old description',
        color: '#ff0000',
      };

      const updatedCollection = {
        id: 'col1',
        userId: 'user1',
        name: 'New Name',
        description: 'New description',
        color: '#00ff00',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        _count: { savedItems: 5 },
      };

      // First call: find the existing collection
      // Second call: check for duplicate name (should return null - no duplicate)
      mockPrisma.collection.findFirst = vi
        .fn()
        .mockResolvedValueOnce(existingCollection)
        .mockResolvedValueOnce(null);
      mockPrisma.collection.update = vi.fn().mockResolvedValue(updatedCollection);

      const result = await service.updateCollection('user1', 'col1', {
        name: 'New Name',
        description: 'New description',
        color: '#00ff00',
      });

      expect(mockPrisma.collection.update).toHaveBeenCalledWith({
        where: { id: 'col1' },
        data: {
          name: 'New Name',
          description: 'New description',
          color: '#00ff00',
        },
        include: {
          _count: {
            select: { savedItems: true },
          },
        },
      });

      expect(result.name).toBe('New Name');
      expect(result.itemCount).toBe(5);
    });

    it('should allow partial updates', async () => {
      const existingCollection = {
        id: 'col1',
        userId: 'user1',
        name: 'Watch Later',
      };

      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(existingCollection);
      mockPrisma.collection.update = vi.fn().mockResolvedValue({
        id: 'col1',
        userId: 'user1',
        name: 'Watch Later',
        description: 'Updated description',
        color: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { savedItems: 0 },
      });

      await service.updateCollection('user1', 'col1', {
        description: 'Updated description',
      });

      expect(mockPrisma.collection.update).toHaveBeenCalledWith({
        where: { id: 'col1' },
        data: {
          description: 'Updated description',
        },
        include: {
          _count: {
            select: { savedItems: true },
          },
        },
      });
    });

    it('should throw error if collection does not exist', async () => {
      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(null);

      await expect(
        service.updateCollection('user1', 'nonexistent', { name: 'New Name' })
      ).rejects.toThrow('Collection not found');

      expect(mockPrisma.collection.update).not.toHaveBeenCalled();
    });

    it('should throw error if collection belongs to different user', async () => {
      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(null);

      await expect(
        service.updateCollection('user1', 'col1', { name: 'New Name' })
      ).rejects.toThrow('Collection not found');
    });

    it('should throw error if new name conflicts with existing collection', async () => {
      const existingCollection = {
        id: 'col1',
        userId: 'user1',
        name: 'Watch Later',
      };

      const duplicateCollection = {
        id: 'col2',
        userId: 'user1',
        name: 'Favorites',
      };

      // First call returns the collection being updated
      // Second call returns the duplicate name check
      mockPrisma.collection.findFirst = vi
        .fn()
        .mockResolvedValueOnce(existingCollection)
        .mockResolvedValueOnce(duplicateCollection);

      await expect(
        service.updateCollection('user1', 'col1', { name: 'Favorites' })
      ).rejects.toThrow('A collection with this name already exists');

      expect(mockPrisma.collection.update).not.toHaveBeenCalled();
    });

    it('should allow keeping the same name', async () => {
      const existingCollection = {
        id: 'col1',
        userId: 'user1',
        name: 'Watch Later',
      };

      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(existingCollection);
      mockPrisma.collection.update = vi.fn().mockResolvedValue({
        ...existingCollection,
        description: 'Updated',
        color: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { savedItems: 0 },
      });

      await service.updateCollection('user1', 'col1', {
        name: 'Watch Later', // Same name
        description: 'Updated',
      });

      // Should not perform duplicate check since name didn't change
      expect(mockPrisma.collection.findFirst).toHaveBeenCalledTimes(1);
      expect(mockPrisma.collection.update).toHaveBeenCalled();
    });
  });

  describe('deleteCollection', () => {
    it('should delete existing collection', async () => {
      const existingCollection = {
        id: 'col1',
        userId: 'user1',
        name: 'Watch Later',
      };

      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(existingCollection);
      mockPrisma.collection.delete = vi.fn().mockResolvedValue(existingCollection);

      await service.deleteCollection('user1', 'col1');

      expect(mockPrisma.collection.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'col1',
          userId: 'user1',
        },
      });

      expect(mockPrisma.collection.delete).toHaveBeenCalledWith({
        where: { id: 'col1' },
      });
    });

    it('should throw error if collection does not exist', async () => {
      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(null);

      await expect(service.deleteCollection('user1', 'nonexistent')).rejects.toThrow(
        'Collection not found'
      );

      expect(mockPrisma.collection.delete).not.toHaveBeenCalled();
    });

    it('should throw error if collection belongs to different user', async () => {
      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(null);

      await expect(service.deleteCollection('user1', 'col1')).rejects.toThrow(
        'Collection not found'
      );
    });
  });

  describe('updateSavedItemCollection', () => {
    it('should move saved item to a collection', async () => {
      const savedItem = {
        id: 'saved1',
        userId: 'user1',
        contentId: 'content1',
        collectionId: null,
      };

      const collection = {
        id: 'col1',
        userId: 'user1',
        name: 'Watch Later',
      };

      mockPrisma.savedContent.findFirst = vi.fn().mockResolvedValue(savedItem);
      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(collection);
      mockPrisma.savedContent.update = vi.fn().mockResolvedValue({
        ...savedItem,
        collectionId: 'col1',
      });

      await service.updateSavedItemCollection('user1', 'saved1', 'col1');

      expect(mockPrisma.savedContent.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'saved1',
          userId: 'user1',
        },
      });

      expect(mockPrisma.collection.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'col1',
          userId: 'user1',
        },
      });

      expect(mockPrisma.savedContent.update).toHaveBeenCalledWith({
        where: { id: 'saved1' },
        data: { collectionId: 'col1' },
      });
    });

    it('should remove saved item from collection (set to null)', async () => {
      const savedItem = {
        id: 'saved1',
        userId: 'user1',
        contentId: 'content1',
        collectionId: 'col1',
      };

      mockPrisma.savedContent.findFirst = vi.fn().mockResolvedValue(savedItem);
      mockPrisma.savedContent.update = vi.fn().mockResolvedValue({
        ...savedItem,
        collectionId: null,
      });

      await service.updateSavedItemCollection('user1', 'saved1', null);

      expect(mockPrisma.savedContent.update).toHaveBeenCalledWith({
        where: { id: 'saved1' },
        data: { collectionId: null },
      });

      // Should not check collection when setting to null
      expect(mockPrisma.collection.findFirst).not.toHaveBeenCalled();
    });

    it('should throw error if saved item does not exist', async () => {
      mockPrisma.savedContent.findFirst = vi.fn().mockResolvedValue(null);

      await expect(
        service.updateSavedItemCollection('user1', 'nonexistent', 'col1')
      ).rejects.toThrow('Saved item not found');

      expect(mockPrisma.savedContent.update).not.toHaveBeenCalled();
    });

    it('should throw error if saved item belongs to different user', async () => {
      mockPrisma.savedContent.findFirst = vi.fn().mockResolvedValue(null);

      await expect(
        service.updateSavedItemCollection('user1', 'saved1', 'col1')
      ).rejects.toThrow('Saved item not found');
    });

    it('should throw error if collection does not exist', async () => {
      const savedItem = {
        id: 'saved1',
        userId: 'user1',
        contentId: 'content1',
        collectionId: null,
      };

      mockPrisma.savedContent.findFirst = vi.fn().mockResolvedValue(savedItem);
      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(null);

      await expect(
        service.updateSavedItemCollection('user1', 'saved1', 'nonexistent')
      ).rejects.toThrow('Collection not found');

      expect(mockPrisma.savedContent.update).not.toHaveBeenCalled();
    });

    it('should throw error if collection belongs to different user', async () => {
      const savedItem = {
        id: 'saved1',
        userId: 'user1',
        contentId: 'content1',
        collectionId: null,
      };

      mockPrisma.savedContent.findFirst = vi.fn().mockResolvedValue(savedItem);
      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(null);

      await expect(
        service.updateSavedItemCollection('user1', 'saved1', 'col1')
      ).rejects.toThrow('Collection not found');
    });

    it('should allow moving item between collections', async () => {
      const savedItem = {
        id: 'saved1',
        userId: 'user1',
        contentId: 'content1',
        collectionId: 'col1',
      };

      const newCollection = {
        id: 'col2',
        userId: 'user1',
        name: 'Favorites',
      };

      mockPrisma.savedContent.findFirst = vi.fn().mockResolvedValue(savedItem);
      mockPrisma.collection.findFirst = vi.fn().mockResolvedValue(newCollection);
      mockPrisma.savedContent.update = vi.fn().mockResolvedValue({
        ...savedItem,
        collectionId: 'col2',
      });

      await service.updateSavedItemCollection('user1', 'saved1', 'col2');

      expect(mockPrisma.savedContent.update).toHaveBeenCalledWith({
        where: { id: 'saved1' },
        data: { collectionId: 'col2' },
      });
    });
  });
});
