/**
 * Integration tests for /app/api/filters
 * Tests actual HTTP request/response behavior with real database
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/filters/route';
import { DELETE as DELETE_FILTER } from '@/app/api/filters/[id]/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

// Mock auth to return a test user
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'filters-test-user', email: 'filters-test@example.com' }
  })
}));

describe('GET /api/filters', () => {
  const testUserId = 'filters-test-user';
  const testEmail = 'filters-test@example.com';

  function createMockRequest(): NextRequest {
    return {
      nextUrl: new URL('http://localhost:3000/api/filters'),
    } as NextRequest;
  }

  beforeEach(async () => {
    // Clean up existing test data
    await db.filterKeyword.deleteMany({ where: { userId: testUserId } });
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

    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test data
    await db.filterKeyword.deleteMany({ where: { userId: testUserId } });
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
    it('should return empty filters when user has none', async () => {
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.keywords).toEqual([]);
      expect(data.data.preferences).toEqual({
        minDuration: null,
        maxDuration: null,
      });
    });

    it('should return user filter keywords', async () => {
      // Create filter keywords
      await db.filterKeyword.createMany({
        data: [
          {
            userId: testUserId,
            keyword: 'politics',
            isWildcard: false,
          },
          {
            userId: testUserId,
            keyword: 'drama*',
            isWildcard: true,
          },
          {
            userId: testUserId,
            keyword: 'news',
            isWildcard: false,
          },
        ],
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.keywords).toHaveLength(3);

      const keywords = data.data.keywords;
      expect(keywords.some((k: any) => k.keyword === 'politics')).toBe(true);
      expect(keywords.some((k: any) => k.keyword === 'drama*')).toBe(true);
      expect(keywords.some((k: any) => k.keyword === 'news')).toBe(true);

      const wildcard = keywords.find((k: any) => k.keyword === 'drama*');
      expect(wildcard.isWildcard).toBe(true);
    });

    it('should return user duration preferences', async () => {
      // Create user preferences
      await db.userPreferences.create({
        data: {
          userId: testUserId,
          minDuration: 300, // 5 minutes
          maxDuration: 900, // 15 minutes
        },
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.preferences).toEqual({
        minDuration: 300,
        maxDuration: 900,
      });
    });

    it('should combine keywords and preferences', async () => {
      await db.filterKeyword.create({
        data: {
          userId: testUserId,
          keyword: 'sports',
          isWildcard: false,
        },
      });

      await db.userPreferences.create({
        data: {
          userId: testUserId,
          minDuration: 600,
          maxDuration: 1200,
        },
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.keywords).toHaveLength(1);
      expect(data.data.preferences.minDuration).toBe(600);
      expect(data.data.preferences.maxDuration).toBe(1200);
    });

    it('should only return filters for authenticated user', async () => {
      // Create filter for test user
      await db.filterKeyword.create({
        data: {
          userId: testUserId,
          keyword: 'my-filter',
          isWildcard: false,
        },
      });

      // Create filter for different user
      const otherUser = await db.user.create({
        data: {
          id: 'other-user',
          email: 'other@example.com',
          password: 'hashed-password',
        },
      });

      await db.filterKeyword.create({
        data: {
          userId: 'other-user',
          keyword: 'other-filter',
          isWildcard: false,
        },
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.keywords).toHaveLength(1);
      expect(data.data.keywords[0].keyword).toBe('my-filter');

      // Cleanup
      await db.filterKeyword.deleteMany({ where: { userId: 'other-user' } });
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
      expect(data.data).toHaveProperty('keywords');
      expect(data.data).toHaveProperty('preferences');
      expect(typeof data.timestamp).toBe('string');
    });
  });
});

describe('POST /api/filters', () => {
  const testUserId = 'filters-test-user';
  const testEmail = 'filters-test@example.com';

  function createMockRequest(body: any): NextRequest {
    return {
      nextUrl: new URL('http://localhost:3000/api/filters'),
      json: async () => body,
    } as NextRequest;
  }

  beforeEach(async () => {
    await db.filterKeyword.deleteMany({ where: { userId: testUserId } });
    await db.userPreferences.deleteMany({ where: { userId: testUserId } });

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
    await db.filterKeyword.deleteMany({ where: { userId: testUserId } });
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
    it('should create a new filter keyword', async () => {
      const request = createMockRequest({
        keyword: 'politics',
        isWildcard: false,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.keyword).toBe('politics');
      expect(data.data.isWildcard).toBe(false);

      // Verify it was saved to database
      const saved = await db.filterKeyword.findFirst({
        where: {
          userId: testUserId,
          keyword: 'politics',
        },
      });
      expect(saved).not.toBeNull();
    });

    it('should create wildcard filter', async () => {
      const request = createMockRequest({
        keyword: 'drama*',
        isWildcard: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.keyword).toBe('drama*');
      expect(data.data.isWildcard).toBe(true);
    });

    it('should trim whitespace from keywords', async () => {
      const request = createMockRequest({
        keyword: '  news  ',
        isWildcard: false,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.keyword).toBe('news');
    });

    it('should normalize keywords to lowercase', async () => {
      const request = createMockRequest({
        keyword: 'SPORTS',
        isWildcard: false,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.keyword).toBe('sports');
    });
  });

  describe('Validation', () => {
    it('should require keyword field', async () => {
      const request = createMockRequest({
        isWildcard: false,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should require isWildcard field', async () => {
      const request = createMockRequest({
        keyword: 'test',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject empty keyword', async () => {
      const request = createMockRequest({
        keyword: '',
        isWildcard: false,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject whitespace-only keyword', async () => {
      const request = createMockRequest({
        keyword: '   ',
        isWildcard: false,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject invalid isWildcard type', async () => {
      const request = createMockRequest({
        keyword: 'test',
        isWildcard: 'not-a-boolean',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should prevent duplicate keywords', async () => {
      // Create existing filter
      await db.filterKeyword.create({
        data: {
          userId: testUserId,
          keyword: 'duplicate',
          isWildcard: false,
        },
      });

      const request = createMockRequest({
        keyword: 'duplicate',
        isWildcard: false,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('already exists');
    });

    it('should allow same keyword for different users', async () => {
      // Create filter for different user
      const otherUser = await db.user.create({
        data: {
          id: 'other-user',
          email: 'other@example.com',
          password: 'hashed-password',
        },
      });

      await db.filterKeyword.create({
        data: {
          userId: 'other-user',
          keyword: 'shared',
          isWildcard: false,
        },
      });

      // Test user should be able to create same keyword
      const request = createMockRequest({
        keyword: 'shared',
        isWildcard: false,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);

      // Cleanup
      await db.filterKeyword.deleteMany({ where: { userId: 'other-user' } });
      await db.user.delete({ where: { id: 'other-user' } });
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const authModule = await import('@/lib/auth');
      vi.mocked(authModule.auth).mockResolvedValueOnce(null as any);

      const request = createMockRequest({
        keyword: 'test',
        isWildcard: false,
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
      const request = createMockRequest({
        keyword: 'test',
        isWildcard: false,
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

describe('DELETE /api/filters/[id]', () => {
  const testUserId = 'filters-test-user';
  const testEmail = 'filters-test@example.com';

  function createMockRequest(filterId: string): NextRequest {
    return {
      nextUrl: new URL(`http://localhost:3000/api/filters/${filterId}`),
    } as NextRequest;
  }

  beforeEach(async () => {
    await db.filterKeyword.deleteMany({ where: { userId: testUserId } });
    await db.userPreferences.deleteMany({ where: { userId: testUserId } });

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
    await db.filterKeyword.deleteMany({ where: { userId: testUserId } });
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
    it('should delete an existing filter', async () => {
      // Create filter
      const filter = await db.filterKeyword.create({
        data: {
          userId: testUserId,
          keyword: 'delete-me',
          isWildcard: false,
        },
      });

      const request = createMockRequest(filter.id);
      const response = await DELETE_FILTER(request, { params: { id: filter.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Filter removed');

      // Verify deletion
      const deleted = await db.filterKeyword.findUnique({
        where: { id: filter.id },
      });
      expect(deleted).toBeNull();
    });

    it('should delete wildcard filter', async () => {
      const filter = await db.filterKeyword.create({
        data: {
          userId: testUserId,
          keyword: 'wildcard*',
          isWildcard: true,
        },
      });

      const request = createMockRequest(filter.id);
      const response = await DELETE_FILTER(request, { params: { id: filter.id } });

      expect(response.status).toBe(200);

      const deleted = await db.filterKeyword.findUnique({
        where: { id: filter.id },
      });
      expect(deleted).toBeNull();
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for nonexistent filter', async () => {
      const request = createMockRequest('nonexistent-id');
      const response = await DELETE_FILTER(request, { params: { id: 'nonexistent-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('not found');
    });

    it('should prevent deleting other users filters', async () => {
      // Create filter for different user
      const otherUser = await db.user.create({
        data: {
          id: 'other-user-filter',
          email: 'other-filter@example.com',
          password: 'hashed-password',
        },
      });

      const otherFilter = await db.filterKeyword.create({
        data: {
          userId: 'other-user-filter',
          keyword: 'other-filter',
          isWildcard: false,
        },
      });

      const request = createMockRequest(otherFilter.id);
      const response = await DELETE_FILTER(request, { params: { id: otherFilter.id } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);

      // Verify filter was not deleted
      const stillExists = await db.filterKeyword.findUnique({
        where: { id: otherFilter.id },
      });
      expect(stillExists).not.toBeNull();

      // Cleanup
      await db.filterKeyword.delete({ where: { id: otherFilter.id } });
      await db.user.delete({ where: { id: 'other-user-filter' } });
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const authModule = await import('@/lib/auth');
      vi.mocked(authModule.auth).mockResolvedValueOnce(null as any);

      const request = createMockRequest('some-id');
      const response = await DELETE_FILTER(request, { params: { id: 'some-id' } });
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
      const filter = await db.filterKeyword.create({
        data: {
          userId: testUserId,
          keyword: 'test',
          isWildcard: false,
        },
      });

      const request = createMockRequest(filter.id);
      const response = await DELETE_FILTER(request, { params: { id: filter.id } });
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.timestamp).toBe('string');
    });
  });
});
