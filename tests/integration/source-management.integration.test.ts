/**
 * Integration Tests - Source Management Flow
 *
 * These tests verify the complete source management functionality:
 * 1. Adding sources with validation
 * 2. Listing sources
 * 3. Updating source settings (mute/unmute, alwaysSafe)
 * 4. Removing sources
 * 5. Handling errors and edge cases
 *
 * Uses real service implementations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SourceService } from '@/services/source-service';
import { YouTubeAdapter } from '@/adapters/content/youtube/youtube-adapter';
import type { PrismaClient } from '@prisma/client';
import type { ContentAdapter } from '@/adapters/content/base-adapter';
import type { Logger } from 'pino';

describe('Source Management Integration Tests', () => {
  let sourceService: SourceService;
  let mockDb: any;
  let mockYouTubeAdapter: ContentAdapter;
  let mockLogger: Logger;

  const testUserId = 'test-user-sources';

  beforeEach(() => {
    // Mock database
    mockDb = {
      contentSource: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      contentItem: {
        count: vi.fn().mockResolvedValue(0),
      },
    } as unknown as PrismaClient;

    // Mock YouTube adapter
    mockYouTubeAdapter = {
      sourceType: 'YOUTUBE' as const,
      validateSource: vi.fn(),
      getSourceMetadata: vi.fn(),
      fetchRecent: vi.fn(),
      fetchBacklog: vi.fn(),
    };

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    // Initialize service
    const adapters = new Map<string, ContentAdapter>();
    adapters.set('YOUTUBE', mockYouTubeAdapter);

    sourceService = new SourceService(mockDb, adapters);
  });

  describe('Adding Sources', () => {
    it('should successfully add a valid YouTube channel', async () => {
      // Mock adapter validation
      vi.mocked(mockYouTubeAdapter.validateSource).mockResolvedValue({
        isValid: true,
        displayName: 'Nature Sounds Channel',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      // Mock database operations
      vi.mocked(mockDb.contentSource.findUnique).mockResolvedValue(null); // Not a duplicate
      vi.mocked(mockDb.contentSource.create).mockResolvedValue({
        id: 'source-1',
        userId: testUserId,
        type: 'YOUTUBE',
        sourceId: 'UC123456',
        displayName: 'Nature Sounds Channel',
        avatarUrl: 'https://example.com/avatar.jpg',
        isMuted: false,
        alwaysSafe: false,
        addedAt: new Date(),
        lastFetchAt: null,
        lastFetchStatus: 'pending',
        errorMessage: null,
      });

      const result = await sourceService.addSource(testUserId, 'YOUTUBE', 'UC123456');

      expect(result.id).toBe('source-1');
      expect(result.displayName).toBe('Nature Sounds Channel');
    });

    it('should reject invalid YouTube channel', async () => {
      // Mock adapter validation failure
      vi.mocked(mockYouTubeAdapter.validateSource).mockResolvedValue({
        isValid: false,
        errorMessage: 'Channel not found',
      });

      await expect(
        sourceService.addSource(testUserId, 'YOUTUBE', 'invalid-channel')
      ).rejects.toThrow('Channel not found');
    });

    it('should prevent adding duplicate source', async () => {
      // Mock validation success
      vi.mocked(mockYouTubeAdapter.validateSource).mockResolvedValue({
        isValid: true,
        displayName: 'Cooking Channel',
        avatarUrl: 'https://example.com/avatar2.jpg',
      });

      // Mock duplicate check
      vi.mocked(mockDb.contentSource.findUnique).mockResolvedValue({
        id: 'source-existing',
        userId: testUserId,
        type: 'YOUTUBE',
        sourceId: 'UC789',
        displayName: 'Cooking Channel',
        avatarUrl: 'https://example.com/avatar2.jpg',
        isMuted: false,
        alwaysSafe: false,
        addedAt: new Date(),
        lastFetchAt: new Date(),
        lastFetchStatus: 'success',
        errorMessage: null,
      });

      await expect(
        sourceService.addSource(testUserId, 'YOUTUBE', 'UC789')
      ).rejects.toThrow('already added');
    });

    it('should use sourceId as display name if validation does not return one', async () => {
      vi.mocked(mockYouTubeAdapter.validateSource).mockResolvedValue({
        isValid: true,
        // No displayName returned
      });

      vi.mocked(mockDb.contentSource.findUnique).mockResolvedValue(null);
      vi.mocked(mockDb.contentSource.create).mockResolvedValue({
        id: 'source-2',
        userId: testUserId,
        type: 'YOUTUBE',
        sourceId: 'UC999',
        displayName: 'UC999', // Falls back to sourceId when validation doesn't provide one
        avatarUrl: null,
        isMuted: false,
        alwaysSafe: false,
        addedAt: new Date(),
        lastFetchAt: null,
        lastFetchStatus: 'pending',
        errorMessage: null,
      });

      const result = await sourceService.addSource(testUserId, 'YOUTUBE', 'UC999');

      expect(result.displayName).toBe('UC999'); // Falls back to sourceId
    });

    it('should handle unsupported source type', async () => {
      await expect(
        sourceService.addSource(testUserId, 'TIKTOK' as any, 'some-id')
      ).rejects.toThrow('Unsupported source type');
    });
  });

  describe('Listing Sources', () => {
    it('should return all sources for user ordered by date', async () => {
      const mockSources = [
        {
          id: 'source-1',
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'channel-1',
          displayName: 'Channel 1',
          avatarUrl: 'https://example.com/1.jpg',
          isMuted: false,
          alwaysSafe: false,
          addedAt: new Date('2025-10-14'),
          lastFetchAt: new Date(),
          lastFetchStatus: 'success',
          errorMessage: null,
        },
        {
          id: 'source-2',
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'channel-2',
          displayName: 'Channel 2',
          avatarUrl: 'https://example.com/2.jpg',
          isMuted: true,
          alwaysSafe: false,
          addedAt: new Date('2025-10-13'),
          lastFetchAt: new Date(),
          lastFetchStatus: 'success',
          errorMessage: null,
        },
      ];

      vi.mocked(mockDb.contentSource.findMany).mockResolvedValue(mockSources);

      const sources = await sourceService.listSources(testUserId);

      expect(sources).toHaveLength(2);
      expect(sources[0].displayName).toBe('Channel 1');
      expect(sources[1].displayName).toBe('Channel 2');

      // Verify database was queried correctly
      expect(mockDb.contentSource.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
        orderBy: { addedAt: 'desc' },
      });
    });

    it('should return empty array when user has no sources', async () => {
      vi.mocked(mockDb.contentSource.findMany).mockResolvedValue([]);

      const sources = await sourceService.listSources(testUserId);

      expect(sources).toEqual([]);
    });
  });

  describe('Getting Single Source', () => {
    it('should return source if it belongs to user', async () => {
      const mockSource = {
        id: 'source-1',
        userId: testUserId,
        type: 'YOUTUBE',
        sourceId: 'channel-1',
        displayName: 'My Channel',
        avatarUrl: 'https://example.com/avatar.jpg',
        isMuted: false,
        alwaysSafe: false,
        addedAt: new Date(),
        lastFetchAt: new Date(),
        lastFetchStatus: 'success',
        errorMessage: null,
      };

      vi.mocked(mockDb.contentSource.findFirst).mockResolvedValue(mockSource);

      const result = await sourceService.getSource(testUserId, 'source-1');

      expect(result).toEqual(mockSource);
    });

    it('should throw if source does not exist', async () => {
      vi.mocked(mockDb.contentSource.findFirst).mockResolvedValue(null);

      await expect(
        sourceService.getSource(testUserId, 'nonexistent')
      ).rejects.toThrow('not found');
    });

    it('should throw if source belongs to different user', async () => {
      // Mock should return null when userId doesn't match (simulating the WHERE clause)
      vi.mocked(mockDb.contentSource.findFirst).mockResolvedValue(null);

      await expect(
        sourceService.getSource(testUserId, 'source-1')
      ).rejects.toThrow('not found');
    });
  });

  describe('Updating Sources', () => {
    it('should mute a source', async () => {
      const existingSource = {
        id: 'source-1',
        userId: testUserId,
        type: 'YOUTUBE',
        sourceId: 'channel-1',
        displayName: 'Channel',
        avatarUrl: null,
        isMuted: false,
        alwaysSafe: false,
        addedAt: new Date(),
        lastFetchAt: new Date(),
        lastFetchStatus: 'success',
        errorMessage: null,
      };

      vi.mocked(mockDb.contentSource.findFirst).mockResolvedValue(existingSource);
      vi.mocked(mockDb.contentSource.update).mockResolvedValue({
        ...existingSource,
        isMuted: true,
      });

      await sourceService.updateSource(testUserId, 'source-1', {
        isMuted: true,
      });

      // Verify update was called
      expect(mockDb.contentSource.update).toHaveBeenCalledWith({
        where: { id: 'source-1' },
        data: { isMuted: true },
      });
    });

    it('should mark source as always safe', async () => {
      const existingSource = {
        id: 'source-1',
        userId: testUserId,
        type: 'YOUTUBE',
        sourceId: 'channel-1',
        displayName: 'Safe Channel',
        avatarUrl: null,
        isMuted: false,
        alwaysSafe: false,
        addedAt: new Date(),
        lastFetchAt: new Date(),
        lastFetchStatus: 'success',
        errorMessage: null,
      };

      vi.mocked(mockDb.contentSource.findFirst).mockResolvedValue(existingSource);
      vi.mocked(mockDb.contentSource.update).mockResolvedValue({
        ...existingSource,
        alwaysSafe: true,
      });

      await sourceService.updateSource(testUserId, 'source-1', {
        alwaysSafe: true,
      });

      expect(mockDb.contentSource.update).toHaveBeenCalledWith({
        where: { id: 'source-1' },
        data: { alwaysSafe: true },
      });
    });

    it('should update multiple fields at once', async () => {
      const existingSource = {
        id: 'source-1',
        userId: testUserId,
        type: 'YOUTUBE',
        sourceId: 'channel-1',
        displayName: 'Channel',
        avatarUrl: null,
        isMuted: false,
        alwaysSafe: false,
        addedAt: new Date(),
        lastFetchAt: new Date(),
        lastFetchStatus: 'success',
        errorMessage: null,
      };

      vi.mocked(mockDb.contentSource.findFirst).mockResolvedValue(existingSource);
      vi.mocked(mockDb.contentSource.update).mockResolvedValue({
        ...existingSource,
        isMuted: true,
        alwaysSafe: true,
      });

      await sourceService.updateSource(testUserId, 'source-1', {
        isMuted: true,
        alwaysSafe: true,
      });

      expect(mockDb.contentSource.update).toHaveBeenCalledWith({
        where: { id: 'source-1' },
        data: { isMuted: true, alwaysSafe: true },
      });
    });

    it('should prevent updating source owned by different user', async () => {
      // When querying with userId filter, Prisma returns null for sources owned by other users
      vi.mocked(mockDb.contentSource.findFirst).mockResolvedValue(null);

      await expect(
        sourceService.updateSource(testUserId, 'source-1', { isMuted: true })
      ).rejects.toThrow('not found');

      expect(mockDb.contentSource.update).not.toHaveBeenCalled();
    });

    it('should handle nonexistent source', async () => {
      vi.mocked(mockDb.contentSource.findFirst).mockResolvedValue(null);

      await expect(
        sourceService.updateSource(testUserId, 'nonexistent', { isMuted: true })
      ).rejects.toThrow('not found');
    });
  });

  describe('Removing Sources', () => {
    it('should successfully remove a source', async () => {
      const existingSource = {
        id: 'source-1',
        userId: testUserId,
        type: 'YOUTUBE',
        sourceId: 'channel-1',
        displayName: 'Channel',
        avatarUrl: null,
        isMuted: false,
        alwaysSafe: false,
        addedAt: new Date(),
        lastFetchAt: new Date(),
        lastFetchStatus: 'success',
        errorMessage: null,
      };

      vi.mocked(mockDb.contentSource.findFirst).mockResolvedValue(existingSource);
      vi.mocked(mockDb.contentSource.delete).mockResolvedValue(existingSource);

      await sourceService.removeSource(testUserId, 'source-1');

      expect(mockDb.contentSource.delete).toHaveBeenCalledWith({
        where: { id: 'source-1' },
      });
    });

    it('should prevent removing source owned by different user', async () => {
      // When querying with userId filter, Prisma returns null for sources owned by other users
      vi.mocked(mockDb.contentSource.findFirst).mockResolvedValue(null);

      await expect(
        sourceService.removeSource(testUserId, 'source-1')
      ).rejects.toThrow('not found');

      expect(mockDb.contentSource.delete).not.toHaveBeenCalled();
    });

    it('should handle nonexistent source', async () => {
      vi.mocked(mockDb.contentSource.findFirst).mockResolvedValue(null);

      await expect(
        sourceService.removeSource(testUserId, 'nonexistent')
      ).rejects.toThrow('not found');
    });
  });

  describe('Complete Source Lifecycle', () => {
    it('should handle full source lifecycle: add, update, remove', async () => {
      const sourceId = 'UC-lifecycle-test';

      // Step 1: Add source
      vi.mocked(mockYouTubeAdapter.validateSource).mockResolvedValue({
        isValid: true,
        displayName: 'Lifecycle Test Channel',
        avatarUrl: 'https://example.com/lifecycle.jpg',
      });

      vi.mocked(mockDb.contentSource.findUnique).mockResolvedValue(null);
      vi.mocked(mockDb.contentSource.create).mockResolvedValue({
        id: 'source-lifecycle',
        userId: testUserId,
        type: 'YOUTUBE',
        sourceId,
        displayName: 'Lifecycle Test Channel',
        avatarUrl: 'https://example.com/lifecycle.jpg',
        isMuted: false,
        alwaysSafe: false,
        addedAt: new Date(),
        lastFetchAt: null,
        lastFetchStatus: 'pending',
        errorMessage: null,
      });

      const addResult = await sourceService.addSource(testUserId, 'YOUTUBE', sourceId);

      expect(addResult.id).toBe('source-lifecycle');
      const createdSourceId = addResult.id;

      // Step 2: Update source (mute it)
      const createdSource = {
        id: createdSourceId,
        userId: testUserId,
        type: 'YOUTUBE' as const,
        sourceId,
        displayName: 'Lifecycle Test Channel',
        avatarUrl: 'https://example.com/lifecycle.jpg',
        isMuted: false,
        alwaysSafe: false,
        addedAt: new Date(),
        lastFetchAt: null,
        lastFetchStatus: 'pending' as const,
        errorMessage: null,
      };

      vi.mocked(mockDb.contentSource.findFirst).mockResolvedValue(createdSource);
      vi.mocked(mockDb.contentSource.update).mockResolvedValue({
        ...createdSource,
        isMuted: true,
      });

      await sourceService.updateSource(testUserId, createdSourceId, {
        isMuted: true,
      });

      expect(mockDb.contentSource.update).toHaveBeenCalled();

      // Step 3: Remove source
      const mutedSource = { ...createdSource, isMuted: true };
      vi.mocked(mockDb.contentSource.findFirst).mockResolvedValue(mutedSource);
      vi.mocked(mockDb.contentSource.delete).mockResolvedValue(mutedSource);

      await sourceService.removeSource(testUserId, createdSourceId);

      expect(mockDb.contentSource.delete).toHaveBeenCalled();

      // Step 4: Verify source is gone
      vi.mocked(mockDb.contentSource.findFirst).mockResolvedValue(null);

      await expect(
        sourceService.getSource(testUserId, createdSourceId)
      ).rejects.toThrow('not found');
    });
  });
});
