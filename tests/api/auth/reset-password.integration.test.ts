/**
 * Integration tests for /app/api/auth/reset-password
 * Tests actual HTTP request/response behavior with real database
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/reset-password/route';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

// Mock email service to prevent actual email sending during tests
vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));

describe('POST /api/auth/reset-password', () => {
  const testEmail = 'reset-password-test@example.com';
  const oldPassword = 'OldPassword123!';
  const newPassword = 'NewPassword456!';
  let testUserId: string;
  let validToken: string;
  let expiredToken: string;
  let usedToken: string;

  // Helper function to create a mock NextRequest
  function createMockRequest(body: unknown): NextRequest {
    return {
      json: async () => body,
    } as NextRequest;
  }

  beforeEach(async () => {
    // Clean up any existing test user
    const existingUser = await db.user.findUnique({
      where: { email: testEmail },
    });
    if (existingUser) {
      await db.user.delete({
        where: { email: testEmail },
      });
    }

    // Create test user
    const hashedPassword = await bcrypt.hash(oldPassword, 10);
    const user = await db.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
      },
    });
    testUserId = user.id;

    // Create valid token
    validToken = crypto.randomBytes(32).toString('hex');
    await db.passwordResetToken.create({
      data: {
        userId: testUserId,
        token: validToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      },
    });

    // Create expired token
    expiredToken = crypto.randomBytes(32).toString('hex');
    await db.passwordResetToken.create({
      data: {
        userId: testUserId,
        token: expiredToken,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      },
    });

    // Create used token
    usedToken = crypto.randomBytes(32).toString('hex');
    await db.passwordResetToken.create({
      data: {
        userId: testUserId,
        token: usedToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        used: true,
      },
    });
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
    it('should reset password with valid token', async () => {
      const request = createMockRequest({
        token: validToken,
        password: newPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('Password has been reset successfully');

      // Verify password was updated
      const user = await db.user.findUnique({
        where: { id: testUserId },
      });
      const isNewPasswordValid = await bcrypt.compare(newPassword, user!.password);
      expect(isNewPasswordValid).toBe(true);

      // Verify old password no longer works
      const isOldPasswordValid = await bcrypt.compare(oldPassword, user!.password);
      expect(isOldPasswordValid).toBe(false);
    });

    it('should mark token as used after successful reset', async () => {
      const request = createMockRequest({
        token: validToken,
        password: newPassword,
      });

      await POST(request);

      // Verify token is marked as used
      const resetToken = await db.passwordResetToken.findUnique({
        where: { token: validToken },
      });
      expect(resetToken?.used).toBe(true);
    });

    it('should accept password with special characters', async () => {
      const complexPassword = 'C0mpl3x!@#$%^&*()';
      const request = createMockRequest({
        token: validToken,
        password: complexPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify password works
      const user = await db.user.findUnique({
        where: { id: testUserId },
      });
      const isPasswordValid = await bcrypt.compare(complexPassword, user!.password);
      expect(isPasswordValid).toBe(true);
    });

    it('should work with minimum valid password (8 characters)', async () => {
      const minPassword = '12345678';
      const request = createMockRequest({
        token: validToken,
        password: minPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Validation Errors', () => {
    it('should reject missing token', async () => {
      const request = createMockRequest({
        password: newPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Token and password are required');
    });

    it('should reject missing password', async () => {
      const request = createMockRequest({
        token: validToken,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Token and password are required');
    });

    it('should reject empty token', async () => {
      const request = createMockRequest({
        token: '',
        password: newPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject empty password', async () => {
      const request = createMockRequest({
        token: validToken,
        password: '',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject password shorter than 8 characters', async () => {
      const request = createMockRequest({
        token: validToken,
        password: 'Short1!',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Password must be at least 8 characters');
    });

    it('should reject invalid token', async () => {
      const invalidToken = crypto.randomBytes(32).toString('hex');
      const request = createMockRequest({
        token: invalidToken,
        password: newPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Invalid or expired reset token');
    });

    it('should reject expired token', async () => {
      const request = createMockRequest({
        token: expiredToken,
        password: newPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('This reset token has expired');
    });

    it('should reject already used token', async () => {
      const request = createMockRequest({
        token: usedToken,
        password: newPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('This reset token has already been used');
    });

    it('should not allow reusing a token after successful reset', async () => {
      // First reset - should succeed
      const request1 = createMockRequest({
        token: validToken,
        password: newPassword,
      });
      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Try to use same token again - should fail
      const request2 = createMockRequest({
        token: validToken,
        password: 'AnotherPassword123!',
      });
      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(400);
      expect(data2.success).toBe(false);
      expect(data2.error.message).toBe('This reset token has already been used');
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

    it('should handle null token', async () => {
      const request = createMockRequest({
        token: null,
        password: newPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle null password', async () => {
      const request = createMockRequest({
        token: validToken,
        password: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept very long password', async () => {
      const longPassword = 'a'.repeat(100) + '1!';
      const request = createMockRequest({
        token: validToken,
        password: longPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle token that expires during reset (race condition)', async () => {
      // Create token that expires in 50ms
      const shortLivedToken = crypto.randomBytes(32).toString('hex');
      await db.passwordResetToken.create({
        data: {
          userId: testUserId,
          token: shortLivedToken,
          expiresAt: new Date(Date.now() + 50),
        },
      });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      const request = createMockRequest({
        token: shortLivedToken,
        password: newPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('This reset token has expired');
    });
  });

  describe('Transaction Integrity', () => {
    it('should update password and mark token as used atomically', async () => {
      const request = createMockRequest({
        token: validToken,
        password: newPassword,
      });

      await POST(request);

      // Verify both operations completed
      const user = await db.user.findUnique({
        where: { id: testUserId },
      });
      const token = await db.passwordResetToken.findUnique({
        where: { token: validToken },
      });

      const isPasswordUpdated = await bcrypt.compare(newPassword, user!.password);
      expect(isPasswordUpdated).toBe(true);
      expect(token?.used).toBe(true);
    });
  });

  describe('Response Format', () => {
    it('should return consistent success response format', async () => {
      const request = createMockRequest({
        token: validToken,
        password: newPassword,
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
        token: expiredToken,
        password: newPassword,
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

    it('should not expose sensitive information in error messages', async () => {
      const invalidToken = crypto.randomBytes(32).toString('hex');
      const request = createMockRequest({
        token: invalidToken,
        password: newPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      // Should not reveal if user exists or if token format is wrong
      expect(data.error.message).not.toContain('user');
      expect(data.error.message).not.toContain('User');
      expect(data.error.message).not.toContain('database');
    });
  });
});
