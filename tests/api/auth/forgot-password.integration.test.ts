/**
 * Integration tests for /app/api/auth/forgot-password
 * Tests actual HTTP request/response behavior with real database
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/forgot-password/route';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

// Mock email service to track email sending
vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));

describe('POST /api/auth/forgot-password', () => {
  const testEmail = 'forgot-password-test@example.com';
  const nonExistentEmail = 'nonexistent@example.com';
  const testPassword = 'TestPassword123!';
  let testUserId: string;
  let mockSendPasswordResetEmail: any;

  // Helper function to create a mock NextRequest
  function createMockRequest(body: unknown): NextRequest {
    return {
      json: async () => body,
    } as NextRequest;
  }

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get reference to mocked function
    const emailModule = await import('@/lib/email');
    mockSendPasswordResetEmail = emailModule.sendPasswordResetEmail;

    // Clean up any existing test user
    try {
      await db.user.delete({
        where: { email: testEmail },
      });
    } catch {
      // User doesn't exist yet, that's fine
    }

    // Create test user
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const user = await db.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up test user (cascade deletes tokens)
    if (testUserId) {
      try {
        await db.user.delete({
          where: { id: testUserId },
        });
      } catch {
        // User might not exist if test deleted it
      }
    }
  });

  describe('Success Cases', () => {
    it('should create reset token for existing user', async () => {
      const request = createMockRequest({
        email: testEmail,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('password reset link has been sent');

      // Verify token was created
      const tokens = await db.passwordResetToken.findMany({
        where: { userId: testUserId },
      });
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].used).toBe(false);
      expect(tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should send reset email for existing user', async () => {
      const request = createMockRequest({
        email: testEmail,
      });

      await POST(request);

      // Verify email was sent
      expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        testEmail,
        expect.stringContaining('token=')
      );
    });

    it('should generate unique tokens', async () => {
      // Request 1
      const request1 = createMockRequest({ email: testEmail });
      await POST(request1);

      // Request 2
      const request2 = createMockRequest({ email: testEmail });
      await POST(request2);

      // Verify two different tokens exist
      const tokens = await db.passwordResetToken.findMany({
        where: { userId: testUserId },
      });

      // Should have 2 tokens (first one invalidated, second one active)
      expect(tokens.length).toBe(2);
      expect(tokens[0].token).not.toBe(tokens[1].token);
    });

    it('should set token expiration to 1 hour', async () => {
      const beforeRequest = Date.now();
      const request = createMockRequest({ email: testEmail });
      await POST(request);
      const afterRequest = Date.now();

      const token = await db.passwordResetToken.findFirst({
        where: { userId: testUserId },
      });

      const oneHourInMs = 60 * 60 * 1000;
      const expectedExpiry = beforeRequest + oneHourInMs;
      const actualExpiry = token!.expiresAt.getTime();

      // Allow 1 second tolerance for test execution time
      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(actualExpiry).toBeLessThanOrEqual(afterRequest + oneHourInMs + 1000);
    });

    it('should invalidate previous unused tokens', async () => {
      // Create first token
      const request1 = createMockRequest({ email: testEmail });
      await POST(request1);

      const firstTokens = await db.passwordResetToken.findMany({
        where: { userId: testUserId, used: false },
      });
      expect(firstTokens.length).toBe(1);

      // Create second token
      const request2 = createMockRequest({ email: testEmail });
      await POST(request2);

      // Verify first token is now marked as used
      const allTokens = await db.passwordResetToken.findMany({
        where: { userId: testUserId },
        orderBy: { createdAt: 'asc' },
      });

      expect(allTokens.length).toBe(2);
      expect(allTokens[0].used).toBe(true); // First token invalidated
      expect(allTokens[1].used).toBe(false); // Second token active
    });
  });

  describe('Security - Email Enumeration Prevention', () => {
    it('should return same success message for non-existent email', async () => {
      const request = createMockRequest({
        email: nonExistentEmail,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('password reset link has been sent');
    });

    it('should not create token for non-existent user', async () => {
      const request = createMockRequest({
        email: nonExistentEmail,
      });

      await POST(request);

      // Verify no tokens were created
      const allTokens = await db.passwordResetToken.findMany();
      const nonExistentUserTokens = allTokens.filter(
        (t) => !t.userId || t.userId === 'non-existent'
      );
      expect(nonExistentUserTokens.length).toBe(0);
    });

    it('should not send email for non-existent user', async () => {
      const request = createMockRequest({
        email: nonExistentEmail,
      });

      await POST(request);

      // Should not send email
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should take similar time for existing and non-existent emails', async () => {
      // Test with existing email
      const start1 = Date.now();
      const request1 = createMockRequest({ email: testEmail });
      await POST(request1);
      const duration1 = Date.now() - start1;

      // Test with non-existent email
      const start2 = Date.now();
      const request2 = createMockRequest({ email: nonExistentEmail });
      await POST(request2);
      const duration2 = Date.now() - start2;

      // Durations should be similar (within 100ms)
      // This prevents timing attacks for email enumeration
      const diff = Math.abs(duration1 - duration2);
      expect(diff).toBeLessThan(100);
    });
  });

  describe('Validation Errors', () => {
    it('should reject missing email', async () => {
      const request = createMockRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Email is required');
    });

    it('should reject empty email', async () => {
      const request = createMockRequest({
        email: '',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject null email', async () => {
      const request = createMockRequest({
        email: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JSON', async () => {
      const request = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle email with whitespace', async () => {
      const emailWithSpaces = '  ' + testEmail + '  ';
      const request = createMockRequest({
        email: emailWithSpaces,
      });

      const response = await POST(request);
      const data = await response.json();

      // Current implementation doesn't trim, so this will be treated as non-existent
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should not send email for non-matching email
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should handle case-sensitive email matching', async () => {
      const uppercaseEmail = testEmail.toUpperCase();
      const request = createMockRequest({
        email: uppercaseEmail,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Database lookup is case-sensitive, so no email should be sent
      // unless the database has the uppercase version
      const user = await db.user.findUnique({
        where: { email: uppercaseEmail },
      });

      if (user) {
        expect(mockSendPasswordResetEmail).toHaveBeenCalled();
      } else {
        expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
      }
    });

    it('should handle email sending failure gracefully', async () => {
      // Mock email service to fail
      mockSendPasswordResetEmail.mockRejectedValueOnce(
        new Error('SMTP connection failed')
      );

      const request = createMockRequest({
        email: testEmail,
      });

      const response = await POST(request);

      // Should still return error even though email failed
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(100) + '@example.com';
      const request = createMockRequest({
        email: longEmail,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle special characters in email', async () => {
      const specialEmail = 'user+test@example.com';
      const request = createMockRequest({
        email: specialEmail,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Reset URL Generation', () => {
    it('should include token in reset URL', async () => {
      const request = createMockRequest({
        email: testEmail,
      });

      await POST(request);

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        testEmail,
        expect.stringMatching(/token=[a-f0-9]{64}/)
      );
    });

    it('should use NEXTAUTH_URL or localhost in reset URL', async () => {
      const request = createMockRequest({
        email: testEmail,
      });

      await POST(request);

      const resetUrl = mockSendPasswordResetEmail.mock.calls[0][1];
      expect(resetUrl).toMatch(/^https?:\/\//);
      expect(resetUrl).toContain('/reset-password?token=');
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests for same email', async () => {
      const requests = Array(3)
        .fill(null)
        .map(() => createMockRequest({ email: testEmail }));

      // Send all requests concurrently
      const responses = await Promise.all(requests.map((req) => POST(req)));

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Verify tokens were created
      const tokens = await db.passwordResetToken.findMany({
        where: { userId: testUserId },
      });

      expect(tokens.length).toBeGreaterThanOrEqual(3);

      // Due to race conditions, we may have 1-3 unused tokens
      // (invalidation happens before creation, so timing matters)
      const unusedTokens = tokens.filter((t) => !t.used);
      expect(unusedTokens.length).toBeGreaterThanOrEqual(1);
      expect(unusedTokens.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Response Format', () => {
    it('should return consistent success response format', async () => {
      const request = createMockRequest({
        email: testEmail,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.timestamp).toBe('string');
      expect(() => new Date(data.timestamp)).not.toThrow();
    });

    it('should return consistent error response format', async () => {
      const request = createMockRequest({
        email: '',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
      expect(data).toHaveProperty('timestamp');
    });

    it('should not expose user existence in response', async () => {
      const request = createMockRequest({
        email: nonExistentEmail,
      });

      const response = await POST(request);
      const data = await response.json();

      // Message should be vague and not reveal if user exists
      expect(data.data.message).toBe(
        'If an account exists with that email, a password reset link has been sent.'
      );
    });
  });
});
