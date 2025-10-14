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
        findUnique: vi.fn(),
        findMany: vi.fn(),
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

      const result = await interactionService.recordWatch(testUserId, testContentId);

      expect(result).toEqual(mockInteraction);
      expect(mockDb.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: testContentId,
          type: 'WATCHED',
          watchDuration: null,
          completionRate: null,
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

      const result = await interactionService.recordWatch(
        testUserId,
        testContentId,
        1200,
        0.85
      );

      expect(result.watchDuration).toBe(1200);
      expect(result.completionRate).toBe(0.85);
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

      const result = await interactionService.recordWatch(
        testUserId,
        testContentId,
        300,
        0.25
      );

      expect(result.completionRate).toBe(0.25);
    });
  });

  describe('Save Content Flow', () => {
    it('should save content without collection', async () => {
      vi.mocked(mockDb.savedContent.findUnique).mockResolvedValue(null);

      const mockSaved = {
        id: 'saved-1',
        userId: testUserId,
        contentId: testContentId,
        collection: null,
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

      const result = await interactionService.saveContent(testUserId, testContentId);

      expect(result).toEqual(mockInteraction);
      expect(mockDb.savedContent.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: testContentId,
          collection: null,
        },
      });
    });

    it('should save content with collection name', async () => {
      vi.mocked(mockDb.savedContent.findUnique).mockResolvedValue(null);

      const mockSaved = {
        id: 'saved-2',
        userId: testUserId,
        contentId: testContentId,
        collection: 'Watch Later',
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
        collection: 'Watch Later',
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(mockInteraction);

      const result = await interactionService.saveContent(
        testUserId,
        testContentId,
        'Watch Later'
      );

      expect(result.collection).toBe('Watch Later');
      expect(mockDb.savedContent.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: testContentId,
          collection: 'Watch Later',
        },
      });
    });

    it('should update existing saved content collection', async () => {
      // Content already saved
      const existingSaved = {
        id: 'saved-existing',
        userId: testUserId,
        contentId: testContentId,
        collection: 'Old Collection',
        savedAt: new Date('2025-10-10'),
        notes: null,
      };

      vi.mocked(mockDb.savedContent.findUnique).mockResolvedValue(existingSaved);

      const updatedSaved = {
        ...existingSaved,
        collection: 'New Collection',
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
        collection: 'New Collection',
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(mockInteraction);

      const result = await interactionService.saveContent(
        testUserId,
        testContentId,
        'New Collection'
      );

      expect(result.collection).toBe('New Collection');
      expect(mockDb.savedContent.update).toHaveBeenCalledWith({
        where: {
          userId_contentId: {
            userId: testUserId,
            contentId: testContentId,
          },
        },
        data: {
          collection: 'New Collection',
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

      const result = await interactionService.dismissContent(testUserId, testContentId);

      expect(result).toEqual(mockInteraction);
      expect(mockDb.contentInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          contentId: testContentId,
          type: 'DISMISSED',
          dismissReason: null,
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

      const result = await interactionService.dismissContent(
        testUserId,
        testContentId,
        'Not interested in this topic'
      );

      expect(result.dismissReason).toBe('Not interested in this topic');
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

      const result = await interactionService.notNowContent(testUserId, testContentId);

      expect(result.type).toBe('NOT_NOW');
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

      const result = await interactionService.blockContent(testUserId, testContentId);

      expect(result.type).toBe('BLOCKED');
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

      const keywords = ['politics', 'debate'];

      for (const keyword of keywords) {
        vi.mocked(mockDb.filterKeyword.create).mockResolvedValue({
          id: `filter-${keyword}`,
          userId: testUserId,
          keyword,
          isWildcard: false,
          createdAt: new Date(),
        });
      }

      const result = await interactionService.blockContent(
        testUserId,
        testContentId,
        keywords
      );

      expect(result.type).toBe('BLOCKED');

      // Should create filter keywords
      expect(mockDb.filterKeyword.create).toHaveBeenCalledTimes(2);
      expect(mockDb.filterKeyword.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          keyword: 'politics',
          isWildcard: false,
        },
      });
      expect(mockDb.filterKeyword.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          keyword: 'debate',
          isWildcard: false,
        },
      });
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
          type: 'WATCHED',
        },
        orderBy: { timestamp: 'desc' },
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
        orderBy: { timestamp: 'desc' },
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
          collection: 'Watch Later',
          savedAt: new Date(),
          notes: null,
        },
        {
          id: 'saved-101',
          userId: testUserId,
          contentId: 'content-2',
          collection: null,
          savedAt: new Date(),
          notes: 'Looks interesting',
        },
      ];

      vi.mocked(mockDb.savedContent.findMany).mockResolvedValue(mockSaved);

      const result = await interactionService.getSavedContent(testUserId);

      expect(result).toEqual(mockSaved);
      expect(mockDb.savedContent.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
        orderBy: { savedAt: 'desc' },
      });
    });

    it('should filter saved content by collection', async () => {
      const mockSaved = [
        {
          id: 'saved-102',
          userId: testUserId,
          contentId: 'content-3',
          collection: 'Cooking',
          savedAt: new Date(),
          notes: null,
        },
      ];

      vi.mocked(mockDb.savedContent.findMany).mockResolvedValue(mockSaved);

      const result = await interactionService.getSavedContent(testUserId, 'Cooking');

      expect(result).toEqual(mockSaved);
      expect(mockDb.savedContent.findMany).toHaveBeenCalledWith({
        where: {
          userId: testUserId,
          collection: 'Cooking',
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
        collection: 'Watch Later',
        savedAt: new Date(),
        notes: null,
      };

      vi.mocked(mockDb.savedContent.delete).mockResolvedValue(mockSaved);

      await interactionService.unsaveContent(testUserId, testContentId);

      expect(mockDb.savedContent.delete).toHaveBeenCalledWith({
        where: {
          userId_contentId: {
            userId: testUserId,
            contentId: testContentId,
          },
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

      const watched = await interactionService.recordWatch(testUserId, 'video-1', 900, 1.0);

      expect(watched.type).toBe('WATCHED');

      // 2. User saves another video for later
      vi.mocked(mockDb.savedContent.findUnique).mockResolvedValue(null);
      vi.mocked(mockDb.savedContent.create).mockResolvedValue({
        id: 'saved-journey-1',
        userId: testUserId,
        contentId: 'video-2',
        collection: 'Watch Later',
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
        collection: 'Watch Later',
      };

      vi.mocked(mockDb.contentInteraction.create).mockResolvedValue(saveInteraction);

      const saved = await interactionService.saveContent(
        testUserId,
        'video-2',
        'Watch Later'
      );

      expect(saved.type).toBe('SAVED');

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

      const dismissed = await interactionService.dismissContent(
        testUserId,
        'video-3',
        'Not relevant'
      );

      expect(dismissed.type).toBe('DISMISSED');

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

      const notNow = await interactionService.notNowContent(testUserId, 'video-4');

      expect(notNow.type).toBe('NOT_NOW');

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
      vi.mocked(mockDb.filterKeyword.create).mockResolvedValue({
        id: 'filter-politics',
        userId: testUserId,
        keyword: 'politics',
        isWildcard: false,
        createdAt: new Date(),
      });

      const blocked = await interactionService.blockContent(testUserId, 'video-5', [
        'politics',
      ]);

      expect(blocked.type).toBe('BLOCKED');

      // Verify cache was invalidated for each action
      expect(mockCache.delete).toHaveBeenCalledTimes(5);
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
