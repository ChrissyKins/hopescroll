/**
 * Integration tests for /app/api/content/[id]/* interaction endpoints
 * Tests actual HTTP request/response behavior with real database
 *
 * NOTE: Tests run sequentially to avoid database race conditions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST as WATCH_POST } from '@/app/api/content/[id]/watch/route';
import { POST as SAVE_POST } from '@/app/api/content/[id]/save/route';
import { POST as DISMISS_POST } from '@/app/api/content/[id]/dismiss/route';
import { POST as NOT_NOW_POST } from '@/app/api/content/[id]/not-now/route';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { NextRequest } from 'next/server';

// Mock auth to return a test user
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'interaction-test-user', email: 'interaction-test@example.com' }
  })
}));

// Mock cache to avoid Redis connection issues in tests
vi.mock('@/lib/cache', () => ({
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    deletePattern: vi.fn().mockResolvedValue(undefined),
  }
}));

describe.sequential('POST /api/content/[id]/watch', () => {
  const testUserId = 'interaction-watch-user';
  const testEmail = 'interaction-watch@example.com';
  let testContentId: string;

  function createMockRequest(contentId: string, body: any = {}): NextRequest {
    return {
      nextUrl: new URL(`http://localhost:3000/api/content/${contentId}/watch`),
      json: async () => body,
    } as NextRequest;
  }

  beforeEach(async () => {
    // Clean up existing test data
    await cache.delete(`feed:${testUserId}`);
    await db.contentInteraction.deleteMany({ where: { userId: testUserId } });
    await db.savedContent.deleteMany({ where: { userId: testUserId } });
    await db.contentItem.deleteMany({
      where: {
        sourceId: { startsWith: 'test-source-' }
      }
    });
    await db.contentSource.deleteMany({ where: { userId: testUserId } });

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

    // Create test content
    await db.contentSource.create({
      data: {
        userId: testUserId,
        type: 'YOUTUBE',
        sourceId: 'test-source-watch',
        displayName: 'Test Channel',
        isMuted: false,
      },
    });

    const content = await db.contentItem.create({
      data: {
        sourceType: 'YOUTUBE',
        sourceId: 'test-source-watch',
        originalId: 'test-video-watch',
        title: 'Test Video',
        url: 'https://youtube.com/watch?v=test',
        publishedAt: new Date(),
        fetchedAt: new Date(),
        lastSeenInFeed: new Date(),
      },
    });

    testContentId = content.id;

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cache.delete(`feed:${testUserId}`);
    await db.contentInteraction.deleteMany({ where: { userId: testUserId } });
    await db.savedContent.deleteMany({ where: { userId: testUserId } });
    await db.contentItem.deleteMany({
      where: {
        sourceId: { startsWith: 'test-source-' }
      }
    });
    await db.contentSource.deleteMany({ where: { userId: testUserId } });

    try {
      await db.user.delete({
        where: { email: testEmail },
      });
    } catch {
      // User might not exist
    }
  });

  describe('Success Cases', () => {
    it('should record a watch interaction', async () => {
      const request = createMockRequest(testContentId);
      const response = await WATCH_POST(request, { params: { id: testContentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Content marked as watched');

      // Verify interaction was saved
      const interaction = await db.contentInteraction.findFirst({
        where: {
          userId: testUserId,
          contentId: testContentId,
          type: 'WATCHED',
        },
      });
      expect(interaction).not.toBeNull();
    });

    it('should record watch duration and completion rate', async () => {
      const request = createMockRequest(testContentId, {
        watchDuration: 300,
        completionRate: 0.75,
      });

      const response = await WATCH_POST(request, { params: { id: testContentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const interaction = await db.contentInteraction.findFirst({
        where: {
          userId: testUserId,
          contentId: testContentId,
          type: 'WATCHED',
        },
      });
      expect(interaction?.watchDuration).toBe(300);
      expect(interaction?.completionRate).toBe(0.75);
    });

    it('should update existing watch interaction', async () => {
      // First watch
      await WATCH_POST(
        createMockRequest(testContentId, { watchDuration: 100, completionRate: 0.25 }),
        { params: { id: testContentId } }
      );

      // Second watch with different stats
      const request = createMockRequest(testContentId, {
        watchDuration: 200,
        completionRate: 0.5,
      });

      const response = await WATCH_POST(request, { params: { id: testContentId } });

      expect(response.status).toBe(200);

      // Should have updated existing interaction, not created new one
      const interactions = await db.contentInteraction.findMany({
        where: {
          userId: testUserId,
          contentId: testContentId,
          type: 'WATCHED',
        },
      });
      expect(interactions).toHaveLength(1);
      expect(interactions[0].watchDuration).toBe(200);
      expect(interactions[0].completionRate).toBe(0.5);
    });

    it('should clear feed cache after watch', async () => {
      // Set cache
      await cache.set(`feed:${testUserId}`, [{ test: 'data' }], 600);

      const request = createMockRequest(testContentId);
      await WATCH_POST(request, { params: { id: testContentId } });

      // Cache should be cleared
      const cached = await cache.get(`feed:${testUserId}`);
      expect(cached).toBeNull();
    });
  });

  describe('Error Cases', () => {
    it('should handle invalid content ID', async () => {
      const request = createMockRequest('nonexistent-id');
      const response = await WATCH_POST(request, { params: { id: 'nonexistent-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const authModule = await import('@/lib/auth');
      vi.mocked(authModule.auth).mockResolvedValueOnce(null as any);

      const request = createMockRequest(testContentId);
      const response = await WATCH_POST(request, { params: { id: testContentId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);

      // Restore mock
      vi.mocked(authModule.auth).mockResolvedValue({
        user: { id: testUserId, email: testEmail }
      } as any);
    });
  });
});

describe.sequential('POST /api/content/[id]/save', () => {
  const testUserId = 'interaction-save-user';
  const testEmail = 'interaction-save@example.com';
  let testContentId: string;
  let testCollectionId: string;

  function createMockRequest(contentId: string, body: any = {}): NextRequest {
    return {
      nextUrl: new URL(`http://localhost:3000/api/content/${contentId}/save`),
      json: async () => body,
    } as NextRequest;
  }

  beforeEach(async () => {
    await cache.delete(`feed:${testUserId}`);
    await db.contentInteraction.deleteMany({ where: { userId: testUserId } });
    await db.savedContent.deleteMany({ where: { userId: testUserId } });
    await db.collection.deleteMany({ where: { userId: testUserId } });
    await db.contentItem.deleteMany({
      where: {
        sourceId: { startsWith: 'test-source-' }
      }
    });
    await db.contentSource.deleteMany({ where: { userId: testUserId } });

    const existingUser = await db.user.findUnique({
      where: { email: testEmail },
    });
    if (existingUser) {
      await db.user.delete({
        where: { email: testEmail },
      });
    }

    await db.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        password: 'hashed-password',
      },
    });

    // Create test collection
    const collection = await db.collection.create({
      data: {
        userId: testUserId,
        name: 'Test Collection',
        color: '#3B82F6',
      },
    });
    testCollectionId = collection.id;

    // Create test content
    await db.contentSource.create({
      data: {
        userId: testUserId,
        type: 'YOUTUBE',
        sourceId: 'test-source-save',
        displayName: 'Test Channel',
        isMuted: false,
      },
    });

    const content = await db.contentItem.create({
      data: {
        sourceType: 'YOUTUBE',
        sourceId: 'test-source-save',
        originalId: 'test-video-save',
        title: 'Test Video',
        url: 'https://youtube.com/watch?v=test',
        publishedAt: new Date(),
        fetchedAt: new Date(),
        lastSeenInFeed: new Date(),
      },
    });

    testContentId = content.id;

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cache.delete(`feed:${testUserId}`);
    await db.contentInteraction.deleteMany({ where: { userId: testUserId } });
    await db.savedContent.deleteMany({ where: { userId: testUserId } });
    await db.collection.deleteMany({ where: { userId: testUserId } });
    await db.contentItem.deleteMany({
      where: {
        sourceId: { startsWith: 'test-source-' }
      }
    });
    await db.contentSource.deleteMany({ where: { userId: testUserId } });

    try {
      await db.user.delete({
        where: { email: testEmail },
      });
    } catch {
      // User might not exist
    }
  });

  describe('Success Cases', () => {
    it('should save content', async () => {
      const request = createMockRequest(testContentId);
      const response = await SAVE_POST(request, { params: { id: testContentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Content saved');

      // Verify saved content record
      const saved = await db.savedContent.findFirst({
        where: {
          userId: testUserId,
          contentId: testContentId,
        },
      });
      expect(saved).not.toBeNull();
    });

    it('should save content to specific collection', async () => {
      const request = createMockRequest(testContentId, {
        collection: testCollectionId,
      });

      const response = await SAVE_POST(request, { params: { id: testContentId } });

      expect(response.status).toBe(200);

      const saved = await db.savedContent.findFirst({
        where: {
          userId: testUserId,
          contentId: testContentId,
        },
      });
      expect(saved?.collectionId).toBe(testCollectionId);
    });

    it('should save content with notes', async () => {
      const request = createMockRequest(testContentId, {
        notes: 'Great video, watch later',
      });

      const response = await SAVE_POST(request, { params: { id: testContentId } });

      expect(response.status).toBe(200);

      const saved = await db.savedContent.findFirst({
        where: {
          userId: testUserId,
          contentId: testContentId,
        },
      });
      expect(saved?.notes).toBe('Great video, watch later');
    });

    it('should record SAVED interaction', async () => {
      const request = createMockRequest(testContentId);
      await SAVE_POST(request, { params: { id: testContentId } });

      const interaction = await db.contentInteraction.findFirst({
        where: {
          userId: testUserId,
          contentId: testContentId,
          type: 'SAVED',
        },
      });
      expect(interaction).not.toBeNull();
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const authModule = await import('@/lib/auth');
      vi.mocked(authModule.auth).mockResolvedValueOnce(null as any);

      const request = createMockRequest(testContentId);
      const response = await SAVE_POST(request, { params: { id: testContentId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);

      // Restore mock
      vi.mocked(authModule.auth).mockResolvedValue({
        user: { id: testUserId, email: testEmail }
      } as any);
    });
  });
});

describe.sequential('POST /api/content/[id]/dismiss', () => {
  const testUserId = 'interaction-dismiss-user';
  const testEmail = 'interaction-dismiss@example.com';
  let testContentId: string;

  function createMockRequest(contentId: string, body: any = {}): NextRequest {
    return {
      nextUrl: new URL(`http://localhost:3000/api/content/${contentId}/dismiss`),
      json: async () => body,
    } as NextRequest;
  }

  beforeEach(async () => {
    await cache.delete(`feed:${testUserId}`);
    await db.contentInteraction.deleteMany({ where: { userId: testUserId } });
    await db.savedContent.deleteMany({ where: { userId: testUserId } });
    await db.contentItem.deleteMany({
      where: {
        sourceId: { startsWith: 'test-source-' }
      }
    });
    await db.contentSource.deleteMany({ where: { userId: testUserId } });

    const existingUser = await db.user.findUnique({
      where: { email: testEmail },
    });
    if (existingUser) {
      await db.user.delete({
        where: { email: testEmail },
      });
    }

    await db.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        password: 'hashed-password',
      },
    });

    // Create test content
    await db.contentSource.create({
      data: {
        userId: testUserId,
        type: 'YOUTUBE',
        sourceId: 'test-source-dismiss',
        displayName: 'Test Channel',
        isMuted: false,
      },
    });

    const content = await db.contentItem.create({
      data: {
        sourceType: 'YOUTUBE',
        sourceId: 'test-source-dismiss',
        originalId: 'test-video-dismiss',
        title: 'Test Video',
        url: 'https://youtube.com/watch?v=test',
        publishedAt: new Date(),
        fetchedAt: new Date(),
        lastSeenInFeed: new Date(),
      },
    });

    testContentId = content.id;

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cache.delete(`feed:${testUserId}`);
    await db.contentInteraction.deleteMany({ where: { userId: testUserId } });
    await db.savedContent.deleteMany({ where: { userId: testUserId } });
    await db.contentItem.deleteMany({
      where: {
        sourceId: { startsWith: 'test-source-' }
      }
    });
    await db.contentSource.deleteMany({ where: { userId: testUserId } });

    try {
      await db.user.delete({
        where: { email: testEmail },
      });
    } catch {
      // User might not exist
    }
  });

  describe('Success Cases', () => {
    it('should dismiss content', async () => {
      const request = createMockRequest(testContentId);
      const response = await DISMISS_POST(request, { params: { id: testContentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Content dismissed');

      // Verify DISMISSED interaction
      const interaction = await db.contentInteraction.findFirst({
        where: {
          userId: testUserId,
          contentId: testContentId,
          type: 'DISMISSED',
        },
      });
      expect(interaction).not.toBeNull();
    });

    it('should dismiss content with reason', async () => {
      const request = createMockRequest(testContentId, {
        reason: 'Not interested',
      });

      const response = await DISMISS_POST(request, { params: { id: testContentId } });

      expect(response.status).toBe(200);

      const interaction = await db.contentInteraction.findFirst({
        where: {
          userId: testUserId,
          contentId: testContentId,
          type: 'DISMISSED',
        },
      });
      expect(interaction?.dismissReason).toBe('Not interested');
    });

    it('should clear feed cache after dismiss', async () => {
      await cache.set(`feed:${testUserId}`, [{ test: 'data' }], 600);

      const request = createMockRequest(testContentId);
      await DISMISS_POST(request, { params: { id: testContentId } });

      const cached = await cache.get(`feed:${testUserId}`);
      expect(cached).toBeNull();
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const authModule = await import('@/lib/auth');
      vi.mocked(authModule.auth).mockResolvedValueOnce(null as any);

      const request = createMockRequest(testContentId);
      const response = await DISMISS_POST(request, { params: { id: testContentId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);

      // Restore mock
      vi.mocked(authModule.auth).mockResolvedValue({
        user: { id: testUserId, email: testEmail }
      } as any);
    });
  });
});

describe.sequential('POST /api/content/[id]/not-now', () => {
  const testUserId = 'interaction-notnow-user';
  const testEmail = 'interaction-notnow@example.com';
  let testContentId: string;

  function createMockRequest(contentId: string): NextRequest {
    return {
      nextUrl: new URL(`http://localhost:3000/api/content/${contentId}/not-now`),
      json: async () => ({}),
    } as NextRequest;
  }

  beforeEach(async () => {
    await cache.delete(`feed:${testUserId}`);
    await db.contentInteraction.deleteMany({ where: { userId: testUserId } });
    await db.savedContent.deleteMany({ where: { userId: testUserId } });
    await db.contentItem.deleteMany({
      where: {
        sourceId: { startsWith: 'test-source-' }
      }
    });
    await db.contentSource.deleteMany({ where: { userId: testUserId } });

    const existingUser = await db.user.findUnique({
      where: { email: testEmail },
    });
    if (existingUser) {
      await db.user.delete({
        where: { email: testEmail },
      });
    }

    await db.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        password: 'hashed-password',
      },
    });

    // Create test content
    await db.contentSource.create({
      data: {
        userId: testUserId,
        type: 'YOUTUBE',
        sourceId: 'test-source-notnow',
        displayName: 'Test Channel',
        isMuted: false,
      },
    });

    const content = await db.contentItem.create({
      data: {
        sourceType: 'YOUTUBE',
        sourceId: 'test-source-notnow',
        originalId: 'test-video-notnow',
        title: 'Test Video',
        url: 'https://youtube.com/watch?v=test',
        publishedAt: new Date(),
        fetchedAt: new Date(),
        lastSeenInFeed: new Date(),
      },
    });

    testContentId = content.id;

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cache.delete(`feed:${testUserId}`);
    await db.contentInteraction.deleteMany({ where: { userId: testUserId } });
    await db.savedContent.deleteMany({ where: { userId: testUserId } });
    await db.contentItem.deleteMany({
      where: {
        sourceId: { startsWith: 'test-source-' }
      }
    });
    await db.contentSource.deleteMany({ where: { userId: testUserId } });

    try {
      await db.user.delete({
        where: { email: testEmail },
      });
    } catch {
      // User might not exist
    }
  });

  describe('Success Cases', () => {
    it('should mark content as not now', async () => {
      const request = createMockRequest(testContentId);
      const response = await NOT_NOW_POST(request, { params: { id: testContentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Content marked as "not now"');

      // Verify NOT_NOW interaction
      const interaction = await db.contentInteraction.findFirst({
        where: {
          userId: testUserId,
          contentId: testContentId,
          type: 'NOT_NOW',
        },
      });
      expect(interaction).not.toBeNull();
    });

    it('should clear feed cache', async () => {
      await cache.set(`feed:${testUserId}`, [{ test: 'data' }], 600);

      const request = createMockRequest(testContentId);
      await NOT_NOW_POST(request, { params: { id: testContentId } });

      const cached = await cache.get(`feed:${testUserId}`);
      expect(cached).toBeNull();
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const authModule = await import('@/lib/auth');
      vi.mocked(authModule.auth).mockResolvedValueOnce(null as any);

      const request = createMockRequest(testContentId);
      const response = await NOT_NOW_POST(request, { params: { id: testContentId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);

      // Restore mock
      vi.mocked(authModule.auth).mockResolvedValue({
        user: { id: testUserId, email: testEmail }
      } as any);
    });
  });
});
