/**
 * Integration tests for /app/api/sources
 * Tests actual HTTP request/response behavior with real database
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock YouTube client to simulate API responses - use vi.hoisted() for proper initialization
const { mockGetChannelInfo, mockResolveChannelId } = vi.hoisted(() => ({
  mockGetChannelInfo: vi.fn(),
  mockResolveChannelId: vi.fn(),
}));

// Mock auth to return a test user
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'sources-test-user', email: 'sources-test@example.com' }
  })
}));

vi.mock('@/adapters/content/youtube/youtube-client', () => ({
  YouTubeClient: vi.fn().mockImplementation(() => ({
    getChannelInfo: mockGetChannelInfo,
    resolveChannelId: mockResolveChannelId,
  })),
}));

import { GET, POST } from '@/app/api/sources/route';
import { DELETE as DELETE_SOURCE } from '@/app/api/sources/[id]/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

describe('GET /api/sources', () => {
  const testUserId = 'sources-test-user';
  const testEmail = 'sources-test@example.com';

  function createMockRequest(): NextRequest {
    return {
      nextUrl: new URL('http://localhost:3000/api/sources'),
    } as NextRequest;
  }

  beforeEach(async () => {
    // Clean up any existing test data
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

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test data
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
      // User might not exist if test failed
    }
  });

  describe('Success Cases', () => {
    it('should return empty array when user has no sources', async () => {
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should return user sources with metadata', async () => {
      // Create test sources
      await db.contentSource.createMany({
        data: [
          {
            userId: testUserId,
            type: 'YOUTUBE',
            sourceId: 'test-source-1',
            displayName: 'Test Channel 1',
            isMuted: false,
            alwaysSafe: false,
          },
          {
            userId: testUserId,
            type: 'YOUTUBE',
            sourceId: 'test-source-2',
            displayName: 'Test Channel 2',
            isMuted: true,
            alwaysSafe: true,
          },
        ],
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0]).toHaveProperty('id');
      expect(data.data[0]).toHaveProperty('type');
      expect(data.data[0]).toHaveProperty('displayName');
      expect(data.data[0]).toHaveProperty('isMuted');
      expect(data.data[0]).toHaveProperty('alwaysSafe');
      expect(data.data[0]).toHaveProperty('createdAt');
    });

    it('should include content count for each source', async () => {
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
      await db.contentItem.createMany({
        data: [
          {
            sourceType: 'YOUTUBE',
            sourceId: 'test-source-1',
            originalId: 'video-1',
            title: 'Video 1',
            url: 'https://youtube.com/watch?v=1',
            publishedAt: new Date(),
            fetchedAt: new Date(),
            lastSeenInFeed: new Date(),
          },
          {
            sourceType: 'YOUTUBE',
            sourceId: 'test-source-1',
            originalId: 'video-2',
            title: 'Video 2',
            url: 'https://youtube.com/watch?v=2',
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
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toHaveProperty('contentCount');
      expect(data.data[0].contentCount).toBe(2);
    });

    it('should only return sources for authenticated user', async () => {
      // Create source for test user
      await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-source-1',
          displayName: 'Test Channel',
          isMuted: false,
        },
      });

      // Create source for different user
      const otherUser = await db.user.create({
        data: {
          id: 'other-user',
          email: 'other@example.com',
          password: 'hashed-password',
        },
      });

      await db.contentSource.create({
        data: {
          userId: 'other-user',
          type: 'YOUTUBE',
          sourceId: 'test-source-2',
          displayName: 'Other Channel',
          isMuted: false,
        },
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].sourceId).toBe('test-source-1');

      // Cleanup other user
      await db.contentSource.deleteMany({ where: { userId: 'other-user' } });
      await db.user.delete({ where: { id: 'other-user' } });
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const authModule = await import('@/lib/auth');
      vi.mocked(authModule.auth).mockResolvedValueOnce(null as any);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);

      // Restore mock
      vi.mocked(authModule.auth).mockResolvedValue({
        user: { id: testUserId, email: testEmail }
      } as any);
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

describe('POST /api/sources', () => {
  const testUserId = 'sources-test-user';
  const testEmail = 'sources-test@example.com';

  function createMockRequest(body: any): NextRequest {
    return {
      nextUrl: new URL('http://localhost:3000/api/sources'),
      json: async () => body,
    } as NextRequest;
  }

  beforeEach(async () => {
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

    vi.clearAllMocks();
  });

  afterEach(async () => {
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
      // User might not exist if test failed
    }
  });

  describe('Success Cases', () => {
    it('should create a new YouTube source', async () => {
      mockResolveChannelId.mockResolvedValue('UC_test-channel');
      mockGetChannelInfo.mockResolvedValue({
        id: 'UC_test-channel',
        snippet: {
          title: 'Test Channel',
          description: 'Test Description',
          thumbnails: {
            default: { url: 'https://example.com/thumb.jpg' },
          },
        },
      });

      const request = createMockRequest({
        type: 'YOUTUBE',
        sourceId: 'test-channel',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.displayName).toBe('Test Channel');
      expect(data.data.sourceId).toBe('UC_test-channel');
      expect(data.data.type).toBe('YOUTUBE');

      // Verify it was saved to database
      const savedSource = await db.contentSource.findFirst({
        where: {
          userId: testUserId,
          sourceId: 'UC_test-channel',
        },
      });
      expect(savedSource).not.toBeNull();
      expect(savedSource?.displayName).toBe('Test Channel');
    });

    it('should accept optional displayName override', async () => {
      mockResolveChannelId.mockResolvedValue('UC_test-channel');
      mockGetChannelInfo.mockResolvedValue({
        id: 'UC_test-channel',
        snippet: {
          title: 'Original Name',
          description: 'Test Description',
          thumbnails: {
            default: { url: 'https://example.com/thumb.jpg' },
          },
        },
      });

      const request = createMockRequest({
        type: 'YOUTUBE',
        sourceId: 'test-channel',
        displayName: 'Custom Name',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.displayName).toBe('Custom Name');
    });
  });

  describe('Validation', () => {
    it('should require type field', async () => {
      const request = createMockRequest({
        sourceId: 'test-channel',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should require sourceId field', async () => {
      const request = createMockRequest({
        type: 'YOUTUBE',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should reject invalid source type', async () => {
      const request = createMockRequest({
        type: 'INVALID_TYPE',
        sourceId: 'test-channel',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should prevent duplicate sources', async () => {
      // Create existing source
      await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-source-duplicate',
          displayName: 'Existing Channel',
          isMuted: false,
        },
      });

      mockResolveChannelId.mockResolvedValue('test-source-duplicate');

      const request = createMockRequest({
        type: 'YOUTUBE',
        sourceId: 'duplicate',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already exists');
    });
  });

  describe('External API Errors', () => {
    it('should handle YouTube API failures gracefully', async () => {
      mockResolveChannelId.mockRejectedValue(new Error('YouTube API error'));

      const request = createMockRequest({
        type: 'YOUTUBE',
        sourceId: 'nonexistent-channel',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle invalid channel IDs', async () => {
      mockResolveChannelId.mockResolvedValue(null);

      const request = createMockRequest({
        type: 'YOUTUBE',
        sourceId: 'invalid',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const authModule = await import('@/lib/auth');
      vi.mocked(authModule.auth).mockResolvedValueOnce(null as any);

      const request = createMockRequest({
        type: 'YOUTUBE',
        sourceId: 'test-channel',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);

      // Restore mock
      vi.mocked(authModule.auth).mockResolvedValue({
        user: { id: testUserId, email: testEmail }
      } as any);
    });
  });

  describe('Response Format', () => {
    it('should return consistent success response format', async () => {
      mockResolveChannelId.mockResolvedValue('UC_test-channel');
      mockGetChannelInfo.mockResolvedValue({
        id: 'UC_test-channel',
        snippet: {
          title: 'Test Channel',
          description: 'Test Description',
          thumbnails: {
            default: { url: 'https://example.com/thumb.jpg' },
          },
        },
      });

      const request = createMockRequest({
        type: 'YOUTUBE',
        sourceId: 'test-channel',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.timestamp).toBe('string');
    });
  });
});

describe('DELETE /api/sources/[id]', () => {
  const testUserId = 'sources-test-user';
  const testEmail = 'sources-test@example.com';

  function createMockRequest(sourceId: string): NextRequest {
    return {
      nextUrl: new URL(`http://localhost:3000/api/sources/${sourceId}`),
    } as NextRequest;
  }

  beforeEach(async () => {
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

    vi.clearAllMocks();
  });

  afterEach(async () => {
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
    it('should delete an existing source', async () => {
      // Create source
      const source = await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-source-delete',
          displayName: 'Delete Me',
          isMuted: false,
        },
      });

      const request = createMockRequest(source.id);
      const response = await DELETE_SOURCE(request, { params: { id: source.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Source deleted');

      // Verify deletion
      const deletedSource = await db.contentSource.findUnique({
        where: { id: source.id },
      });
      expect(deletedSource).toBeNull();
    });

    it('should delete associated content items', async () => {
      // Create source
      const source = await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-source-with-content',
          displayName: 'Channel with Content',
          isMuted: false,
        },
      });

      // Create content items
      await db.contentItem.createMany({
        data: [
          {
            sourceType: 'YOUTUBE',
            sourceId: 'test-source-with-content',
            originalId: 'video-1',
            title: 'Video 1',
            url: 'https://youtube.com/watch?v=1',
            publishedAt: new Date(),
            fetchedAt: new Date(),
            lastSeenInFeed: new Date(),
          },
          {
            sourceType: 'YOUTUBE',
            sourceId: 'test-source-with-content',
            originalId: 'video-2',
            title: 'Video 2',
            url: 'https://youtube.com/watch?v=2',
            publishedAt: new Date(),
            fetchedAt: new Date(),
            lastSeenInFeed: new Date(),
          },
        ],
      });

      const request = createMockRequest(source.id);
      const response = await DELETE_SOURCE(request, { params: { id: source.id } });

      expect(response.status).toBe(200);

      // Verify content items were deleted
      const remainingContent = await db.contentItem.findMany({
        where: { sourceId: 'test-source-with-content' },
      });
      expect(remainingContent).toHaveLength(0);
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for nonexistent source', async () => {
      const request = createMockRequest('nonexistent-id');
      const response = await DELETE_SOURCE(request, { params: { id: 'nonexistent-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should prevent deleting other users sources', async () => {
      // Create source for different user
      const otherUser = await db.user.create({
        data: {
          id: 'other-user-delete',
          email: 'other-delete@example.com',
          password: 'hashed-password',
        },
      });

      const otherSource = await db.contentSource.create({
        data: {
          userId: 'other-user-delete',
          type: 'YOUTUBE',
          sourceId: 'test-source-other',
          displayName: 'Other User Source',
          isMuted: false,
        },
      });

      const request = createMockRequest(otherSource.id);
      const response = await DELETE_SOURCE(request, { params: { id: otherSource.id } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);

      // Verify source was not deleted
      const stillExists = await db.contentSource.findUnique({
        where: { id: otherSource.id },
      });
      expect(stillExists).not.toBeNull();

      // Cleanup
      await db.contentSource.delete({ where: { id: otherSource.id } });
      await db.user.delete({ where: { id: 'other-user-delete' } });
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const authModule = await import('@/lib/auth');
      vi.mocked(authModule.auth).mockResolvedValueOnce(null as any);

      const request = createMockRequest('some-id');
      const response = await DELETE_SOURCE(request, { params: { id: 'some-id' } });
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
