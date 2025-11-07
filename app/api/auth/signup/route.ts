import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { successResponse, errorResponse } from '@/lib/api-response';
import { ValidationError } from '@/lib/errors';
import { ENV } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check if signups are allowed
    if (!ENV.allowSignups) {
      return errorResponse(
        new ValidationError('New user signups are currently disabled'),
        403
      );
    }

    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ValidationError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return successResponse(
      { user, message: 'Account created successfully' },
      201
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error, 400);
    }

    console.error('Signup error:', error);

    // Ensure we always return a proper JSON error response
    return errorResponse(
      error instanceof Error ? error : new Error('An unexpected error occurred during signup'),
      500
    );
  }
}
