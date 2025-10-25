/**
 * Integration tests for /app/api/feed
 * Tests actual HTTP request/response behavior with real database
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/feed/route';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { NextRequest } from 'next/server';

// Mock auth to return a test user
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'feed-test-user', email: 'feed-test@example.com' }
  })
}));

describe('GET /api/feed', () => {
  const testUserId = 'feed-test-user';
  const testEmail = 'feed-test@example.com';

  // Helper function to create a mock NextRequest
  function createMockRequest(): NextRequest {
    return {
      nextUrl: new URL('http://localhost:3000/api/feed'),
    } as NextRequest;
  }

  beforeEach(async () => {
    // Clear cache
    await cache.delete(`feed:${testUserId}`);

    // Clean up any existing test data
    await db.contentInteraction.deleteMany({ where: { userId: testUserId } });
    await db.savedContent.deleteMany({ where: { userId: testUserId } });
    await db.filterKeyword.deleteMany({ where: { userId: testUserId } });
    await db.contentItem.deleteMany({
      where: {
        sourceId: { startsWith: 'test-source-' }
      }
    });
    await db.contentSource.deleteMany({ where: { userId: testUserId } });
    await db.userPreferences.deleteMany({ where: { userId: testUserId } });

    const existingUser = await db.user.findUnique({
      where: { email: testEmail },
    });
    if (existingUser) {
      await db.user.delete({
        where: { email: testEmail },
      });
    }

    // Create test user
    await db.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        password: 'hashed-password',
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await cache.delete(`feed:${testUserId}`);
    await db.contentInteraction.deleteMany({ where: { userId: testUserId } });
    await db.savedContent.deleteMany({ where: { userId: testUserId } });
    await db.filterKeyword.deleteMany({ where: { userId: testUserId } });
    await db.contentItem.deleteMany({
      where: {
        sourceId: { startsWith: 'test-source-' }
      }
    });
    await db.contentSource.deleteMany({ where: { userId: testUserId } });
    await db.userPreferences.deleteMany({ where: { userId: testUserId } });

    try {
      await db.user.delete({
        where: { email: testEmail },
      });
    } catch {
      // User might not exist if test failed
    }
  });

  describe('Success Cases', () => {
    it('should return empty feed when user has no sources', async () => {
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.timestamp).toBeDefined();
    });

    it('should return empty feed when sources exist but no content', async () => {
      // Create a source but no content
      await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-source-1',
          displayName: 'Test Channel',
          isMuted: false,
        },
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should return feed with available content', async () => {
      // Create source
      const source = await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-source-1',
          displayName: 'Test Channel',
          isMuted: false,
        },
      });

      // Create content items
      const publishedAt = new Date();
      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'test-source-1',
          originalId: 'video-1',
          title: 'Test Video 1',
          description: 'Test description',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          url: 'https://youtube.com/watch?v=test1',
          duration: 300,
          publishedAt,
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data[0].content).toHaveProperty('id');
      expect(data.data[0].content.title).toBe('Test Video 1');
    });

    it('should return consistent results across multiple requests', async () => {
      // Create source and content
      await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-source-1',
          displayName: 'Test Channel',
          isMuted: false,
        },
      });

      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'test-source-1',
          originalId: 'video-1',
          title: 'Test Video 1',
          url: 'https://youtube.com/watch?v=test1',
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      const request = createMockRequest();

      // First request - should generate feed
      const response1 = await GET(request);
      const data1 = await response1.json();

      // Second request - should return same feed (cached or regenerated)
      const response2 = await GET(request);
      const data2 = await response2.json();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(data1.data).toEqual(data2.data);

      // Note: Cache may not be available in test environment
      // This test verifies consistency, not caching specifically
    });

    it('should respect user preferences for diversity limit', async () => {
      // Create user preferences with diversity limit
      await db.userPreferences.create({
        data: {
          userId: testUserId,
          diversityLimit: 2,
        },
      });

      // Create two sources to enable diversity checking
      await db.contentSource.createMany({
        data: [
          {
            userId: testUserId,
            type: 'YOUTUBE',
            sourceId: 'test-source-1',
            displayName: 'Test Channel 1',
            isMuted: false,
          },
          {
            userId: testUserId,
            type: 'YOUTUBE',
            sourceId: 'test-source-2',
            displayName: 'Test Channel 2',
            isMuted: false,
          },
        ],
      });

      // Create multiple content items from both sources
      const now = Date.now();
      for (let i = 1; i <= 5; i++) {
        await db.contentItem.create({
          data: {
            sourceType: 'YOUTUBE',
            sourceId: 'test-source-1',
            originalId: `video-1-${i}`,
            title: `Test Video 1-${i}`,
            url: `https://youtube.com/watch?v=test1${i}`,
            publishedAt: new Date(now - i * 1000),
            fetchedAt: new Date(),
            lastSeenInFeed: new Date(),
          },
        });
        await db.contentItem.create({
          data: {
            sourceType: 'YOUTUBE',
            sourceId: 'test-source-2',
            originalId: `video-2-${i}`,
            title: `Test Video 2-${i}`,
            url: `https://youtube.com/watch?v=test2${i}`,
            publishedAt: new Date(now - i * 1000 - 500),
            fetchedAt: new Date(),
            lastSeenInFeed: new Date(),
          },
        });
      }

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Check that diversity is enforced (max 2 consecutive from same source)
      const feed = data.data;
      if (feed.length >= 3) {
        let maxConsecutive = 1;
        let currentConsecutive = 1;
        let currentSource = feed[0].content.sourceId;

        for (let i = 1; i < feed.length; i++) {
          if (feed[i].content.sourceId === currentSource) {
            currentConsecutive++;
            maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
          } else {
            currentSource = feed[i].content.sourceId;
            currentConsecutive = 1;
          }
        }

        // Diversity limit of 2 means max 2 consecutive items from same source
        expect(maxConsecutive).toBeLessThanOrEqual(2);
      }
    });

    it('should filter content based on keyword filters', async () => {
      // Create keyword filter
      await db.filterKeyword.create({
        data: {
          userId: testUserId,
          keyword: 'politics',
          isWildcard: false,
        },
      });

      // Create source
      await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-source-1',
          displayName: 'Test Channel',
          isMuted: false,
        },
      });

      // Create content items - one should be filtered
      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'test-source-1',
          originalId: 'video-1',
          title: 'Politics Discussion',
          url: 'https://youtube.com/watch?v=test1',
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'test-source-1',
          originalId: 'video-2',
          title: 'Tech Tutorial',
          url: 'https://youtube.com/watch?v=test2',
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should only contain non-politics content
      const feed = data.data;
      const hasPolitics = feed.some((item: any) =>
        item.content.title.toLowerCase().includes('politics')
      );
      expect(hasPolitics).toBe(false);

      // Should contain the tech video
      const hasTech = feed.some((item: any) =>
        item.content.title === 'Tech Tutorial'
      );
      expect(hasTech).toBe(true);
    });

    it('should filter content based on duration preferences', async () => {
      // Create user preferences with duration filter (5-10 minutes)
      await db.userPreferences.create({
        data: {
          userId: testUserId,
          minDuration: 300, // 5 minutes
          maxDuration: 600, // 10 minutes
        },
      });

      // Create source
      await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-source-1',
          displayName: 'Test Channel',
          isMuted: false,
        },
      });

      // Create content with different durations
      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'test-source-1',
          originalId: 'video-1',
          title: 'Too Short Video',
          url: 'https://youtube.com/watch?v=test1',
          duration: 60, // 1 minute - too short
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'test-source-1',
          originalId: 'video-2',
          title: 'Just Right Video',
          url: 'https://youtube.com/watch?v=test2',
          duration: 420, // 7 minutes - just right
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'test-source-1',
          originalId: 'video-3',
          title: 'Too Long Video',
          url: 'https://youtube.com/watch?v=test3',
          duration: 1800, // 30 minutes - too long
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should only contain video within duration range
      const feed = data.data;
      expect(feed.length).toBeGreaterThan(0);
      feed.forEach((item: any) => {
        if (item.content.duration) {
          expect(item.content.duration).toBeGreaterThanOrEqual(300);
          expect(item.content.duration).toBeLessThanOrEqual(600);
        }
      });
    });

    it('should exclude muted sources', async () => {
      // Create muted source
      await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-source-muted',
          displayName: 'Muted Channel',
          isMuted: true,
        },
      });

      // Create active source
      await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-source-active',
          displayName: 'Active Channel',
          isMuted: false,
        },
      });

      // Create content for both sources
      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'test-source-muted',
          originalId: 'video-muted',
          title: 'Muted Video',
          url: 'https://youtube.com/watch?v=muted',
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'test-source-active',
          originalId: 'video-active',
          title: 'Active Video',
          url: 'https://youtube.com/watch?v=active',
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should not contain muted content
      const feed = data.data;
      const hasMuted = feed.some((item: any) =>
        item.content.sourceId === 'test-source-muted'
      );
      expect(hasMuted).toBe(false);

      // Should contain active content
      const hasActive = feed.some((item: any) =>
        item.content.sourceId === 'test-source-active'
      );
      expect(hasActive).toBe(true);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      // Temporarily reset the mock to return unauthenticated
      const authModule = await import('@/lib/auth');
      const originalMock = vi.mocked(authModule.auth);
      vi.mocked(authModule.auth).mockResolvedValueOnce(null as any);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      // The error handler returns 500 for all errors, including auth errors
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);

      // Restore the original mock
      vi.mocked(authModule.auth).mockResolvedValue({
        user: { id: testUserId, email: testEmail }
      } as any);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple content sources correctly', async () => {
      // Create multiple sources
      await db.contentSource.createMany({
        data: [
          {
            userId: testUserId,
            type: 'YOUTUBE',
            sourceId: 'test-source-1',
            displayName: 'Channel 1',
            isMuted: false,
          },
          {
            userId: testUserId,
            type: 'YOUTUBE',
            sourceId: 'test-source-2',
            displayName: 'Channel 2',
            isMuted: false,
          },
        ],
      });

      // Create content from different sources
      await db.contentItem.createMany({
        data: [
          {
            sourceType: 'YOUTUBE',
            sourceId: 'test-source-1',
            originalId: 'video-1-1',
            title: 'Video from Channel 1',
            url: 'https://youtube.com/watch?v=test11',
            publishedAt: new Date(),
            fetchedAt: new Date(),
            lastSeenInFeed: new Date(),
          },
          {
            sourceType: 'YOUTUBE',
            sourceId: 'test-source-2',
            originalId: 'video-2-1',
            title: 'Video from Channel 2',
            url: 'https://youtube.com/watch?v=test21',
            publishedAt: new Date(),
            fetchedAt: new Date(),
            lastSeenInFeed: new Date(),
          },
        ],
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);

      // Should have content from both sources
      const sources = new Set(data.data.map((item: any) => item.content.sourceId));
      expect(sources.size).toBeGreaterThan(1);
    });

    it('should handle wildcard keyword filters', async () => {
      // Create wildcard filter
      await db.filterKeyword.create({
        data: {
          userId: testUserId,
          keyword: 'poli*',
          isWildcard: true,
        },
      });

      // Create source
      await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-source-1',
          displayName: 'Test Channel',
          isMuted: false,
        },
      });

      // Create content that matches wildcard
      await db.contentItem.createMany({
        data: [
          {
            sourceType: 'YOUTUBE',
            sourceId: 'test-source-1',
            originalId: 'video-1',
            title: 'Politics News',
            url: 'https://youtube.com/watch?v=test1',
            publishedAt: new Date(),
            fetchedAt: new Date(),
            lastSeenInFeed: new Date(),
          },
          {
            sourceType: 'YOUTUBE',
            sourceId: 'test-source-1',
            originalId: 'video-2',
            title: 'Policy Changes',
            url: 'https://youtube.com/watch?v=test2',
            publishedAt: new Date(),
            fetchedAt: new Date(),
            lastSeenInFeed: new Date(),
          },
          {
            sourceType: 'YOUTUBE',
            sourceId: 'test-source-1',
            originalId: 'video-3',
            title: 'Tech Review',
            url: 'https://youtube.com/watch?v=test3',
            publishedAt: new Date(),
            fetchedAt: new Date(),
            lastSeenInFeed: new Date(),
          },
        ],
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should filter out both "politics" and "policy"
      const feed = data.data;
      const filtered = feed.filter((item: any) =>
        item.content.title.toLowerCase().startsWith('poli')
      );
      expect(filtered.length).toBe(0);
    });
  });

  describe('Response Format', () => {
    it('should return consistent success response format', async () => {
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.timestamp).toBe('string');
      expect(() => new Date(data.timestamp)).not.toThrow();
    });
  });
});

describe('POST /api/feed', () => {
  const testUserId = 'feed-test-user';
  const testEmail = 'feed-test@example.com';

  function createMockRequest(): NextRequest {
    return {
      nextUrl: new URL('http://localhost:3000/api/feed'),
    } as NextRequest;
  }

  beforeEach(async () => {
    // Clear cache
    await cache.delete(`feed:${testUserId}`);

    // Clean up existing test data
    await db.contentInteraction.deleteMany({ where: { userId: testUserId } });
    await db.savedContent.deleteMany({ where: { userId: testUserId } });
    await db.filterKeyword.deleteMany({ where: { userId: testUserId } });
    await db.contentItem.deleteMany({
      where: {
        sourceId: { startsWith: 'test-source-' }
      }
    });
    await db.contentSource.deleteMany({ where: { userId: testUserId } });
    await db.userPreferences.deleteMany({ where: { userId: testUserId } });

    const existingUser = await db.user.findUnique({
      where: { email: testEmail },
    });
    if (existingUser) {
      await db.user.delete({
        where: { email: testEmail },
      });
    }

    // Create test user
    await db.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        password: 'hashed-password',
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await cache.delete(`feed:${testUserId}`);
    await db.contentInteraction.deleteMany({ where: { userId: testUserId } });
    await db.savedContent.deleteMany({ where: { userId: testUserId } });
    await db.filterKeyword.deleteMany({ where: { userId: testUserId } });
    await db.contentItem.deleteMany({
      where: {
        sourceId: { startsWith: 'test-source-' }
      }
    });
    await db.contentSource.deleteMany({ where: { userId: testUserId } });
    await db.userPreferences.deleteMany({ where: { userId: testUserId } });

    try {
      await db.user.delete({
        where: { email: testEmail },
      });
    } catch {
      // User might not exist
    }
  });

  describe('Success Cases', () => {
    it('should successfully refresh feed', async () => {
      // Create test data
      await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-source-1',
          displayName: 'Test Channel',
          isMuted: false,
        },
      });

      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'test-source-1',
          originalId: 'video-1',
          title: 'Test Video',
          url: 'https://youtube.com/watch?v=test1',
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      // Get feed first
      const getRequest = createMockRequest();
      await GET(getRequest);

      // Refresh feed
      const postRequest = createMockRequest();
      const response = await POST(postRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Feed refreshed');

      // Note: Cache functionality verification skipped in test environment
      // where Redis is not available. This test verifies the API contract.
    });

    it('should return success even if cache was already empty', async () => {
      // Ensure no cache
      await cache.delete(`feed:${testUserId}`);

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Feed refreshed');
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      // Temporarily reset the mock to return unauthenticated
      const authModule = await import('@/lib/auth');
      vi.mocked(authModule.auth).mockResolvedValueOnce(null as any);

      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      // The error handler returns 500 for all errors, including auth errors
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);

      // Restore the original mock
      vi.mocked(authModule.auth).mockResolvedValue({
        user: { id: testUserId, email: testEmail }
      } as any);
    });
  });

  describe('Response Format', () => {
    it('should return consistent success response format', async () => {
      const request = createMockRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.timestamp).toBe('string');
    });
  });
});
