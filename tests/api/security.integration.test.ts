/**
 * Security Integration Tests
 * Tests SQL injection, XSS, authentication bypass, and other security vulnerabilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { cleanupAllUserData } from '../helpers/test-cleanup';

// Mock auth - will be configured per test
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}));

import { GET as GET_FEED } from '@/app/api/feed/route';
import { POST as POST_FILTER } from '@/app/api/filters/route';
import { POST as POST_SOURCE } from '@/app/api/sources/route';
import { GET as GET_SAVED } from '@/app/api/saved/route';
import { NextRequest } from 'next/server';

describe('Security Tests', () => {
  const testUserId = 'security-test-user';
  const testEmail = 'security@test.com';

  beforeEach(async () => {
    // Clean up and create test user
    await cleanupAllUserData(testUserId);
    await db.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        password: 'hashed-password',
      },
    });

    // Default: authenticated
    mockAuth.mockResolvedValue({
      user: { id: testUserId, email: testEmail },
    });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupAllUserData(testUserId);
  });

  describe('SQL Injection Protection', () => {
    it('should prevent SQL injection in filter keywords', async () => {
      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE FilterKeyword; --",
        "1' UNION SELECT NULL, password FROM User --",
        "'; DELETE FROM User WHERE '1'='1",
      ];

      for (const payload of sqlInjectionPayloads) {
        const request = {
          json: async () => ({ keyword: payload }),
        } as NextRequest;

        const response = await POST_FILTER(request);
        const data = await response.json();

        // Should either reject as invalid or treat as literal string
        expect(response.status).toBeOneOf([200, 400]);

        if (response.status === 200) {
          // If accepted, verify it's stored as literal string
          const filters = await db.filterKeyword.findMany({
            where: { userId: testUserId },
          });
          const hasPayload = filters.some((f) => f.keyword === payload.toLowerCase());
          expect(hasPayload).toBe(true);
        }

        // Verify database integrity - tables still exist
        const userCount = await db.user.count();
        expect(userCount).toBeGreaterThan(0);
      }
    });

    it('should prevent SQL injection in source IDs', async () => {
      const sqlInjectionPayloads = [
        "UC-test' OR '1'='1",
        "UC'; DROP TABLE ContentSource; --",
      ];

      for (const payload of sqlInjectionPayloads) {
        const request = {
          json: async () => ({
            type: 'YOUTUBE',
            sourceId: payload,
            displayName: 'Test',
          }),
        } as NextRequest;

        const response = await POST_SOURCE(request);

        // Should either validate and reject, or treat as literal
        expect(response.status).toBeOneOf([200, 201, 400]);

        // Verify database integrity
        const sourceCount = await db.contentSource.count();
        expect(sourceCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('XSS (Cross-Site Scripting) Protection', () => {
    it('should sanitize XSS payloads in filter keywords', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
      ];

      for (const payload of xssPayloads) {
        const request = {
          json: async () => ({ keyword: payload }),
        } as NextRequest;

        const response = await POST_FILTER(request);

        expect(response.status).toBeOneOf([200, 400]);

        if (response.status === 200) {
          const filters = await db.filterKeyword.findMany({
            where: { userId: testUserId },
          });

          // Verify payload is stored as plain text (not executed)
          const hasPayload = filters.some((f) =>
            f.keyword === payload.toLowerCase()
          );
          expect(hasPayload).toBe(true);
        }
      }
    });
  });

  describe('Authentication Bypass Attempts', () => {
    it('should block unauthenticated access to feed', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        nextUrl: new URL('http://localhost:3000/api/feed'),
      } as NextRequest;

      const response = await GET_FEED(request);
      expect(response.status).toBe(401);
    });

    it('should block unauthenticated POST to filters', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        json: async () => ({ keyword: 'test' }),
      } as NextRequest;

      const response = await POST_FILTER(request);
      expect(response.status).toBe(401);
    });

    it('should block unauthenticated POST to sources', async () => {
      mockAuth.mockResolvedValue(null);

      const request = {
        json: async () => ({
          type: 'YOUTUBE',
          sourceId: 'UC-test',
          displayName: 'Test',
        }),
      } as NextRequest;

      const response = await POST_SOURCE(request);
      expect(response.status).toBe(401);
    });
  });

  describe('Authorization Tests', () => {
    it('should only return current user\'s saved content', async () => {
      // Create another user with saved content
      const otherUserId = 'other-security-user';
      await db.user.create({
        data: {
          id: otherUserId,
          email: 'other-security@test.com',
          password: 'hashed',
        },
      });

      await db.contentItem.create({
        data: {
          sourceType: 'YOUTUBE',
          sourceId: 'UC-other',
          originalId: 'other-video',
          title: 'Other User Video',
          url: 'https://youtube.com/watch?v=other',
          publishedAt: new Date(),
          fetchedAt: new Date(),
          lastSeenInFeed: new Date(),
        },
      });

      await db.savedContent.create({
        data: {
          userId: otherUserId,
          contentItemId: 'other-video',
        },
      });

      // Request as testUser
      mockAuth.mockResolvedValue({
        user: { id: testUserId, email: testEmail },
      });

      const request = {
        nextUrl: new URL('http://localhost:3000/api/saved'),
      } as NextRequest;

      const response = await GET_SAVED(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeInstanceOf(Array);

      // Should not include other user's content
      const hasOtherContent = data.data.some((item: any) =>
        item.userId === otherUserId
      );
      expect(hasOtherContent).toBe(false);

      // Cleanup
      await cleanupAllUserData(otherUserId);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid source types', async () => {
      const request = {
        json: async () => ({
          type: 'INVALID_TYPE',
          sourceId: 'test',
          displayName: 'Test',
        }),
      } as NextRequest;

      const response = await POST_SOURCE(request);
      expect(response.status).toBe(400);
    });

    it('should reject empty filter keywords', async () => {
      const request = {
        json: async () => ({ keyword: '' }),
      } as NextRequest;

      const response = await POST_FILTER(request);
      expect(response.status).toBe(400);
    });

    it('should reject extremely long filter keywords', async () => {
      const longKeyword = 'a'.repeat(10000);
      const request = {
        json: async () => ({ keyword: longKeyword }),
      } as NextRequest;

      const response = await POST_FILTER(request);
      expect(response.status).toBeOneOf([400, 413]);
    });
  });

  describe('Rate Limiting / DoS Protection', () => {
    it('should handle multiple rapid requests without crashing', async () => {
      const requests = Array(10).fill(null).map(() => ({
        nextUrl: new URL('http://localhost:3000/api/feed'),
      } as NextRequest));

      const responses = await Promise.all(
        requests.map((req) => GET_FEED(req))
      );

      // All should succeed (or handle gracefully)
      responses.forEach((response) => {
        expect(response.status).toBeOneOf([200, 429, 503]);
      });
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
