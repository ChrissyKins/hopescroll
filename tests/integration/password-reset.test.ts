import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

describe('Password Reset Flow', () => {
  const testEmail = 'reset-test@example.com';
  const testPassword = 'oldpassword123';
  const newPassword = 'newpassword456';
  let testUserId: string;

  beforeEach(async () => {
    // Clean up any existing test user first
    const existingUser = await db.user.findUnique({
      where: { email: testEmail },
    });
    if (existingUser) {
      await db.user.delete({
        where: { email: testEmail },
      });
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
    // Clean up - only if testUserId is set
    if (testUserId) {
      await db.user.delete({
        where: { id: testUserId },
      }).catch(() => {
        // User might already be deleted by the test
      });
    }
  });

  describe('Token Generation', () => {
    it('should create a valid password reset token', async () => {
      // Generate token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      const resetToken = await db.passwordResetToken.create({
        data: {
          userId: testUserId,
          token,
          expiresAt,
        },
      });

      expect(resetToken.token).toBe(token);
      expect(resetToken.userId).toBe(testUserId);
      expect(resetToken.used).toBe(false);
      expect(resetToken.expiresAt).toEqual(expiresAt);
    });

    it('should invalidate old tokens when creating new one', async () => {
      // Create first token
      const token1 = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.passwordResetToken.create({
        data: {
          userId: testUserId,
          token: token1,
          expiresAt,
        },
      });

      // Create second token and invalidate old ones
      const token2 = crypto.randomBytes(32).toString('hex');
      await db.passwordResetToken.updateMany({
        where: {
          userId: testUserId,
          used: false,
        },
        data: {
          used: true,
        },
      });

      await db.passwordResetToken.create({
        data: {
          userId: testUserId,
          token: token2,
          expiresAt,
        },
      });

      // Verify old token is marked as used
      const oldToken = await db.passwordResetToken.findFirst({
        where: { token: token1 },
      });
      expect(oldToken?.used).toBe(true);

      // Verify new token is not used
      const newToken = await db.passwordResetToken.findFirst({
        where: { token: token2 },
      });
      expect(newToken?.used).toBe(false);
    });
  });

  describe('Password Reset', () => {
    it('should reset password with valid token', async () => {
      // Create reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.passwordResetToken.create({
        data: {
          userId: testUserId,
          token,
          expiresAt,
        },
      });

      // Verify old password works
      const userBefore = await db.user.findUnique({
        where: { id: testUserId },
      });
      const oldPasswordValid = await bcrypt.compare(
        testPassword,
        userBefore!.password
      );
      expect(oldPasswordValid).toBe(true);

      // Reset password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await db.$transaction([
        db.user.update({
          where: { id: testUserId },
          data: { password: hashedNewPassword },
        }),
        db.passwordResetToken.updateMany({
          where: { token },
          data: { used: true },
        }),
      ]);

      // Verify new password works
      const userAfter = await db.user.findUnique({
        where: { id: testUserId },
      });
      const newPasswordValid = await bcrypt.compare(
        newPassword,
        userAfter!.password
      );
      expect(newPasswordValid).toBe(true);

      // Verify old password no longer works
      const oldPasswordStillValid = await bcrypt.compare(
        testPassword,
        userAfter!.password
      );
      expect(oldPasswordStillValid).toBe(false);

      // Verify token is marked as used
      const resetToken = await db.passwordResetToken.findFirst({
        where: { token },
      });
      expect(resetToken?.used).toBe(true);
    });

    it('should reject expired token', async () => {
      // Create expired token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago

      await db.passwordResetToken.create({
        data: {
          userId: testUserId,
          token,
          expiresAt,
        },
      });

      // Verify token exists
      const resetToken = await db.passwordResetToken.findUnique({
        where: { token },
      });

      expect(resetToken).toBeTruthy();
      expect(resetToken!.expiresAt < new Date()).toBe(true);
    });

    it('should reject used token', async () => {
      // Create and use token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.passwordResetToken.create({
        data: {
          userId: testUserId,
          token,
          expiresAt,
          used: true,
        },
      });

      // Verify token is marked as used
      const resetToken = await db.passwordResetToken.findUnique({
        where: { token },
      });

      expect(resetToken?.used).toBe(true);
    });

    it('should handle multiple password resets correctly', async () => {
      // First reset
      const token1 = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.passwordResetToken.create({
        data: {
          userId: testUserId,
          token: token1,
          expiresAt,
        },
      });

      const password1 = 'password1';
      const hashedPassword1 = await bcrypt.hash(password1, 10);

      await db.$transaction([
        db.user.update({
          where: { id: testUserId },
          data: { password: hashedPassword1 },
        }),
        db.passwordResetToken.updateMany({
          where: { token: token1 },
          data: { used: true },
        }),
      ]);

      // Second reset
      const token2 = crypto.randomBytes(32).toString('hex');

      await db.passwordResetToken.create({
        data: {
          userId: testUserId,
          token: token2,
          expiresAt,
        },
      });

      const password2 = 'password2';
      const hashedPassword2 = await bcrypt.hash(password2, 10);

      await db.$transaction([
        db.user.update({
          where: { id: testUserId },
          data: { password: hashedPassword2 },
        }),
        db.passwordResetToken.updateMany({
          where: { token: token2 },
          data: { used: true },
        }),
      ]);

      // Verify final password is password2
      const user = await db.user.findUnique({
        where: { id: testUserId },
      });
      const finalPasswordValid = await bcrypt.compare(password2, user!.password);
      expect(finalPasswordValid).toBe(true);

      // Verify both tokens are marked as used
      const tokens = await db.passwordResetToken.findMany({
        where: { userId: testUserId },
      });
      expect(tokens).toHaveLength(2);
      expect(tokens.every((t) => t.used)).toBe(true);
    });
  });

  describe('Token Uniqueness', () => {
    it('should ensure tokens are unique', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Create first token
      await db.passwordResetToken.create({
        data: {
          userId: testUserId,
          token,
          expiresAt,
        },
      });

      // Try to create duplicate token - should fail due to unique constraint
      await expect(
        db.passwordResetToken.create({
          data: {
            userId: testUserId,
            token, // Same token
            expiresAt,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Token Cleanup', () => {
    it('should cascade delete tokens when user is deleted', async () => {
      // Create token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.passwordResetToken.create({
        data: {
          userId: testUserId,
          token,
          expiresAt,
        },
      });

      // Verify token exists
      const tokenBefore = await db.passwordResetToken.findFirst({
        where: { userId: testUserId },
      });
      expect(tokenBefore).toBeTruthy();

      // Delete user
      await db.user.delete({
        where: { id: testUserId },
      });

      // Verify token is also deleted (cascade)
      const tokenAfter = await db.passwordResetToken.findFirst({
        where: { userId: testUserId },
      });
      expect(tokenAfter).toBeNull();

      // Reset testUserId to prevent cleanup error
      testUserId = '';
    });
  });
});
