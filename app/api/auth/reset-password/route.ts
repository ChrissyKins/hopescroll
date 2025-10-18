import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { successResponse, errorResponse } from '@/lib/api-response';
import { ValidationError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // Validate input
    if (!token || !password) {
      throw new ValidationError('Token and password are required');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Find valid token
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new ValidationError('Invalid or expired reset token');
    }

    if (resetToken.used) {
      throw new ValidationError('This reset token has already been used');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new ValidationError('This reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and mark token as used
    await db.$transaction([
      db.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      db.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return successResponse({
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error, 400);
    }

    console.error('Reset password error:', error);
    return errorResponse(error, 500);
  }
}
