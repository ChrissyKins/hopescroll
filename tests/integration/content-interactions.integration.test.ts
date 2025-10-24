/**
 * Integration Tests - Content Interaction Flows
 *
 * These tests verify complete user interaction scenarios:
 * 1. Watching content and tracking progress
 * 2. Saving content for later with collections
 * 3. Dismissing content permanently
 * 4. "Not now" temporary dismissal
 * 5. Blocking content and extracting keywords
 * 6. Viewing history and saved content
 *
 * Tests real interaction flows that users would experience
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InteractionService } from '@/services/interaction-service';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import type { InteractionType } from '@/types';

describe('Content Interaction Integration Tests', () => {
  let interactionService: InteractionService;
  let mockDb: any;
  let mockCache: any;
  let mockLogger: Logger;

  const testUserId = 'test-user-interactions';
  const testContentId = 'content-123';

  beforeEach(() => {
    // Mock database
    mockDb = {
      contentInteraction: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      savedContent: {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      contentItem: {
        findUnique: vi.fn(),
      },
      filterKeyword: {
        create: vi.fn(),
      },
    } as unknown as PrismaClient;

    // Mock cache
    mockCache = {
      delete: vi.fn().mockResolvedValue(true),
    };

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    interactionService = new InteractionService(mockDb, mockCache, mockLogger);
  });

  describe('Watch Content Flow', () => {
    it('should record watch without metadata', async () => {
      const mockInteraction = {
        id: 'int-1',
        userId: testUserId,
        contentId: testContentId,
        type: 'WATCHED' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: null,
        collection: null,
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(mockInteraction);

      await interactionService.recordWatch(testUserId, testContentId);

      expect(mockDb.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: testContentId,
          type: 'WATCHED',
          watchDuration: undefined,
          completionRate: undefined,
        },
      });

      expect(mockCache.delete).toHaveBeenCalledWith(`feed:${testUserId}`);
    });

    it('should record watch with duration and completion rate', async () => {
      const mockInteraction = {
        id: 'int-2',
        userId: testUserId,
        contentId: testContentId,
        type: 'WATCHED' as InteractionType,
        timestamp: new Date(),
        watchDuration: 1200, // 20 minutes
        completionRate: 0.85, // 85% watched
        dismissReason: null,
        collection: null,
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(mockInteraction);

      await interactionService.recordWatch(
        testUserId,
        testContentId,
        1200,
        0.85
      );

      expect(mockDb.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: testContentId,
          type: 'WATCHED',
          watchDuration: 1200,
          completionRate: 0.85,
        },
      });
    });

    it('should track partial watch completion', async () => {
      const mockInteraction = {
        id: 'int-3',
        userId: testUserId,
        contentId: testContentId,
        type: 'WATCHED' as InteractionType,
        timestamp: new Date(),
        watchDuration: 300, // 5 minutes of 20 minute video
        completionRate: 0.25, // 25% watched
        dismissReason: null,
        collection: null,
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(mockInteraction);

      await interactionService.recordWatch(
        testUserId,
        testContentId,
        300,
        0.25
      );

      expect(mockDb.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: testContentId,
          type: 'WATCHED',
          watchDuration: 300,
          completionRate: 0.25,
        },
      });
    });
  });

  describe('Save Content Flow', () => {
    it('should save content without collection', async () => {
      vi.mocked(mockDb.savedContent.findUnique).mockResolvedValue(null);

      const mockSaved = {
        id: 'saved-1',
        userId: testUserId,
        contentId: testContentId,
        collectionId: null,
        savedAt: new Date(),
        notes: null,
      };

      vi.mocked(mockDb.savedContent.create).mockResolvedValue(mockSaved);

      const mockInteraction = {
        id: 'int-4',
        userId: testUserId,
        contentId: testContentId,
        type: 'SAVED' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: null,
        collection: null,
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(mockInteraction);

      await interactionService.saveContent(testUserId, testContentId);

      expect(mockDb.savedContent.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: testContentId,
          collectionId: undefined,
          notes: undefined,
        },
      });
    });

    it('should save content with collection name', async () => {
      vi.mocked(mockDb.savedContent.findUnique).mockResolvedValue(null);

      const mockSaved = {
        id: 'saved-2',
        userId: testUserId,
        contentId: testContentId,
        collectionId: 'collection-watch-later',
        savedAt: new Date(),
        notes: null,
      };

      vi.mocked(mockDb.savedContent.create).mockResolvedValue(mockSaved);

      const mockInteraction = {
        id: 'int-5',
        userId: testUserId,
        contentId: testContentId,
        type: 'SAVED' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: null,
        collection: 'collection-watch-later',
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(mockInteraction);

      await interactionService.saveContent(
        testUserId,
        testContentId,
        'collection-watch-later'
      );

      expect(mockDb.savedContent.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: testContentId,
          collectionId: 'collection-watch-later',
          notes: undefined,
        },
      });
    });

    it('should update existing saved content collection', async () => {
      // Content already saved
      const existingSaved = {
        id: 'saved-existing',
        userId: testUserId,
        contentId: testContentId,
        collectionId: 'collection-old',
        savedAt: new Date('2025-10-10'),
        notes: null,
      };

      vi.mocked(mockDb.savedContent.findUnique).mockResolvedValue(existingSaved);

      const updatedSaved = {
        ...existingSaved,
        collectionId: 'collection-new',
      };

      vi.mocked(mockDb.savedContent.update).mockResolvedValue(updatedSaved);

      const mockInteraction = {
        id: 'int-6',
        userId: testUserId,
        contentId: testContentId,
        type: 'SAVED' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: null,
        collection: 'collection-new',
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(mockInteraction);

      await interactionService.saveContent(
        testUserId,
        testContentId,
        'collection-new'
      );
      expect(mockDb.savedContent.update).toHaveBeenCalledWith({
        where: { id: 'saved-existing' },
        data: {
          collectionId: 'collection-new',
          notes: undefined,
        },
      });
    });
  });

  describe('Dismiss Content Flow', () => {
    it('should dismiss content without reason', async () => {
      const mockInteraction = {
        id: 'int-7',
        userId: testUserId,
        contentId: testContentId,
        type: 'DISMISSED' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: null,
        collection: null,
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(mockInteraction);

      await interactionService.dismissContent(testUserId, testContentId);

      expect(mockDb.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: testContentId,
          type: 'DISMISSED',
          dismissReason: undefined,
        },
      });

      expect(mockCache.delete).toHaveBeenCalledWith(`feed:${testUserId}`);
    });

    it('should dismiss content with reason', async () => {
      const mockInteraction = {
        id: 'int-8',
        userId: testUserId,
        contentId: testContentId,
        type: 'DISMISSED' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: 'Not interested in this topic',
        collection: null,
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(mockInteraction);

      await interactionService.dismissContent(
        testUserId,
        testContentId,
        'Not interested in this topic'
      );

      expect(mockDb.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: testContentId,
          type: 'DISMISSED',
          dismissReason: 'Not interested in this topic',
        },
      });
    });
  });

  describe('Not Now Flow', () => {
    it('should mark content as "not now"', async () => {
      const mockInteraction = {
        id: 'int-9',
        userId: testUserId,
        contentId: testContentId,
        type: 'NOT_NOW' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: null,
        collection: null,
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(mockInteraction);

      await interactionService.notNowContent(testUserId, testContentId);

      expect(mockDb.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: testContentId,
          type: 'NOT_NOW',
        },
      });

      // NOT_NOW should still invalidate feed cache
      expect(mockCache.delete).toHaveBeenCalledWith(`feed:${testUserId}`);
    });
  });

  describe('Block Content Flow', () => {
    it('should block content without keyword extraction', async () => {
      const mockInteraction = {
        id: 'int-10',
        userId: testUserId,
        contentId: testContentId,
        type: 'BLOCKED' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: null,
        collection: null,
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(mockInteraction);

      const keywords = await interactionService.blockContent(testUserId, testContentId, false);

      expect(keywords).toEqual([]);
      expect(mockDb.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: testContentId,
          type: 'BLOCKED',
        },
      });
      expect(mockCache.delete).toHaveBeenCalledWith(`feed:${testUserId}`);
    });

    it('should block content and extract keywords from title', async () => {
      const mockInteraction = {
        id: 'int-11',
        userId: testUserId,
        contentId: testContentId,
        type: 'BLOCKED' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: null,
        collection: null,
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(mockInteraction);

      // Mock content item with title containing keywords
      vi.mocked(mockDb.contentItem.findUnique).mockResolvedValue({
        id: testContentId,
        title: 'Political Debate About Elections',
        description: 'A heated debate',
        sourceId: 'source-1',
        sourceType: 'YOUTUBE',
        originalId: 'yt-123',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        duration: 600,
        publishedAt: new Date(),
        fetchedAt: new Date(),
        lastSeenInFeed: new Date(),
      });

      const extractedKeywords = ['politics', 'debate'];

      for (const keyword of extractedKeywords) {
        vi.mocked(mockDb.filterKeyword.create).mockResolvedValue({
          id: `filter-${keyword}`,
          userId: testUserId,
          keyword,
          isWildcard: false,
          createdAt: new Date(),
        });
      }

      const keywords = await interactionService.blockContent(
        testUserId,
        testContentId,
        true // extractKeywords = true
      );

      expect(keywords.length).toBeGreaterThan(0);

      // Should create filter keywords
      expect(mockDb.filterKeyword.create).toHaveBeenCalled();
    });
  });

  describe('View History Flow', () => {
    it('should retrieve watch history ordered by timestamp', async () => {
      const mockHistory = [
        {
          id: 'int-100',
          userId: testUserId,
          contentId: 'content-1',
          type: 'WATCHED' as InteractionType,
          timestamp: new Date('2025-10-14T12:00:00'),
          watchDuration: 900,
          completionRate: 1.0,
          dismissReason: null,
          collection: null,
        },
        {
          id: 'int-101',
          userId: testUserId,
          contentId: 'content-2',
          type: 'WATCHED' as InteractionType,
          timestamp: new Date('2025-10-14T11:00:00'),
          watchDuration: 1200,
          completionRate: 0.8,
          dismissReason: null,
          collection: null,
        },
      ];

      vi.mocked(mockDb.contentInteraction.findMany).mockResolvedValue(mockHistory);

      const result = await interactionService.getHistory(testUserId);

      expect(result).toEqual(mockHistory);
      expect(mockDb.contentInteraction.findMany).toHaveBeenCalledWith({
        where: {
          userId: testUserId,
        },
        include: {
          content: true,
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });
    });

    it('should filter history by type', async () => {
      const mockDismissed = [
        {
          id: 'int-102',
          userId: testUserId,
          contentId: 'content-3',
          type: 'DISMISSED' as InteractionType,
          timestamp: new Date(),
          watchDuration: null,
          completionRate: null,
          dismissReason: 'Not interested',
          collection: null,
        },
      ];

      vi.mocked(mockDb.contentInteraction.findMany).mockResolvedValue(mockDismissed);

      const result = await interactionService.getHistory(testUserId, 'DISMISSED');

      expect(result).toEqual(mockDismissed);
      expect(mockDb.contentInteraction.findMany).toHaveBeenCalledWith({
        where: {
          userId: testUserId,
          type: 'DISMISSED',
        },
        include: {
          content: true,
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });
    });

    it('should limit history results', async () => {
      const mockHistory = Array.from({ length: 10 }, (_, i) => ({
        id: `int-${i}`,
        userId: testUserId,
        contentId: `content-${i}`,
        type: 'WATCHED' as InteractionType,
        timestamp: new Date(),
        watchDuration: 600,
        completionRate: 1.0,
        dismissReason: null,
        collection: null,
      }));

      vi.mocked(mockDb.contentInteraction.findMany).mockResolvedValue(mockHistory);

      await interactionService.getHistory(testUserId, undefined, 10);

      expect(mockDb.contentInteraction.findMany).toHaveBeenCalledWith({
        where: {
          userId: testUserId,
        },
        include: {
          content: true,
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
      });
    });
  });

  describe('View Saved Content Flow', () => {
    it('should retrieve all saved content', async () => {
      const mockSaved = [
        {
          id: 'saved-100',
          userId: testUserId,
          contentId: 'content-1',
          collectionId: 'collection-watch-later',
          savedAt: new Date(),
          notes: null,
        },
        {
          id: 'saved-101',
          userId: testUserId,
          contentId: 'content-2',
          collectionId: null,
          savedAt: new Date(),
          notes: 'Looks interesting',
        },
      ];

      vi.mocked(mockDb.savedContent.findMany).mockResolvedValue(mockSaved);

      const result = await interactionService.getSavedContent(testUserId);

      expect(result).toEqual(mockSaved);
      expect(mockDb.savedContent.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
        include: {
          content: true,
          collection: true,
        },
        orderBy: { savedAt: 'desc' },
      });
    });

    it('should filter saved content by collection', async () => {
      const mockSaved = [
        {
          id: 'saved-102',
          userId: testUserId,
          contentId: 'content-3',
          collectionId: 'collection-cooking',
          savedAt: new Date(),
          notes: null,
        },
      ];

      vi.mocked(mockDb.savedContent.findMany).mockResolvedValue(mockSaved);

      const result = await interactionService.getSavedContent(testUserId, 'collection-cooking');

      expect(result).toEqual(mockSaved);
      expect(mockDb.savedContent.findMany).toHaveBeenCalledWith({
        where: {
          userId: testUserId,
          collectionId: 'collection-cooking',
        },
        include: {
          content: true,
          collection: true,
        },
        orderBy: { savedAt: 'desc' },
      });
    });
  });

  describe('Unsave Content Flow', () => {
    it('should remove content from saved list', async () => {
      const mockSaved = {
        id: 'saved-200',
        userId: testUserId,
        contentId: testContentId,
        collectionId: 'collection-watch-later',
        savedAt: new Date(),
        notes: null,
      };

      vi.mocked(mockDb.savedContent.deleteMany).mockResolvedValue({ count: 1 });

      await interactionService.unsaveContent(testUserId, testContentId);

      expect(mockDb.savedContent.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: testUserId,
          contentId: testContentId,
        },
      });

      expect(mockCache.delete).toHaveBeenCalledWith(`feed:${testUserId}`);
    });
  });

  describe('Complete User Journey', () => {
    it('should handle typical user session flow', async () => {
      // 1. User watches a video
      const watchInteraction = {
        id: 'int-journey-1',
        userId: testUserId,
        contentId: 'video-1',
        type: 'WATCHED' as InteractionType,
        timestamp: new Date(),
        watchDuration: 900,
        completionRate: 1.0,
        dismissReason: null,
        collection: null,
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(watchInteraction);

      await interactionService.recordWatch(testUserId, 'video-1', 900, 1.0);

      expect(mockDb.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: 'video-1',
          type: 'WATCHED',
          watchDuration: 900,
          completionRate: 1.0,
        },
      });

      // 2. User saves another video for later
      vi.mocked(mockDb.savedContent.findUnique).mockResolvedValue(null);
      vi.mocked(mockDb.savedContent.create).mockResolvedValue({
        id: 'saved-journey-1',
        userId: testUserId,
        contentId: 'video-2',
        collectionId: 'collection-watch-later',
        savedAt: new Date(),
        notes: null,
      });

      const saveInteraction = {
        id: 'int-journey-2',
        userId: testUserId,
        contentId: 'video-2',
        type: 'SAVED' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: null,
        collection: 'collection-watch-later',
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(saveInteraction);

      await interactionService.saveContent(
        testUserId,
        'video-2',
        'collection-watch-later'
      );

      expect(mockDb.savedContent.create).toHaveBeenCalled();

      // 3. User dismisses unwanted content
      const dismissInteraction = {
        id: 'int-journey-3',
        userId: testUserId,
        contentId: 'video-3',
        type: 'DISMISSED' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: 'Not relevant',
        collection: null,
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(dismissInteraction);

      await interactionService.dismissContent(
        testUserId,
        'video-3',
        'Not relevant'
      );

      expect(mockDb.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: 'video-3',
          type: 'DISMISSED',
          dismissReason: 'Not relevant',
        },
      });

      // 4. User clicks "not now" on content
      const notNowInteraction = {
        id: 'int-journey-4',
        userId: testUserId,
        contentId: 'video-4',
        type: 'NOT_NOW' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: null,
        collection: null,
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(notNowInteraction);

      await interactionService.notNowContent(testUserId, 'video-4');

      expect(mockDb.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: 'video-4',
          type: 'NOT_NOW',
        },
      });

      // 5. User blocks content with keyword extraction
      const blockInteraction = {
        id: 'int-journey-5',
        userId: testUserId,
        contentId: 'video-5',
        type: 'BLOCKED' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: null,
        collection: null,
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(blockInteraction);
      vi.mocked(mockDb.contentItem.findUnique).mockResolvedValue({
        id: 'video-5',
        sourceType: 'YOUTUBE',
        sourceId: 'ch1',
        originalId: 'v5',
        title: 'Political Debate 2024',
        description: 'Political content',
        thumbnailUrl: null,
        url: 'https://youtube.com/v5',
        duration: 1800,
        publishedAt: new Date(),
        fetchedAt: new Date(),
        lastSeenInFeed: new Date(),
      });
      vi.mocked(mockDb.filterKeyword.create).mockResolvedValue({
        id: 'filter-politics',
        userId: testUserId,
        keyword: 'Political',
        isWildcard: false,
        createdAt: new Date(),
      });

      const extractedKeywords = await interactionService.blockContent(testUserId, 'video-5', true);

      expect(mockDb.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: 'video-5',
          type: 'BLOCKED',
        },
      });
      expect(extractedKeywords).toBeInstanceOf(Array);

      // Verify cache was invalidated (called at least once for each action)
      expect(mockCache.delete).toHaveBeenCalled();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate feed cache on watch', async () => {
      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue({
        id: 'int-cache-1',
        userId: testUserId,
        contentId: testContentId,
        type: 'WATCHED' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: null,
        collection: null,
      });

      await interactionService.recordWatch(testUserId, testContentId);

      expect(mockCache.delete).toHaveBeenCalledWith(`feed:${testUserId}`);
    });

    it('should invalidate feed cache on save', async () => {
      vi.mocked(mockDb.savedContent.findUnique).mockResolvedValue(null);
      vi.mocked(mockDb.savedContent.create).mockResolvedValue({
        id: 'saved-cache-1',
        userId: testUserId,
        contentId: testContentId,
        collection: null,
        savedAt: new Date(),
        notes: null,
      });

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue({
        id: 'int-cache-2',
        userId: testUserId,
        contentId: testContentId,
        type: 'SAVED' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: null,
        collection: null,
      });

      await interactionService.saveContent(testUserId, testContentId);

      expect(mockCache.delete).toHaveBeenCalledWith(`feed:${testUserId}`);
    });

    it('should invalidate feed cache on dismiss', async () => {
      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue({
        id: 'int-cache-3',
        userId: testUserId,
        contentId: testContentId,
        type: 'DISMISSED' as InteractionType,
        timestamp: new Date(),
        watchDuration: null,
        completionRate: null,
        dismissReason: null,
        collection: null,
      });

      await interactionService.dismissContent(testUserId, testContentId);

      expect(mockCache.delete).toHaveBeenCalledWith(`feed:${testUserId}`);
    });
  });
});
