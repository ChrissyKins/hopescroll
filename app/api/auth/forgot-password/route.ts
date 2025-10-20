import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { ValidationError } from '@/lib/errors';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate input
    if (!email) {
      throw new ValidationError('Email is required');
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    // But only create token if user exists
    if (user) {
      // Generate a secure random token
      const token = crypto.randomBytes(32).toString('hex');

      // Token expires in 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Invalidate any existing unused tokens for this user
      await db.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          used: false,
        },
        data: {
          used: true,
        },
      });

      // Create new reset token
      await db.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      // Send password reset email
      const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    return successResponse({
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error, 400);
    }

    console.error('Forgot password error:', error);
    return errorResponse(error, 500);
  }
}
