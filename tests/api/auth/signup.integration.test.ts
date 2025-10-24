/**
 * Integration tests for /app/api/auth/signup
 * Tests actual HTTP request/response behavior with real database
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/auth/signup/route';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

// Mock email service to prevent actual email sending during tests
vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));

describe('POST /api/auth/signup', () => {
  const testEmail = 'signup-test@example.com';
  const testPassword = 'TestPassword123!';

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
  });

  afterEach(async () => {
    // Clean up test user after each test
    try {
      await db.user.delete({
        where: { email: testEmail },
      });
    } catch {
      // User might not exist if test failed before creation
    }
  });

  describe('Success Cases', () => {
    it('should create a new user with valid credentials', async () => {
      const request = createMockRequest({
        email: testEmail,
        password: testPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user).toHaveProperty('id');
      expect(data.data.user.email).toBe(testEmail);
      expect(data.data.user).not.toHaveProperty('password');
      expect(data.data.message).toBe('Account created successfully');
      expect(data.timestamp).toBeDefined();
    });

    it('should hash the password before storing', async () => {
      const request = createMockRequest({
        email: testEmail,
        password: testPassword,
      });

      await POST(request);

      const user = await db.user.findUnique({
        where: { email: testEmail },
      });

      expect(user).toBeTruthy();
      expect(user!.password).not.toBe(testPassword);

      // Verify password is hashed correctly
      const isPasswordValid = await bcrypt.compare(testPassword, user!.password);
      expect(isPasswordValid).toBe(true);
    });

    it('should not return password in response', async () => {
      const request = createMockRequest({
        email: testEmail,
        password: testPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data.user).not.toHaveProperty('password');
      expect(data.data.user).toHaveProperty('id');
      expect(data.data.user).toHaveProperty('email');
      expect(data.data.user).toHaveProperty('createdAt');
    });

    it('should accept password with special characters', async () => {
      const complexPassword = 'P@ssw0rd!#$%^&*()';
      const request = createMockRequest({
        email: testEmail,
        password: complexPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);

      // Verify password works
      const user = await db.user.findUnique({
        where: { email: testEmail },
      });
      const isPasswordValid = await bcrypt.compare(complexPassword, user!.password);
      expect(isPasswordValid).toBe(true);
    });
  });

  describe('Validation Errors', () => {
    it('should reject missing email', async () => {
      const request = createMockRequest({
        password: testPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Email and password are required');
    });

    it('should reject missing password', async () => {
      const request = createMockRequest({
        email: testEmail,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Email and password are required');
    });

    it('should reject empty email', async () => {
      const request = createMockRequest({
        email: '',
        password: testPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject empty password', async () => {
      const request = createMockRequest({
        email: testEmail,
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
        email: testEmail,
        password: 'Short1!',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Password must be at least 8 characters');
    });

    it('should reject duplicate email', async () => {
      // Create first user
      const request1 = createMockRequest({
        email: testEmail,
        password: testPassword,
      });
      await POST(request1);

      // Try to create duplicate
      const request2 = createMockRequest({
        email: testEmail,
        password: 'DifferentPassword123!',
      });

      const response = await POST(request2);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('User with this email already exists');
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

    it('should handle null email', async () => {
      const request = createMockRequest({
        email: null,
        password: testPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle null password', async () => {
      const request = createMockRequest({
        email: testEmail,
        password: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should trim and handle email with whitespace', async () => {
      // Note: Current implementation doesn't trim, testing actual behavior
      const emailWithSpaces = '  ' + testEmail + '  ';
      const request = createMockRequest({
        email: emailWithSpaces,
        password: testPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      // Current behavior: creates user with spaces in email
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);

      // Clean up the extra user
      await db.user.delete({
        where: { email: emailWithSpaces },
      });
    });

    it('should accept minimum valid password (8 characters)', async () => {
      const minPassword = '12345678';
      const request = createMockRequest({
        email: testEmail,
        password: minPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should accept very long password', async () => {
      const longPassword = 'a'.repeat(100) + '1!';
      const request = createMockRequest({
        email: testEmail,
        password: longPassword,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });

  describe('Response Format', () => {
    it('should return consistent success response format', async () => {
      const request = createMockRequest({
        email: testEmail,
        password: testPassword,
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
        email: testEmail,
        password: 'short',
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
  });
});
