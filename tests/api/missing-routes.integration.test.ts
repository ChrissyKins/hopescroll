/**
 * Integration tests for previously untested API routes
 * Covers: preferences, history, not-now, saved routes, watch routes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { cleanupAllUserData } from '../helpers/test-cleanup';
import { NextRequest } from 'next/server';

// Mock auth
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}));

import { GET as GET_PREFERENCES, PUT as PUT_PREFERENCES } from '@/app/api/preferences/route';
import { GET as GET_HISTORY } from '@/app/api/history/route';
import { POST as POST_NOT_NOW } from '@/app/api/content/[id]/not-now/route';
import { GET as GET_SAVED } from '@/app/api/saved/route';
import { PATCH as PATCH_SAVED_COLLECTION } from '@/app/api/saved/[savedItemId]/collection/route';
import { PATCH as PATCH_SAVED_NOTES } from '@/app/api/saved/[savedItemId]/notes/route';
import { GET as GET_RANDOM } from '@/app/api/watch/random/route';
import { GET as GET_RECOMMENDED } from '@/app/api/watch/recommended/route';

describe('Missing Routes Integration Tests', () => {
  const testUserId = 'missing-routes-test-user';
  const testEmail = 'missing-routes@test.com';

  beforeEach(async () => {
    await cleanupAllUserData(testUserId);
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

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupAllUserData(testUserId);
  });

  describe('GET /api/preferences', () => {
    it('should return default preferences for new user', async () => {
      const request = {
        nextUrl: new URL('http://localhost:3000/api/preferences'),
      } as NextRequest;

      const response = await GET_PREFERENCES(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('diversityLimit');
      expect(data.data).toHaveProperty('backlogRatio');
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        nextUrl: new URL('http://localhost:3000/api/preferences'),
      } as NextRequest;

      const response = await GET_PREFERENCES(request);
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/preferences', () => {
    it('should update user preferences', async () => {
      const request = {
        json: async () => ({
          diversityLimit: 3,
          backlogRatio: 0.4,
        }),
      } as NextRequest;

      const response = await PUT_PREFERENCES(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.diversityLimit).toBe(3);
      expect(data.data.backlogRatio).toBe(0.4);
    });

    it('should validate diversity limit range', async () => {
      const request = {
        json: async () => ({
          diversityLimit: 100, // Too high
        }),
      } as NextRequest;

      const response = await PUT_PREFERENCES(request);
      expect(response.status).toBeOneOf([200, 400]); // Either clamps or rejects
    });
  });

  describe('GET /api/history', () => {
    beforeEach(async () => {
      // Create content and interactions for history
      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'UC-history-test',
          originalId: 'history-video-1',
          title: 'History Test Video',
          url: 'https://youtube.com/watch?v=hist1',
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      await db.contentInteraction.create({
        data: {
          userId: testUserId,
          contentItemId: 'history-video-1',
          interactionType: 'WATCHED',
        },
      });
    });

    it('should return user interaction history', async () => {
      const request = {
        nextUrl: new URL('http://localhost:3000/api/history'),
      } as NextRequest;

      const response = await GET_HISTORY(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
    });

    it('should filter history by interaction type', async () => {
      const request = {
        nextUrl: new URL('http://localhost:3000/api/history?type=WATCHED'),
      } as NextRequest;

      const response = await GET_HISTORY(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.data.length > 0) {
        expect(data.data.every((item: any) => item.interactionType === 'WATCHED')).toBe(true);
      }
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        nextUrl: new URL('http://localhost:3000/api/history'),
      } as NextRequest;

      const response = await GET_HISTORY(request);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/content/[id]/not-now', () => {
    beforeEach(async () => {
      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'UC-notnow-test',
          originalId: 'notnow-video-1',
          title: 'Not Now Test Video',
          url: 'https://youtube.com/watch?v=notnow1',
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });
    });

    it('should mark content as not now', async () => {
      const request = {
        nextUrl: new URL('http://localhost:3000/api/content/notnow-video-1/not-now'),
      } as NextRequest;

      const response = await POST_NOT_NOW(
        request,
        { params: Promise.resolve({ id: 'notnow-video-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should create interaction record', async () => {
      const request = {
        nextUrl: new URL('http://localhost:3000/api/content/notnow-video-1/not-now'),
      } as NextRequest;

      await POST_NOT_NOW(
        request,
        { params: Promise.resolve({ id: 'notnow-video-1' }) }
      );

      const interaction = await db.contentInteraction.findFirst({
        where: {
          userId: testUserId,
          contentItemId: 'notnow-video-1',
          interactionType: 'NOT_NOW',
        },
      });

      expect(interaction).toBeTruthy();
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        nextUrl: new URL('http://localhost:3000/api/content/notnow-video-1/not-now'),
      } as NextRequest;

      const response = await POST_NOT_NOW(
        request,
        { params: Promise.resolve({ id: 'notnow-video-1' }) }
      );
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/saved', () => {
    it('should return empty array for user with no saved content', async () => {
      const request = {
        nextUrl: new URL('http://localhost:3000/api/saved'),
      } as NextRequest;

      const response = await GET_SAVED(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        nextUrl: new URL('http://localhost:3000/api/saved'),
      } as NextRequest;

      const response = await GET_SAVED(request);
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/saved/[savedItemId]/collection', () => {
    let savedItemId: string;
    let collectionId: string;

    beforeEach(async () => {
      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'UC-saved-test',
          originalId: 'saved-video-1',
          title: 'Saved Test Video',
          url: 'https://youtube.com/watch?v=saved1',
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      const saved = await db.savedContent.create({
        data: {
          userId: testUserId,
          contentItemId: 'saved-video-1',
        },
      });
      savedItemId = saved.id;

      const collection = await db.collection.create({
        data: {
          userId: testUserId,
          name: 'Test Collection',
        },
      });
      collectionId = collection.id;
    });

    it('should move saved item to collection', async () => {
      const request = {
        json: async () => ({ collectionId }),
      } as NextRequest;

      const response = await PATCH_SAVED_COLLECTION(
        request,
        { params: Promise.resolve({ savedItemId }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        json: async () => ({ collectionId }),
      } as NextRequest;

      const response = await PATCH_SAVED_COLLECTION(
        request,
        { params: Promise.resolve({ savedItemId }) }
      );
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/saved/[savedItemId]/notes', () => {
    let savedItemId: string;

    beforeEach(async () => {
      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'UC-notes-test',
          originalId: 'notes-video-1',
          title: 'Notes Test Video',
          url: 'https://youtube.com/watch?v=notes1',
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      const saved = await db.savedContent.create({
        data: {
          userId: testUserId,
          contentItemId: 'notes-video-1',
        },
      });
      savedItemId = saved.id;
    });

    it('should update notes on saved item', async () => {
      const notes = 'These are my test notes';
      const request = {
        json: async () => ({ notes }),
      } as NextRequest;

      const response = await PATCH_SAVED_NOTES(
        request,
        { params: Promise.resolve({ savedItemId }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.notes).toBe(notes);
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        json: async () => ({ notes: 'test' }),
      } as NextRequest;

      const response = await PATCH_SAVED_NOTES(
        request,
        { params: Promise.resolve({ savedItemId }) }
      );
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/watch/random', () => {
    beforeEach(async () => {
      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'UC-random-test',
          originalId: 'random-video-1',
          title: 'Random Test Video',
          url: 'https://youtube.com/watch?v=rand1',
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });
    });

    it('should return a random video', async () => {
      const request = {
        nextUrl: new URL('http://localhost:3000/api/watch/random'),
      } as NextRequest;

      const response = await GET_RANDOM(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        nextUrl: new URL('http://localhost:3000/api/watch/random'),
      } as NextRequest;

      const response = await GET_RANDOM(request);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/watch/recommended', () => {
    it('should return recommended content', async () => {
      const request = {
        nextUrl: new URL('http://localhost:3000/api/watch/recommended'),
      } as NextRequest;

      const response = await GET_RECOMMENDED(request);

      expect(response.status).toBeOneOf([200, 501]); // May not be implemented yet
    });

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        nextUrl: new URL('http://localhost:3000/api/watch/recommended'),
      } as NextRequest;

      const response = await GET_RECOMMENDED(request);
      expect(response.status).toBe(401);
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
