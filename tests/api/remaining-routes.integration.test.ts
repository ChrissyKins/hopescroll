/**
 * Integration tests for the final 4 untested API routes
 * Covers: cron job, debug routes, source CRUD, manual fetch
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { cleanupAllUserData, cleanupTestContent } from '../helpers/test-cleanup';
import { NextRequest } from 'next/server';

// Mock auth
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}));

// Mock adapters for source tests
const mockGetChannel = vi.fn();
const mockResolveChannelId = vi.fn();
const mockSearchChannelVideos = vi.fn();
const mockGetVideos = vi.fn();

vi.mock('@/adapters/content/youtube/youtube-client', () => ({
  YouTubeClient: vi.fn().mockImplementation(() => ({
    getChannel: mockGetChannel,
    resolveChannelId: mockResolveChannelId,
    searchChannelVideos: mockSearchChannelVideos,
    getVideos: mockGetVideos,
  })),
}));

import { GET as GET_CRON } from '@/app/api/cron/fetch-content/route';
import { POST as POST_CLEAR_INTERACTIONS } from '@/app/api/debug/clear-interactions/route';
import { GET as GET_DEBUG_FEED } from '@/app/api/debug/feed/route';
import { GET as GET_SOURCE, PATCH as PATCH_SOURCE, DELETE as DELETE_SOURCE } from '@/app/api/sources/[id]/route';
import { POST as POST_FETCH } from '@/app/api/sources/fetch/route';

describe('Remaining Routes Integration Tests', () => {
  const testUserId = 'remaining-routes-test-user';
  const testEmail = 'remaining-routes@test.com';

  beforeEach(async () => {
    await cleanupAllUserData(testUserId);
    await cleanupTestContent('test-remaining-');

    await db.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        password: 'hashed-password',
      },
    });

    mockAuth.mockResolvedValue({
      user: { id: testUserId, email: testEmail },
    });

    // Setup YouTube mocks
    mockGetChannel.mockResolvedValue({
      id: 'UC-test-channel',
      title: 'Test Channel',
      description: 'Test Description',
      customUrl: '@testchannel',
      thumbnails: {
        high: { url: 'https://example.com/thumb.jpg' },
      },
    });

    mockResolveChannelId.mockResolvedValue('UC-test-channel');
    mockSearchChannelVideos.mockResolvedValue({ items: [] });
    mockGetVideos.mockResolvedValue({ items: [] });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupAllUserData(testUserId);
    await cleanupTestContent('test-remaining-');
  });

  describe('GET /api/cron/fetch-content', () => {
    it('should require CRON_SECRET if configured', async () => {
      const originalSecret = process.env.CRON_SECRET;
      process.env.CRON_SECRET = 'test-secret';

      const request = {
        headers: new Headers(),
        nextUrl: new URL('http://localhost:3000/api/cron/fetch-content'),
      } as NextRequest;

      const response = await GET_CRON(request);
      expect(response.status).toBe(401);

      process.env.CRON_SECRET = originalSecret;
    });

    it('should accept request with valid CRON_SECRET', async () => {
      const originalSecret = process.env.CRON_SECRET;
      process.env.CRON_SECRET = 'test-secret';

      const headers = new Headers();
      headers.set('authorization', 'Bearer test-secret');

      const request = {
        headers,
        nextUrl: new URL('http://localhost:3000/api/cron/fetch-content'),
      } as NextRequest;

      const response = await GET_CRON(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('stats');

      process.env.CRON_SECRET = originalSecret;
    });

    it('should work without CRON_SECRET if not configured', async () => {
      const originalSecret = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;

      const request = {
        headers: new Headers(),
        nextUrl: new URL('http://localhost:3000/api/cron/fetch-content'),
      } as NextRequest;

      const response = await GET_CRON(request);
      expect(response.status).toBe(200);

      process.env.CRON_SECRET = originalSecret;
    });

    it('should return fetch statistics', async () => {
      const originalSecret = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;

      const request = {
        headers: new Headers(),
        nextUrl: new URL('http://localhost:3000/api/cron/fetch-content'),
      } as NextRequest;

      const response = await GET_CRON(request);
      const data = await response.json();

      expect(data.data.stats).toHaveProperty('totalSources');
      expect(data.data.stats).toHaveProperty('successCount');
      expect(data.data.stats).toHaveProperty('errorCount');

      process.env.CRON_SECRET = originalSecret;
    });
  });

  describe('POST /api/debug/clear-interactions', () => {
    beforeEach(async () => {
      // Create test content and interaction
      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'test-remaining-source',
          originalId: 'test-remaining-video',
          title: 'Test Video',
          url: 'https://youtube.com/watch?v=test',
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      await db.contentInteraction.create({
        data: {
          userId: testUserId,
          contentItemId: 'test-remaining-video',
          interactionType: 'WATCHED',
        },
      });
    });

    it('should clear all user interactions', async () => {
      const request = {
        nextUrl: new URL('http://localhost:3000/api/debug/clear-interactions'),
      } as NextRequest;

      const response = await POST_CLEAR_INTERACTIONS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deletedCount).toBeGreaterThan(0);

      // Verify interactions were deleted
      const remaining = await db.contentInteraction.count({
        where: { userId: testUserId },
      });
      expect(remaining).toBe(0);
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        nextUrl: new URL('http://localhost:3000/api/debug/clear-interactions'),
      } as NextRequest;

      const response = await POST_CLEAR_INTERACTIONS(request);
      expect(response.status).toBe(401);
    });

    it('should only delete current user interactions', async () => {
      // Create another user with interaction
      const otherUserId = 'other-debug-user';
      await db.user.create({
        data: {
          id: otherUserId,
          email: 'other-debug@test.com',
          password: 'hashed',
        },
      });

      await db.contentInteraction.create({
        data: {
          userId: otherUserId,
          contentItemId: 'test-remaining-video',
          interactionType: 'WATCHED',
        },
      });

      const request = {
        nextUrl: new URL('http://localhost:3000/api/debug/clear-interactions'),
      } as NextRequest;

      await POST_CLEAR_INTERACTIONS(request);

      // Other user's interactions should still exist
      const otherInteractions = await db.contentInteraction.count({
        where: { userId: otherUserId },
      });
      expect(otherInteractions).toBe(1);

      await cleanupAllUserData(otherUserId);
    });
  });

  describe('GET /api/debug/feed', () => {
    beforeEach(async () => {
      // Create test data for debug endpoint
      await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-remaining-source',
          displayName: 'Test Source',
        },
      });

      await db.filterKeyword.create({
        data: {
          userId: testUserId,
          keyword: 'test-filter',
        },
      });
    });

    it('should return debug information', async () => {
      const request = {
        nextUrl: new URL('http://localhost:3000/api/debug/feed'),
      } as NextRequest;

      const response = await GET_DEBUG_FEED(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('contentCount');
      expect(data.data).toHaveProperty('content');
      expect(data.data).toHaveProperty('sources');
      expect(data.data).toHaveProperty('filters');
      expect(data.data).toHaveProperty('interactions');
      expect(data.data).toHaveProperty('preferences');
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        nextUrl: new URL('http://localhost:3000/api/debug/feed'),
      } as NextRequest;

      const response = await GET_DEBUG_FEED(request);
      expect(response.status).toBe(401);
    });

    it('should return user-specific data', async () => {
      const request = {
        nextUrl: new URL('http://localhost:3000/api/debug/feed'),
      } as NextRequest;

      const response = await GET_DEBUG_FEED(request);
      const data = await response.json();

      expect(data.data.sources).toBeInstanceOf(Array);
      expect(data.data.filters).toBeInstanceOf(Array);

      if (data.data.sources.length > 0) {
        expect(data.data.sources[0]).toHaveProperty('displayName');
      }
    });
  });

  describe('GET /api/sources/[id]', () => {
    let sourceId: string;

    beforeEach(async () => {
      const source = await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-remaining-source-id',
          displayName: 'Test Source',
        },
      });
      sourceId = source.id;
    });

    it('should return source details', async () => {
      const request = {
        nextUrl: new URL(`http://localhost:3000/api/sources/${sourceId}`),
      } as NextRequest;

      const response = await GET_SOURCE(
        request,
        { params: Promise.resolve({ id: sourceId }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(sourceId);
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        nextUrl: new URL(`http://localhost:3000/api/sources/${sourceId}`),
      } as NextRequest;

      const response = await GET_SOURCE(
        request,
        { params: Promise.resolve({ id: sourceId }) }
      );
      expect(response.status).toBe(401);
    });

    it('should not allow access to other user sources', async () => {
      // Create source for different user
      const otherUserId = 'other-source-user';
      await db.user.create({
        data: {
          id: otherUserId,
          email: 'other-source@test.com',
          password: 'hashed',
        },
      });

      const otherSource = await db.contentSource.create({
        data: {
          userId: otherUserId,
          type: 'YOUTUBE',
          sourceId: 'other-source-id',
          displayName: 'Other Source',
        },
      });

      const request = {
        nextUrl: new URL(`http://localhost:3000/api/sources/${otherSource.id}`),
      } as NextRequest;

      const response = await GET_SOURCE(
        request,
        { params: Promise.resolve({ id: otherSource.id }) }
      );

      expect(response.status).toBeOneOf([403, 404]);

      await cleanupAllUserData(otherUserId);
    });
  });

  describe('PATCH /api/sources/[id]', () => {
    let sourceId: string;

    beforeEach(async () => {
      const source = await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-remaining-patch-id',
          displayName: 'Test Source',
        },
      });
      sourceId = source.id;
    });

    it('should update source', async () => {
      const request = {
        json: async () => ({
          displayName: 'Updated Name',
          isMuted: true,
        }),
      } as NextRequest;

      const response = await PATCH_SOURCE(
        request,
        { params: Promise.resolve({ id: sourceId }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const updated = await db.contentSource.findUnique({
        where: { id: sourceId },
      });
      expect(updated?.displayName).toBe('Updated Name');
      expect(updated?.isMuted).toBe(true);
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        json: async () => ({ displayName: 'Updated' }),
      } as NextRequest;

      const response = await PATCH_SOURCE(
        request,
        { params: Promise.resolve({ id: sourceId }) }
      );
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/sources/[id]', () => {
    let sourceId: string;

    beforeEach(async () => {
      const source = await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-remaining-delete-id',
          displayName: 'Test Source',
        },
      });
      sourceId = source.id;
    });

    it('should delete source', async () => {
      const request = {
        nextUrl: new URL(`http://localhost:3000/api/sources/${sourceId}`),
      } as NextRequest;

      const response = await DELETE_SOURCE(
        request,
        { params: Promise.resolve({ id: sourceId }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const deleted = await db.contentSource.findUnique({
        where: { id: sourceId },
      });
      expect(deleted).toBeNull();
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        nextUrl: new URL(`http://localhost:3000/api/sources/${sourceId}`),
      } as NextRequest;

      const response = await DELETE_SOURCE(
        request,
        { params: Promise.resolve({ id: sourceId }) }
      );
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/sources/fetch', () => {
    beforeEach(async () => {
      await db.contentSource.create({
        data: {
          userId: testUserId,
          type: 'YOUTUBE',
          sourceId: 'test-remaining-fetch-id',
          displayName: 'Test Source',
        },
      });
    });

    it('should trigger manual fetch for user sources', async () => {
      const request = {
        nextUrl: new URL('http://localhost:3000/api/sources/fetch'),
      } as NextRequest;

      const response = await POST_FETCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('stats');
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        nextUrl: new URL('http://localhost:3000/api/sources/fetch'),
      } as NextRequest;

      const response = await POST_FETCH(request);
      expect(response.status).toBe(401);
    });

    it('should return fetch statistics', async () => {
      const request = {
        nextUrl: new URL('http://localhost:3000/api/sources/fetch'),
      } as NextRequest;

      const response = await POST_FETCH(request);
      const data = await response.json();

      expect(data.data.stats).toHaveProperty('totalSources');
      expect(data.data.stats).toHaveProperty('successCount');
      expect(data.data.stats).toHaveProperty('errorCount');
    });
  });
});

// Custom matcher
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of ${expected.join(', ')}`
          : `expected ${received} to be one of ${expected.join(', ')}`,
    };
  },
});
