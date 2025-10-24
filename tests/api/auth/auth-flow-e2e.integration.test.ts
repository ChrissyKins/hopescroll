/**
 * End-to-End Authentication Flow Tests
 * Tests complete user authentication journeys through multiple API endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST as signupPOST } from '@/app/api/auth/signup/route';
import { POST as forgotPasswordPOST } from '@/app/api/auth/forgot-password/route';
import { POST as resetPasswordPOST } from '@/app/api/auth/reset-password/route';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

// Mock email service to capture sent emails
const capturedEmails: Array<{ email: string; resetUrl: string }> = [];
vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: vi.fn((email: string, resetUrl: string) => {
    capturedEmails.push({ email, resetUrl });
    return Promise.resolve(true);
  }),
}));

describe('End-to-End Authentication Flows', () => {
  const testEmail = 'e2e-test@example.com';
  const testPassword = 'InitialPassword123!';
  const newPassword = 'UpdatedPassword456!';

  // Helper function to create a mock NextRequest
  function createMockRequest(body: unknown): NextRequest {
    return {
      json: async () => body,
    } as NextRequest;
  }

  // Helper to extract token from reset URL
  function extractTokenFromUrl(resetUrl: string): string {
    const match = resetUrl.match(/token=([a-f0-9]{64})/);
    return match ? match[1] : '';
  }

  beforeEach(async () => {
    capturedEmails.length = 0; // Clear captured emails
    vi.clearAllMocks();

    // Clean up any existing test user
    try {
      await db.user.delete({
        where: { email: testEmail },
      });
    } catch {
      // User doesn't exist, that's fine
    }
  });

  afterEach(async () => {
    // Clean up test user
    try {
      await db.user.delete({
        where: { email: testEmail },
      });
    } catch {
      // User might not exist
    }
  });

  describe('Happy Path: Complete User Journey', () => {
    it('should complete full signup → forgot-password → reset-password flow', async () => {
      // Step 1: User signs up
      const signupRequest = createMockRequest({
        email: testEmail,
        password: testPassword,
      });

      const signupResponse = await signupPOST(signupRequest);
      const signupData = await signupResponse.json();

      expect(signupResponse.status).toBe(201);
      expect(signupData.success).toBe(true);
      expect(signupData.data.user.email).toBe(testEmail);

      // Verify user exists in database
      let user = await db.user.findUnique({
        where: { email: testEmail },
      });
      expect(user).toBeTruthy();

      // Verify password is hashed correctly
      let isPasswordValid = await bcrypt.compare(testPassword, user!.password);
      expect(isPasswordValid).toBe(true);

      // Step 2: User forgets password and requests reset
      const forgotRequest = createMockRequest({
        email: testEmail,
      });

      const forgotResponse = await forgotPasswordPOST(forgotRequest);
      const forgotData = await forgotResponse.json();

      expect(forgotResponse.status).toBe(200);
      expect(forgotData.success).toBe(true);

      // Verify email was sent
      expect(capturedEmails.length).toBe(1);
      expect(capturedEmails[0].email).toBe(testEmail);

      // Extract reset token from email
      const resetToken = extractTokenFromUrl(capturedEmails[0].resetUrl);
      expect(resetToken).toBeTruthy();
      expect(resetToken.length).toBe(64);

      // Verify token exists in database
      const tokenRecord = await db.passwordResetToken.findUnique({
        where: { token: resetToken },
      });
      expect(tokenRecord).toBeTruthy();
      expect(tokenRecord!.used).toBe(false);

      // Step 3: User resets password using token
      const resetRequest = createMockRequest({
        token: resetToken,
        password: newPassword,
      });

      const resetResponse = await resetPasswordPOST(resetRequest);
      const resetData = await resetResponse.json();

      expect(resetResponse.status).toBe(200);
      expect(resetData.success).toBe(true);

      // Verify password was updated
      user = await db.user.findUnique({
        where: { email: testEmail },
      });

      const isNewPasswordValid = await bcrypt.compare(newPassword, user!.password);
      expect(isNewPasswordValid).toBe(true);

      const isOldPasswordStillValid = await bcrypt.compare(testPassword, user!.password);
      expect(isOldPasswordStillValid).toBe(false);

      // Verify token is marked as used
      const usedTokenRecord = await db.passwordResetToken.findUnique({
        where: { token: resetToken },
      });
      expect(usedTokenRecord!.used).toBe(true);
    });

    it('should handle user changing password multiple times', async () => {
      // Create user
      const signupRequest = createMockRequest({
        email: testEmail,
        password: testPassword,
      });
      await signupPOST(signupRequest);

      // First password reset
      const forgot1 = createMockRequest({ email: testEmail });
      await forgotPasswordPOST(forgot1);

      const token1 = extractTokenFromUrl(capturedEmails[0].resetUrl);
      const reset1 = createMockRequest({
        token: token1,
        password: 'Password1!',
      });
      await resetPasswordPOST(reset1);

      // Verify first reset worked
      let user = await db.user.findUnique({ where: { email: testEmail } });
      let isValid = await bcrypt.compare('Password1!', user!.password);
      expect(isValid).toBe(true);

      // Second password reset
      capturedEmails.length = 0;
      const forgot2 = createMockRequest({ email: testEmail });
      await forgotPasswordPOST(forgot2);

      const token2 = extractTokenFromUrl(capturedEmails[0].resetUrl);
      const reset2 = createMockRequest({
        token: token2,
        password: 'Password2!',
      });
      await resetPasswordPOST(reset2);

      // Verify second reset worked
      user = await db.user.findUnique({ where: { email: testEmail } });
      isValid = await bcrypt.compare('Password2!', user!.password);
      expect(isValid).toBe(true);

      // Verify previous password doesn't work
      isValid = await bcrypt.compare('Password1!', user!.password);
      expect(isValid).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should prevent reset with expired token', async () => {
      // Create user
      const signupRequest = createMockRequest({
        email: testEmail,
        password: testPassword,
      });
      await signupPOST(signupRequest);

      // Request password reset
      const forgotRequest = createMockRequest({ email: testEmail });
      await forgotPasswordPOST(forgotRequest);

      const resetToken = extractTokenFromUrl(capturedEmails[0].resetUrl);

      // Manually expire the token
      await db.passwordResetToken.update({
        where: { token: resetToken },
        data: { expiresAt: new Date(Date.now() - 1000) }, // Expired 1 second ago
      });

      // Try to reset password with expired token
      const resetRequest = createMockRequest({
        token: resetToken,
        password: newPassword,
      });

      const resetResponse = await resetPasswordPOST(resetRequest);
      const resetData = await resetResponse.json();

      expect(resetResponse.status).toBe(400);
      expect(resetData.success).toBe(false);
      expect(resetData.error.message).toContain('expired');

      // Verify password was NOT changed
      const user = await db.user.findUnique({
        where: { email: testEmail },
      });
      const isOldPasswordStillValid = await bcrypt.compare(testPassword, user!.password);
      expect(isOldPasswordStillValid).toBe(true);
    });

    it('should prevent token reuse', async () => {
      // Create user
      const signupRequest = createMockRequest({
        email: testEmail,
        password: testPassword,
      });
      await signupPOST(signupRequest);

      // Request password reset
      const forgotRequest = createMockRequest({ email: testEmail });
      await forgotPasswordPOST(forgotRequest);

      const resetToken = extractTokenFromUrl(capturedEmails[0].resetUrl);

      // First reset - should succeed
      const reset1 = createMockRequest({
        token: resetToken,
        password: newPassword,
      });
      const response1 = await resetPasswordPOST(reset1);
      expect(response1.status).toBe(200);

      // Second reset with same token - should fail
      const reset2 = createMockRequest({
        token: resetToken,
        password: 'AnotherPassword789!',
      });
      const response2 = await resetPasswordPOST(reset2);
      const data2 = await response2.json();

      expect(response2.status).toBe(400);
      expect(data2.success).toBe(false);
      expect(data2.error.message).toContain('already been used');

      // Verify password is still the new password (not changed again)
      const user = await db.user.findUnique({
        where: { email: testEmail },
      });
      const isNewPasswordValid = await bcrypt.compare(newPassword, user!.password);
      expect(isNewPasswordValid).toBe(true);
    });

    it('should invalidate old tokens when requesting new one', async () => {
      // Create user
      const signupRequest = createMockRequest({
        email: testEmail,
        password: testPassword,
      });
      await signupPOST(signupRequest);

      // Request first reset token
      const forgot1 = createMockRequest({ email: testEmail });
      await forgotPasswordPOST(forgot1);
      const token1 = extractTokenFromUrl(capturedEmails[0].resetUrl);

      // Request second reset token
      capturedEmails.length = 0;
      const forgot2 = createMockRequest({ email: testEmail });
      await forgotPasswordPOST(forgot2);
      const token2 = extractTokenFromUrl(capturedEmails[0].resetUrl);

      // Try to use first token - should fail
      const reset1 = createMockRequest({
        token: token1,
        password: newPassword,
      });
      const response1 = await resetPasswordPOST(reset1);
      const data1 = await response1.json();

      expect(response1.status).toBe(400);
      expect(data1.success).toBe(false);
      expect(data1.error.message).toContain('already been used');

      // Use second token - should succeed
      const reset2 = createMockRequest({
        token: token2,
        password: newPassword,
      });
      const response2 = await resetPasswordPOST(reset2);
      expect(response2.status).toBe(200);
    });

    it('should prevent duplicate email registration', async () => {
      // First signup
      const signup1 = createMockRequest({
        email: testEmail,
        password: testPassword,
      });
      const response1 = await signupPOST(signup1);
      expect(response1.status).toBe(201);

      // Second signup with same email - should fail
      const signup2 = createMockRequest({
        email: testEmail,
        password: 'DifferentPassword123!',
      });
      const response2 = await signupPOST(signup2);
      const data2 = await response2.json();

      expect(response2.status).toBe(400);
      expect(data2.success).toBe(false);
      expect(data2.error.message).toContain('already exists');

      // Verify only one user exists
      const users = await db.user.findMany({
        where: { email: testEmail },
      });
      expect(users.length).toBe(1);
    });
  });

  describe('Security Tests', () => {
    it('should not reveal if email exists during forgot-password', async () => {
      // Create user
      const signupRequest = createMockRequest({
        email: testEmail,
        password: testPassword,
      });
      await signupPOST(signupRequest);

      // Request reset for existing email
      const forgot1 = createMockRequest({ email: testEmail });
      const response1 = await forgotPasswordPOST(forgot1);
      const data1 = await response1.json();

      // Request reset for non-existing email
      const forgot2 = createMockRequest({ email: 'nonexistent@example.com' });
      const response2 = await forgotPasswordPOST(forgot2);
      const data2 = await response2.json();

      // Both should return same message
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(data1.data.message).toBe(data2.data.message);
    });

    it('should ensure passwords are never returned in responses', async () => {
      // Signup
      const signupRequest = createMockRequest({
        email: testEmail,
        password: testPassword,
      });
      const signupResponse = await signupPOST(signupRequest);
      const signupData = await signupResponse.json();

      expect(signupData.data.user).not.toHaveProperty('password');

      // Forgot password
      const forgotRequest = createMockRequest({ email: testEmail });
      const forgotResponse = await forgotPasswordPOST(forgotRequest);
      const forgotData = await forgotResponse.json();

      const forgotDataStr = JSON.stringify(forgotData);
      expect(forgotDataStr).not.toContain(testPassword);

      // Reset password
      const token = extractTokenFromUrl(capturedEmails[0].resetUrl);
      const resetRequest = createMockRequest({
        token,
        password: newPassword,
      });
      const resetResponse = await resetPasswordPOST(resetRequest);
      const resetData = await resetResponse.json();

      const resetDataStr = JSON.stringify(resetData);
      expect(resetDataStr).not.toContain(newPassword);
      expect(resetDataStr).not.toContain(testPassword);
    });

    it('should hash passwords with bcrypt', async () => {
      // Create user
      const signupRequest = createMockRequest({
        email: testEmail,
        password: testPassword,
      });
      await signupPOST(signupRequest);

      // Check password is hashed
      const user = await db.user.findUnique({
        where: { email: testEmail },
      });

      expect(user!.password).not.toBe(testPassword);
      expect(user!.password).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt hash pattern
      expect(user!.password.length).toBeGreaterThan(50); // bcrypt hashes are ~60 chars
    });
  });

  describe('Data Integrity', () => {
    it('should maintain user preferences when password changes', async () => {
      // Create user
      const signupRequest = createMockRequest({
        email: testEmail,
        password: testPassword,
      });
      const signupResponse = await signupPOST(signupRequest);
      const signupData = await signupResponse.json();
      const userId = signupData.data.user.id;

      // Reset password
      const forgotRequest = createMockRequest({ email: testEmail });
      await forgotPasswordPOST(forgotRequest);

      const token = extractTokenFromUrl(capturedEmails[0].resetUrl);
      const resetRequest = createMockRequest({
        token,
        password: newPassword,
      });
      await resetPasswordPOST(resetRequest);

      // Verify user ID didn't change
      const user = await db.user.findUnique({
        where: { email: testEmail },
      });
      expect(user!.id).toBe(userId);
    });

    it('should clean up tokens when user is deleted', async () => {
      // Create user
      const signupRequest = createMockRequest({
        email: testEmail,
        password: testPassword,
      });
      await signupPOST(signupRequest);

      // Create reset token
      const forgotRequest = createMockRequest({ email: testEmail });
      await forgotPasswordPOST(forgotRequest);

      const token = extractTokenFromUrl(capturedEmails[0].resetUrl);

      // Verify token exists
      let tokenRecord = await db.passwordResetToken.findUnique({
        where: { token },
      });
      expect(tokenRecord).toBeTruthy();

      // Delete user
      await db.user.delete({
        where: { email: testEmail },
      });

      // Verify token was cascade deleted
      tokenRecord = await db.passwordResetToken.findUnique({
        where: { token },
      });
      expect(tokenRecord).toBeNull();
    });
  });
});
